import { useState } from "react";
import type { View } from "../api";
import { FACES } from "../faces";

/** The relic as the UNO Q draws it: 8 rows of 13 LEDs. Simulated until the board is connected. */
export function Relic({ view, busy, onEvent }: { view: View; busy: boolean; onEvent: (type: "touch" | "warmth") => void }) {
  const [open, setOpen] = useState(false);
  const face = FACES[view.face] ?? FACES.watching;
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`The relic, simulated. Its face: ${view.face}`}
        className="grid grid-cols-[repeat(13,3px)] gap-[2px] p-1 hover:outline hover:outline-1 hover:outline-marigold/40">
        {face.flatMap((row, r) => [...row].map((px, c) => (
          <span key={`${r}-${c}`} className={`h-[3px] w-[3px] ${px === "#" ? "bg-marigold shadow-[0_0_3px_#ff9a3c]" : "bg-[#1a120a]"}`} />
        )))}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-60 border border-marigold/40 bg-screen p-3 text-[13px]">
          <p className="text-marigold">The relic</p>
          <p className="mt-1 text-phosphor-dim">A sealed piece of Node 7. Simulated here; the real one is an Arduino on the desk.</p>
          <div className="mt-3 flex gap-4">
            <button disabled={busy} onClick={() => { onEvent("touch"); setOpen(false); }} className="text-marigold hover:underline">rest a hand</button>
            <button disabled={busy} onClick={() => { onEvent("warmth"); setOpen(false); }} className="text-marigold hover:underline">breathe on it</button>
          </div>
        </div>
      )}
    </div>
  );
}
