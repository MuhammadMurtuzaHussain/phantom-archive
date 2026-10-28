import type { View } from "../api";

export function TheoryPanel({ view, busy, onAnswer, onEnd, onOpen }: {
  view: View; busy: boolean; onAnswer: (q: string, a: string) => void; onEnd: (id: string) => void; onOpen: (id: string) => void;
}) {
  const pinned = view.evidence.filter((e) => e.pinned);
  const proven = view.endings.find((e) => e.id === "carry")?.open;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <section>
        <h3 className="mb-2 text-[11px] tracking-[0.2em] text-phosphor-dim">THE BOARD · {pinned.length} PINNED</h3>
        {pinned.length ? (
          <div className="flex flex-wrap gap-1.5">
            {pinned.map((e) => (
              <button key={e.id} onClick={() => onOpen(e.id)} className={`layer-${e.layer} border border-[var(--layer)]/50 px-2 py-1 text-left text-[12px] hover:bg-line/40`}>
                <span className="text-amber">{e.id}</span> <span className="opacity-80">{e.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-phosphor-dim">Nothing pinned yet. A theory is only as good as the evidence pinned under it.</p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] tracking-[0.2em] text-phosphor-dim">YOUR THEORY</h3>
        {view.questions.map((q) => (
          <fieldset key={q.id} className="border border-line p-2.5">
            <legend className="px-1 text-amber">{q.prompt}</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {Object.entries(q.answers).map(([id, label]) => (
                <label key={id} className={`flex cursor-pointer items-center gap-2 px-1.5 py-1 text-[12.5px] ${view.theory[q.id] === id ? "bg-line/70" : "hover:bg-line/30"}`}>
                  <input type="radio" name={q.id} checked={view.theory[q.id] === id} onChange={() => onAnswer(q.id, id)} disabled={!!view.ending} className="accent-[#ffb547]" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <p className={`text-[12px] ${proven ? "text-marigold glow" : "text-phosphor-dim"}`}>
          {proven ? "The archive accepts your theory. Every answer has its proof pinned." : "The archive is not convinced. Right answers need their proof pinned to the board."}
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-[11px] tracking-[0.2em] text-phosphor-dim">WHAT BECOMES OF THE ARCHIVE</h3>
        <div className="grid grid-cols-2 gap-2">
          {view.endings.map((e) => (
            <button key={e.id} disabled={busy || !e.open || !!view.ending} onClick={() => onEnd(e.id)}
              className={`border px-2 py-2 tracking-widest ${e.id === "carry" ? "border-marigold/70 text-marigold" : "border-line text-amber"} hover:bg-line/40`}>
              {e.title.toUpperCase()}
              {!e.open && <span className="block text-[10px] tracking-normal text-phosphor-dim">needs a proven theory</span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
