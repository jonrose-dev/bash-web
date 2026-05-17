import { Docs } from "./Docs";
import { TryMe } from "./TryMe";

export const Home = () => {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 bg-ctp-crust">
      <main className="w-full max-w-2xl">
        <article className="rounded-lg overflow-hidden border border-ctp-surface1 shadow-2xl shadow-black/60">
          <header className="relative flex items-center px-4 py-3 bg-ctp-mantle border-b border-ctp-surface1">
            <div className="flex gap-1.5" aria-hidden>
              <div className="w-3 h-3 rounded-full bg-ctp-red" />
              <div className="w-3 h-3 rounded-full bg-ctp-yellow" />
              <div className="w-3 h-3 rounded-full bg-ctp-green" />
            </div>
            <span className="absolute inset-0 flex items-center justify-center text-xs text-ctp-overlay1 select-none pointer-events-none">
              bash — jonrose.dev
            </span>
          </header>
          <section className="p-5 space-y-4 bg-ctp-base min-h-48 text-sm">
            <Docs />
            <TryMe />
          </section>
        </article>

        <section className="mt-5 space-y-2 text-xs">
          <p className="text-ctp-overlay0 mb-1"># script output</p>
          <dl className="space-y-2">
            <div
              className="flex items-baseline gap-3 border-l pl-3 py-0.5"
              style={{ borderColor: "var(--green-dim)" }}
            >
              <dt className="text-ctp-overlay1 shrink-0 select-none">&lt;script&gt;</dt>
              <output id="hello" className="text-ctp-subtext0" />
            </div>
            <div
              className="flex items-baseline gap-3 border-l pl-3 py-0.5"
              style={{ borderColor: "var(--green-dim)" }}
            >
              <dt className="text-ctp-overlay1 shrink-0 select-none">jonrose.sh</dt>
              <output id="world" className="text-ctp-subtext0" />
            </div>
          </dl>
        </section>

        <p className="mt-5 text-center text-xs text-ctp-overlay0 select-none">
          bash 5.3 · WebAssembly
        </p>
        <p className="mt-1 text-center text-xs">
          <a
            href="https://github.com/jonrose-dev/bash-web"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ctp-overlay1 hover:text-ctp-blue transition-colors"
          >
            github.com/jonrose-dev/bash-web
          </a>
        </p>
      </main>
    </div>
  );
};
