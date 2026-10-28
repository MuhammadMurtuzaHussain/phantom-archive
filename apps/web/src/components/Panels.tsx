import { useState, type ReactNode } from "react";
import type { Evidence, View } from "../api";

const LAYER = { physical: "physical record", digital: "digital record", interpretation: "the Caretaker's own word" } as const;
const date = (ts: string) => ts.slice(0, 16).replace("T", " ");

/** A window that slides over the right of the screen. Esc or the close command shuts it. */
export function Panel({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <aside
      aria-hidden={!open}
      inert={!open}
      className={`panel absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-phosphor-faint bg-screen px-5 py-4 @4xl:w-[min(46%,640px)] ${open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0"}`}
    >
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-phosphor">{title}</h2>
        <button onClick={onClose} className="text-[13px] text-phosphor-dim hover:text-amber">close [esc]</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
    </aside>
  );
}

export function Files({ view, reading, busy, onOpen, onBack, onPin, onScan, scanUnlocked }: {
  view: View; reading: Evidence | null; busy: boolean; scanUnlocked: boolean;
  onOpen: (id: string) => void; onBack: () => void; onPin: (id: string) => void; onScan: () => void;
}) {
  if (reading) {
    const pinned = view.evidence.find((e) => e.id === reading.id)?.pinned;
    const hand = /letter|note|memo/i.test(reading.title);
    return (
      <article>
        <button onClick={onBack} className="mb-4 text-[13px] text-phosphor-dim hover:text-amber">&lt; all files</button>
        <p className="text-amber">{reading.id}</p>
        <h3 className="text-[17px] leading-snug">{reading.title}</h3>
        <p className="mt-1 text-[13px] text-phosphor-dim">{LAYER[reading.layer]}, {reading.source}, {date(reading.ts)}</p>
        <pre className={`mt-5 whitespace-pre-wrap ${hand ? "font-hand text-[19px] leading-snug text-[#f2e3c4]" : "text-[13.5px] leading-relaxed"}`}>{reading.body}</pre>
        <button onClick={() => onPin(reading.id)} disabled={busy}
          className={`mt-6 border px-3 py-1.5 text-[13px] ${pinned ? "border-amber/60 text-amber" : "border-phosphor-faint text-phosphor-dim hover:border-amber hover:text-amber"}`}>
          {pinned ? "pinned as evidence" : `pin ${reading.id} as evidence`}
        </button>
      </article>
    );
  }
  const sorted = [...view.evidence].sort((a, b) => a.ts.localeCompare(b.ts));
  return (
    <div>
      <table className="w-full text-left text-[13.5px]">
        <tbody>
          {sorted.map((e) => (
            <tr key={e.id} className="group">
              <td className="w-0 py-1 pr-3 align-top text-amber/80">{e.pinned ? "*" : " "}</td>
              <td className="w-0 whitespace-nowrap py-1 pr-4 align-top">
                <button onClick={() => onOpen(e.id)} className="text-amber hover:underline">{e.id}</button>
              </td>
              <td className="py-1 pr-4 align-top">
                <button onClick={() => onOpen(e.id)} className={`text-left ${e.read ? "text-phosphor-dim" : "text-phosphor"} group-hover:text-phosphor`}>{e.title}</button>
              </td>
              <td className="hidden whitespace-nowrap py-1 text-right align-top text-phosphor-dim sm:table-cell">{e.ts.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-5 text-[13px] text-phosphor-dim">
        {view.evidence.length} of 24 recovered. Unread files are bright. * marks pinned evidence.
      </p>
      {scanUnlocked && (
        <button onClick={onScan} disabled={busy || view.scanned} className="mt-4 border border-phosphor-faint px-3 py-1.5 text-[13px] text-amber hover:border-amber">
          {view.scanned ? "anomaly scan filed as EV-012" : "run anomaly scan on the telemetry"}
        </button>
      )}
    </div>
  );
}

export function Claims({ view, busy, onChallenge, onOpen }: {
  view: View; busy: boolean; onChallenge: (lie: string, cited: string[]) => void; onOpen: (id: string) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [cited, setCited] = useState<string[]>([]);
  const pinned = view.evidence.filter((e) => e.pinned);
  return (
    <div className="space-y-6">
      {[...view.ledger].reverse().map((c) => {
        const lie = c.origin === "lie" ? view.lies.find((l) => `C-${l.id}` === c.id) : undefined;
        const open = lie?.standing && target === lie.id;
        return (
          <div key={c.id}>
            <p className={c.status === "revised" ? "text-phosphor-dim line-through decoration-phosphor-dim" : ""}>{c.text}</p>
            <p className="mt-1 text-[13px] text-phosphor-dim">
              {c.status === "revised" ? "broken" : c.status === "upheld" ? "held under challenge" : lie ? `standing, ${lie.id}` : "standing"}
              {", cites "}
              {c.citations.map((id, i) => (
                <span key={id}>{i > 0 && ", "}<button onClick={() => onOpen(id)} className="text-amber/90 hover:underline">{id}</button></span>
              ))}
              {c.citations.every((id) => id === "EV-002") && c.status === "standing" && " (only itself)"}
            </p>
            {lie?.standing && !open && (
              <button onClick={() => { setTarget(lie.id); setCited([]); }} className="mt-2 text-[13px] text-amber hover:underline">challenge {lie.id}</button>
            )}
            {open && (
              <div className="mt-3 border-l border-amber/40 pl-4">
                {pinned.length ? (
                  <>
                    <p className="text-[13px] text-phosphor-dim">Which evidence contradicts it?</p>
                    {pinned.map((e) => (
                      <label key={e.id} className="mt-1 flex cursor-pointer items-baseline gap-2 text-[13.5px]">
                        <input type="checkbox" className="accent-[#ffbf5e]" checked={cited.includes(e.id)}
                          onChange={() => setCited(cited.includes(e.id) ? cited.filter((x) => x !== e.id) : [...cited, e.id])} />
                        <span className="text-amber">{e.id}</span><span className="text-phosphor-dim">{e.title}</span>
                      </label>
                    ))}
                    <div className="mt-3 flex gap-4 text-[13px]">
                      <button disabled={busy || !cited.length} onClick={() => { onChallenge(lie.id, cited); setTarget(null); }} className="border border-amber/70 px-3 py-1 text-amber hover:bg-amber/10">confront it</button>
                      <button onClick={() => setTarget(null)} className="text-phosphor-dim hover:text-amber">cancel</button>
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] text-phosphor-dim">You have no evidence pinned. Open a file and pin it first.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Theory({ view, busy, onAnswer, onEnd }: {
  view: View; busy: boolean; onAnswer: (q: string, a: string) => void; onEnd: (id: string) => void;
}) {
  const pinned = view.evidence.filter((e) => e.pinned);
  const proven = view.endings.find((e) => e.id === "carry")?.open;
  return (
    <div className="space-y-7">
      <p className="text-[13.5px] text-phosphor-dim">
        A right answer only counts if its proof is pinned. You have {pinned.length} file{pinned.length === 1 ? "" : "s"} pinned{pinned.length ? `: ${pinned.map((e) => e.id).join(", ")}` : ""}.
      </p>
      {view.questions.map((q) => (
        <fieldset key={q.id}>
          <legend className="mb-2 text-amber">{q.prompt}</legend>
          {Object.entries(q.answers).map(([id, label]) => (
            <label key={id} className="flex cursor-pointer items-baseline gap-3 py-0.5 text-[14px]">
              <input type="radio" name={q.id} className="accent-[#ffbf5e]" checked={view.theory[q.id] === id} disabled={!!view.ending} onChange={() => onAnswer(q.id, id)} />
              <span className={view.theory[q.id] === id ? "text-phosphor" : "text-phosphor-dim"}>{label}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <div>
        <p className={proven ? "text-marigold" : "text-phosphor-dim"}>
          {proven ? "The archive accepts your theory." : "The archive is not convinced yet."}
        </p>
        <p className="mt-4 mb-2 text-amber">What becomes of the archive?</p>
        <div className="space-y-1.5">
          {view.endings.map((e) => (
            <button key={e.id} disabled={busy || !e.open || !!view.ending} onClick={() => onEnd(e.id)}
              className={`block text-left text-[14px] hover:underline ${e.id === "carry" ? "text-marigold" : "text-phosphor"}`}>
              {e.title}{!e.open && <span className="text-phosphor-dim"> (needs a proven theory)</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
