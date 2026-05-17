const SUCCESS = 0;
const ERROR = 1;

/**
 * Handles web-specific built-in commands callable from bash scripts via the
 * `web` command. Provides DOM manipulation and document control.
 *
 * @param {string[]} argv - Command and arguments. First element is the command
 *   name, remaining elements are its arguments.
 * @returns {number} Exit code. 0 on success, 1 on failure.
 *
 * @example
 * // Called from bash via: web dom.write '#output' "Hello"
 * webBuiltin(['dom.write', '#output', 'Hello']);
 */
const webBuiltin = (argv) => {
  const [cmd, ...args] = argv;
  switch (cmd) {
    case "dom.write": {
      // usage: web dom.write '#selector' "text"
      const [selector, text] = args;
      const el = document.querySelector(selector);
      if (!el) return ERROR;

      el.textContent = text;
      return SUCCESS;
    }
    case "dom.appendHTML": {
      // usage: web dom.appendHTML '#selector' "html"
      const [selector, html] = args;
      const el = document.querySelector(selector);
      if (!el) return ERROR;

      el.innerHTML += html;
      return SUCCESS;
    }
    case "document.title": {
      // usage: web document.title "my new title"
      const text = args[0];
      document.title = text;
      return SUCCESS;
    }
    default: {
      console.error("unknown command");
      return ERROR;
    }
  }
};

/**
 * Runs a bash script string inside the Emscripten-compiled bash WebAssembly
 * module. Writes the script to the virtual filesystem and executes it via
 * callMain.
 *
 * @param {string} src - The bash script source code to execute.
 * @returns {Promise<void>}
 *
 * @example
 * await runBashScript('echo "hello from bash"');
 */
const runBashScript = async (src) => {
  const opts = {
    /** @type {boolean} */
    noInitialRun: true,
    /** @param {string} txt */
    print: console.log,
    /** @param {string} txt */
    printErr: (txt) => {
      const isUnsupportedSysCall = txt.includes("unsupported syscall");
      const isRuntimeNoise =
        txt.includes("program exited") && txt.includes("keepRuntimeAlive");
      // Ignore useless errors
      if (isUnsupportedSysCall || isRuntimeNoise) return;

      if (txt.startsWith("warning:")) {
        console.warn(txt);
      } else {
        console.error(txt);
      }
    },
  };

  /**
   * @typedef {Object} BashModule
   * @property {{ writeFile: function(string, string): void }} FS - Emscripten virtual filesystem
   * @property {function(string[]): number} callMain - Run bash with the given argv
   *
   */

  /** @type {BashModule} */
  const mod = await createBashModule(opts);

  const text = src + "\n";
  mod.FS.writeFile("/script", text);
  mod.callMain(["/script"]);
};

/**
 * Finds all `<script type="text/bash">` elements on the page and runs their
 * content (or fetches and runs their `src`) through {@link runBashScript}.
 * Inline scripts run immediately; external scripts are fetched first.
 *
 * @example
 * // Inline:
 * // <script type="text/bash">web dom.write '#out' "hi"</script>
 *
 * // External:
 * // <script type="text/bash" src="/scripts/hello.sh"></script>
 */
document
  .querySelectorAll('script[type="text/bash"]')
  .forEach(async (script) => {
    if (!script.src) return runBashScript(script.textContent);
    const src = script.getAttribute("src");
    await fetch(src)
      .then((res) => res.text())
      .then(runBashScript);
  });

globalThis.__bash_web_internal = webBuiltin;
globalThis.runBashScript = runBashScript;
