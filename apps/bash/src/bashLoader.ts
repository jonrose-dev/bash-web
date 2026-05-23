import { webBuiltin } from "@bash-web/bash-web-builtin";

const runBashScript = async (src: string) => {
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

  await mod.callMain(["/script"]);
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
