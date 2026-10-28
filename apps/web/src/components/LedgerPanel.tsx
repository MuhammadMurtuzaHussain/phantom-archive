import { useState } from "react";
import type { View } from "../api";

const STATUS: Record<string, string> = {
  standing: "text-phosphor",
  revised: "text-blood/70 line-through",
  upheld: "text-amber",
  abstained: "text-phosphor-dim",
};

export function LedgerPanel({ view, busy, onChallenge, onOpen }: {
  view: View; busy: boolean; onChallenge: (lieId: string, cited: string[]) => void; onOpen: (id: string) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [cited, setCited] = useState<string[]>([]);
  const pinned = view.evidence.filter((e) => e.pinned);
  const claims = [...view.ledger].reverse();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-[12px] text-phosphor-dim">
        Everything the Caretaker has claimed. A claim that rests only on <span className="text-violet">its own word</span> (EV-002) can be broken. Pin the evidence that contradicts it, then challenge.
      </p>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {claims.map((c) => {
          const lieId = c.origin === "lie" ? c.id.slice(2) : null;
          const standingLie = lieId && view.lies.find((l) => l.id === lieId)?.standing;
          const selfCited = c.citations.every((id) => id === "EV-002");
          return (
            <li key={c.id} className="border border-line p-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-phosphor-dim">{c.id} · {c.origin}{c.supersedes ? ` · replaces ${c.supersedes}` : ""}</span>
                <span className={`tracking-widest ${STATUS[c.status] ?? ""}`}>{c.status.toUpperCase()}</span>
              </div>
              <p className={`mt-1 ${STATUS[c.status] ?? ""}`}>{c.text}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                {c.citations.map((id) => (
                  <button key={id} onClick={() => onOpen(id)} className="border border-line px-1.5 text-amber hover:border-amber">{id}</button>
                ))}
                {selfCited && c.status === "standing" && <span className="text-violet">cites only itself</span>}
                {standingLie && (
                  <button
                    onClick={() => { setTarget(target === lieId ? null : lieId); setCited([]); }}
                    className="ml-auto border border-blood/60 px-2 py-0.5 tracking-widest text-blood hover:bg-blood/10"
                  >
                    CHALLENGE
                  </button>
                )}
              </div>
              {target === lieId && standingLie && (
                <div className="mt-2 border-t border-line pt-2">
                  {pinned.length ? (
                    <>
                      <p className="mb-1 text-[11px] text-phosphor-dim">Cite pinned evidence:</p>
                      {pinned.map((e) => (
                        <label key={e.id} className="flex items-center gap-2 py-0.5 text-[12px]">
                          <input type="checkbox" checked={cited.includes(e.id)} className="accent-[#ff8a1f]"
                            onChange={() => setCited(cited.includes(e.id) ? cited.filter((x) => x !== e.id) : [...cited, e.id])} />
                          <span className="text-amber">{e.id}</span> <span className="truncate opacity-80">{e.title}</span>
                        </label>
                      ))}
                      <button disabled={busy || !cited.length} onClick={() => { onChallenge(lieId!, cited); setTarget(null); }}
                        className="mt-2 w-full border border-blood/60 py-1 tracking-widest text-blood hover:bg-blood/10">
                        CONFRONT THE CARETAKER
                      </button>
                    </>
                  ) : (
                    <p className="text-[12px] text-amber">Pin evidence first (◇ in the evidence list).</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
