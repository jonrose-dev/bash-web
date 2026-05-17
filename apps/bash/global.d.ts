declare global {
  function createBashModule(opts: {
    noInitialRun?: boolean;
    print?: (txt: string) => void;
    printErr?: (txt: string) => void;
  }): Promise<{
    FS: { writeFile: (path: string, data: string) => void };
    callMain: (args: string[]) => number;
  }>;

  interface Window {
    runBashScript: (src: string) => Promise<void>;
  }

  var __bash_web_internal: (argv: string[]) => number;
  var runBashScript: (src: string) => Promise<void>;
}

export {};
