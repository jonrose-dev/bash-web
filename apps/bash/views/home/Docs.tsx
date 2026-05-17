const BUILTINS = [
  {
    cmd: "web dom.write '#selector' \"text\"",
    desc: "set element textContent",
  },
  {
    cmd: "web dom.appendHTML '#selector' \"html\"",
    desc: "append innerHTML to element",
  },
  {
    cmd: "web document.title \"title\"",
    desc: "set document.title",
  },
] as const;

export const Docs = () => (
  <section className="text-xs space-y-3 border-b border-ctp-surface1 pb-4 mb-1">
    <p>
      <span className="text-ctp-overlay0"># stdout</span>
      <span className="text-ctp-surface2"> → </span>
      <span className="text-ctp-overlay1">browser console</span>
      <span className="text-ctp-surface2"> · </span>
      <span className="text-ctp-overlay0">open DevTools to see output</span>
    </p>
    <div className="space-y-1">
      <p className="text-ctp-overlay0"># web builtins</p>
      <dl className="space-y-1 pl-2">
        {BUILTINS.map(({ cmd, desc }) => (
          <div key={cmd} className="flex gap-3">
            <dt className="text-ctp-subtext0 shrink-0">{cmd}</dt>
            <dd className="text-ctp-surface2">{desc}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);
