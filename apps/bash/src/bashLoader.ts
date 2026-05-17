import "@bash-web/bash-core";

const SUCCESS = 0;
const ERROR = 1;

const webBuiltin = (argv: string[]): number => {
  const [cmd, ...args] = argv;
  switch (cmd) {
    case "dom.write": {
      const [selector, text] = args;
      const el = document.querySelector(selector);
      if (!el) return ERROR;
      el.textContent = text;
      return SUCCESS;
    }
    case "dom.appendHTML": {
      const [selector, html] = args;
      const el = document.querySelector(selector);
      if (!el) return ERROR;
      el.innerHTML += html;
      return SUCCESS;
    }
    case "document.title": {
      document.title = args[0];
      return SUCCESS;
    }
    default:
      console.error("unknown command");
      return ERROR;
  }
};

const runBashScript = async (src: string): Promise<void> => {
  const opts = {
    noInitialRun: true,
    print: console.log,
    printErr: (txt: string) => {
      if (txt.includes("unsupported syscall")) return;
      if (txt.includes("program exited") && txt.includes("keepRuntimeAlive"))
        return;
      if (txt.startsWith("warning:")) {
        console.warn(txt);
      } else {
        console.error(txt);
      }
    },
  };

  const mod = await createBashModule(opts);

  mod.FS.writeFile("/script", `${src}\n`);

  mod.callMain(["/script"]);
};

document
  .querySelectorAll('script[type="text/bash"]')
  .forEach(async (script) => {
    if (!(script instanceof HTMLScriptElement)) return;
    if (!script.src) {
      runBashScript(script.textContent ?? "");
      return;
    }
    const src = script.getAttribute("src");
    if (!src) return;
    await fetch(src)
      .then((res) => res.text())
      .then(runBashScript);
  });

window.__bash_web_internal = webBuiltin;
window.runBashScript = runBashScript;
