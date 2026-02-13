-- RFX addFX ReaScript
-- This script listens for OSC messages at /rfx/cmd/addFX
-- When triggered, it reads parameters from rfx_cmd.txt and adds an FX to a track

-- Configuration
local ELECTRON_HOST = "127.0.0.1"
local ELECTRON_PORT = 8001  -- Port where Electron is listening
local REAPER_PORT = 8000    -- Port where Reaper is listening for OSC

-- Get Reaper resource path
local resource_path = reaper.GetResourcePath()
local cmd_file_path = resource_path .. "/rfx_cmd.txt"
local state_file_path = resource_path .. "/reaper_state.json"

-- Function to read command parameters from rfx_cmd.txt
function ReadCommandParams()
  local file = io.open(cmd_file_path, "r")
  if not file then
    return nil, "Could not open command file"
  end
  
  local content = file:read("*all")
  file:close()
  
  -- Parse JSON (simple approach - in production use a proper JSON library)
  -- Expected format: {"trackName":"FX_2A","fxId":"Amped Roots","fxIndex":0}
  local params = {}
  for key, value in string.gmatch(content, '"([^"]+)":"?([^",}]+)"?') do
    -- Try to convert numbers
    local num = tonumber(value)
    if num then
      params[key] = num
    else
      -- Remove quotes if present
      params[key] = value:gsub('^"', ''):gsub('"$', '')
    end
  end
  
  return params, nil
end

-- Function to find track by name
function FindTrackByName(track_name)
  local track_count = reaper.CountTracks(0)
  for i = 0, track_count - 1 do
    local track = reaper.GetTrack(0, i)
    local _, name = reaper.GetSetMediaTrackInfo_String(track, "P_NAME", "", false)
    if name == track_name then
      return track
    end
  end
  return nil
end

-- Function to add FX to track
function AddFXToTrack(track, fx_name, fx_index)
  if not track then
    return false, "Track not found"
  end
  
  -- Add the FX at the specified index
  local fx_added_index = reaper.TrackFX_AddByName(track, fx_name, false, -1)
  
  if fx_added_index == -1 then
    return false, "FX not found in catalogue"
  end
  
  -- Move to desired index if needed
  if fx_index ~= fx_added_index then
    reaper.TrackFX_CopyToTrack(track, fx_added_index, track, fx_index, true)
  end
  
  return true, nil
end

-- Function to write state to reaper_state.json
function WriteStateToFile()
  local state = {
    tracks = {},
    timestamp = os.time() * 1000  -- milliseconds
  }
  
  local track_count = reaper.CountTracks(0)
  for i = 0, track_count - 1 do
    local track = reaper.GetTrack(0, i)
    local _, track_name = reaper.GetSetMediaTrackInfo_String(track, "P_NAME", "", false)
    
    local fx_chain = {}
    local fx_count = reaper.TrackFX_GetCount(track)
    for j = 0, fx_count - 1 do
      local _, fx_name = reaper.TrackFX_GetFXName(track, j, "")
      local enabled = reaper.TrackFX_GetEnabled(track, j)
      
      table.insert(fx_chain, {
        id = fx_name,
        name = fx_name,
        fxIndex = j,
        enabled = enabled,
        params = {}
      })
    end
    
    table.insert(state.tracks, {
      name = track_name,
      index = i,
      fxChain = fx_chain
    })
  end
  
  -- Write JSON (simple approach)
  local file = io.open(state_file_path, "w")
  if file then
    file:write('{"tracks":[')
    for i, track in ipairs(state.tracks) do
      if i > 1 then file:write(',') end
      file:write('{"name":"' .. track.name .. '","index":' .. track.index .. ',"fxChain":[')
      for j, fx in ipairs(track.fxChain) do
        if j > 1 then file:write(',') end
        file:write('{"id":"' .. fx.id .. '","name":"' .. fx.name .. '","fxIndex":' .. fx.fxIndex .. ',"enabled":' .. tostring(fx.enabled) .. ',"params":{}}')
      end
      file:write(']}')
    end
    file:write('],"timestamp":' .. state.timestamp .. '}')
    file:close()
  end
end

-- Function to send OSC acknowledgement
function SendAcknowledgement(command_id, status, code)
  -- status: 0 = success, 1 = failure
  -- code: "OK" or error message
  local osc_address = "/rfx/ack/addFX"
  
  -- Send OSC message to Electron
  -- Format: /rfx/ack/addFX <command_id> <status> <code>
  -- Note: In real implementation, use proper OSC library
  -- For now, this is pseudocode showing the structure
  reaper.ShowConsoleMsg("OSC -> " .. osc_address .. " " .. command_id .. " " .. status .. " " .. code .. "\n")
end

-- Main execution function
function ExecuteAddFX(command_id)
  reaper.ShowConsoleMsg("\n[ReaScript] addFX command received, id=" .. command_id .. "\n")
  
  -- Step 1: Read parameters
  local params, err = ReadCommandParams()
  if err then
    reaper.ShowConsoleMsg("[ReaScript] Error reading params: " .. err .. "\n")
    SendAcknowledgement(command_id, 1, "Failed to read parameters")
    return
  end
  
  reaper.ShowConsoleMsg("[ReaScript] Params: trackName=" .. (params.trackName or "?") .. 
                        " fxId=" .. (params.fxId or "?") .. 
                        " fxIndex=" .. (params.fxIndex or "?") .. "\n")
  
  -- Step 2: Find track
  local track = FindTrackByName(params.trackName)
  if not track then
    reaper.ShowConsoleMsg("[ReaScript] Track not found: " .. params.trackName .. "\n")
    SendAcknowledgement(command_id, 1, "Track not found")
    return
  end
  
  -- Step 3: Add FX
  reaper.Undo_BeginBlock()
  local success, error_msg = AddFXToTrack(track, params.fxId, params.fxIndex or 0)
  reaper.Undo_EndBlock("RFX: Add FX " .. params.fxId, -1)
  
  if not success then
    reaper.ShowConsoleMsg("[ReaScript] Error adding FX: " .. error_msg .. "\n")
    SendAcknowledgement(command_id, 1, error_msg)
    return
  end
  
  reaper.ShowConsoleMsg("[ReaScript] FX added successfully\n")
  
  -- Step 4: Write state
  WriteStateToFile()
  reaper.ShowConsoleMsg("[ReaScript] State written to file\n")
  
  -- Step 5: Send acknowledgement
  SendAcknowledgement(command_id, 0, "OK")
  reaper.ShowConsoleMsg("[ReaScript] Acknowledgement sent\n")
end

-- Example: This would be triggered by OSC message "/rfx/cmd/addFX"
-- In a real implementation, you would set up OSC listening here
-- For demonstration purposes:

-- When triggered via OSC with command ID as argument:
local command_id = "example_id_123"
ExecuteAddFX(command_id)

reaper.ShowConsoleMsg("\n[ReaScript] addFX script ready. Waiting for OSC trigger...\n")
reaper.ShowConsoleMsg("[ReaScript] NOTE: This is a template. You need to:\n")
reaper.ShowConsoleMsg("  1. Set up OSC listening (use reaper-osc or similar extension)\n")
reaper.ShowConsoleMsg("  2. Configure OSC to trigger this script on /rfx/cmd/addFX\n")
reaper.ShowConsoleMsg("  3. Pass the command ID from the OSC message\n")
reaper.ShowConsoleMsg("  4. Use a proper JSON library for parsing\n")
reaper.ShowConsoleMsg("  5. Use a proper OSC library for sending acknowledgements\n")
 