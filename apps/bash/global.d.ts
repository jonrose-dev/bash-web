declare global {
  interface Window {
    runBashScript: (src: string) => Promise<void>;
  }
}

export {};

