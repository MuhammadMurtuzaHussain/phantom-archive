import type { View } from "../api";
import { STEPS, current, type Step } from "../guide";

// The guided case, as a typed slip from the Records Office taped to the
// monitor. Each step ticks itself off from the real state of the case; the
// current one can be done from here. Paper colours belong to the room, not the screen.

export function Brief({ view, busy, onStep, onExit }: {
  view: View | null; busy: boolean; onStep: (s: Step) => void; onExit: () => void;
}) {
  const now = current(view);
  const doneCount = view ? STEPS.filter((s) => s.done(view)).length : 0;
  const last = view ? [...STEPS].reverse().find((s) => s.done(view)) : undefined;

  return (
    <div className="brief flex h-full flex-col px-[7%] py-[6%] text-[#2a2824]">
      <p className="text-[0.78em] uppercase tracking-[0.18em] text-[#6d665a]">Port Ardee Records Office</p>
      <p className="mt-[0.3em] text-[1.05em] font-semibold leading-tight">Case 001: a brief for the reviewing officer</p>
      <p className="mt-[0.4em] text-[0.82em] leading-snug text-[#5c5649]">
        {!view ? "Connect to the archive to begin. Click a step to do it, or type it yourself."
          : doneCount === STEPS.length ? "All done. The case is closed. Thank you, officer."
          : `${doneCount} of ${STEPS.length} done. Click a step to do it, or type it yourself.`}
      </p>

      <ol className="mt-[0.9em] space-y-[0.32em]">
        {STEPS.map((s, n) => {
          const done = !!view && s.done(view);
          const isNow = s === now && !!view;
          return (
            <li key={s.id} className="flex gap-[0.55em] leading-snug">
              <span className={`brief-box mt-[0.18em] ${done ? "brief-box-done" : ""}`} aria-hidden />
              {isNow ? (
                <button disabled={busy} onClick={() => onStep(s)}
                  className="text-left font-semibold underline decoration-[#24408e]/40 underline-offset-2 hover:decoration-[#24408e] disabled:cursor-wait disabled:opacity-60">
                  {n + 1}. {s.title} <span className="font-normal text-[#24408e]">{busy ? "working…" : "do it"}</span>
                </button>
              ) : (
                <span className={done ? "text-[#6d665a]" : "text-[#8a8374]"}>{n + 1}. {s.title}</span>
              )}
            </li>
          );
        })}
      </ol>

      {last && (
        <p className="brief-note mt-[0.9em] border-t border-[#c9c1ae] pt-[0.6em] text-[0.82em] italic leading-snug text-[#4a463d]">
          {last.note}
        </p>
      )}

      <div className="mt-auto pt-[0.8em] text-[0.78em] leading-snug text-[#6d665a]">
        <p>Also worth a look: the candle (sit back, then click it), and what happens at midnight.</p>
        <button onClick={onExit} className="mt-[0.4em] underline underline-offset-2 hover:text-[#2a2824]">Put the brief away</button>
      </div>
    </div>
  );
}
