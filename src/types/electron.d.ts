export {};

declare global {
  interface Window {
    rfx: {
      ping: () => Promise<{ ok: boolean; ts: number }>;
    };
  }
}
