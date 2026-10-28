import type { View } from "../api";
import { FACES } from "../faces";

/** The relic as the UNO Q draws it: 8×13 LEDs. Simulated until the board is plugged in. */
export function Relic({ view, busy, onEvent }: { view: View; busy: boolean; onEvent: (type: string) => void }) {
  const face = FACES[view.face] ?? FACES.watching;
  return (
    <section className="layer-physical border border-line bg-panel/60 p-3">
      <header className="mb-2 flex items-center justify-between gap-4 text-[10px] tracking-[0.2em]">
        <span className="text-marigold">THE RELIC</span>
        <span className="text-phosphor-dim">simulated · {view.face}</span>
      </header>
      <div className="mx-auto grid w-fit grid-cols-[repeat(13,auto)] gap-[3px] rounded-sm bg-black p-2.5" role="img" aria-label={`The relic's face: ${view.face}`}>
        {face.flatMap((row, r) =>
          [...row].map((px, c) => (
            <span key={`${r}-${c}`} className={`h-[7px] w-[7px] rounded-full ${px === "#" ? "bg-[#7fd8ff] shadow-[0_0_6px_#7fd8ff]" : "bg-[#0e1a20]"}`} />
          )),
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
        <button disabled={busy} onClick={() => onEvent("touch")} className="border border-line py-1 text-marigold hover:border-marigold">rest a hand</button>
        <button disabled={busy} onClick={() => onEvent("warmth")} className="border border-line py-1 text-marigold hover:border-marigold">breathe on it</button>
      </div>
      {view.relic.length > 0 && (
        <p className="mt-2 text-[10.5px] text-phosphor-dim">
          last: {view.relic.at(-1)!.type} at {view.relic.at(-1)!.at.slice(11, 19)} · {view.relic.length} event{view.relic.length > 1 ? "s" : ""}
        </p>
      )}
    </section>
  );
}
