"use client";

import { useRef } from "react";

export const TryMe = () => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref.current?.value) return;
    void globalThis.window.runBashScript(ref.current.value);
  };

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="flex items-start gap-2">
        <span
          className="pt-2 select-none text-sm leading-none"
          style={{ color: "var(--green)" }}
        >
          $
        </span>
        <textarea
          ref={ref}
          rows={4}
          placeholder={`for i in {1..5}; do
  echo "line $i"
done`}
          spellCheck={false}
          className="flex-1 resize-none rounded border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm outline-none placeholder-ctp-overlay0 focus:border-ctp-overlay1 transition-colors"
          style={{ color: "#a6e3a1" }}
        />
      </div>
      <button
        type="submit"
        className="text-xs text-ctp-overlay1 hover:text-ctp-text transition-colors cursor-pointer select-none"
      >
        ▶ run
      </button>
    </form>
  );
};
