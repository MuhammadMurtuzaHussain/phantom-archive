import type { Evidence, EvidenceBrief, View } from "../api";

const LAYER_LABEL = { physical: "PHYSICAL", digital: "DIGITAL", interpretation: "GHOST'S WORD" } as const;

export function LayerTag({ layer }: { layer: EvidenceBrief["layer"] }) {
  return <span className={`layer-${layer} text-[10px] tracking-widest text-[var(--layer)]`}>{LAYER_LABEL[layer]}</span>;
}

const time = (ts: string) => ts.replace("T", " ").slice(0, 16);

export function EvidencePanel({
  view, open, onOpen, onPin, onScan, busy,
}: { view: View; open: Evidence | null; onOpen: (id: string) => void; onPin: (id: string) => void; onScan: () => void; busy: boolean }) {
  const sorted = [...view.evidence].sort((a, b) => a.ts.localeCompare(b.ts));
  const letter = open && /letter|note|memo/i.test(open.title);
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3">
      <div className="flex min-h-0 flex-col">
        <div className="mb-2 flex items-center justify-between text-[11px] text-phosphor-dim">
          <span>{view.evidence.length} / 24 recovered · timeline order</span>
          <button onClick={onScan} disabled={busy || view.scanned} className="border border-line px-2 py-0.5 text-amber hover:border-amber">
            {view.scanned ? "scan done" : "run anomaly scan"}
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto border border-line">
          {sorted.map((e) => (
            <li key={e.id} className={`layer-${e.layer} border-b border-line last:border-0`}>
              <div className={`flex items-center gap-2 px-2 py-1.5 ${open?.id === e.id ? "bg-line/60" : "hover:bg-line/30"}`}>
                <span className="h-4 w-0.5 bg-[var(--layer)]" />
                <button onClick={() => onOpen(e.id)} className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
                  <span className="shrink-0 text-[11px] text-amber">{e.id}</span>
                  <span className={`truncate ${e.read ? "opacity-70" : "font-semibold"}`}>{e.title}</span>
                  {!e.read && <span className="text-[10px] text-marigold">new</span>}
                </button>
                <span className="hidden shrink-0 text-[10px] text-phosphor-dim sm:inline">{time(e.ts)}</span>
                <button onClick={() => onPin(e.id)} aria-pressed={e.pinned} title={e.pinned ? "Unpin" : "Pin to board"}
                  className={`shrink-0 text-[13px] ${e.pinned ? "text-marigold" : "text-phosphor-dim hover:text-amber"}`}>
                  {e.pinned ? "◆" : "◇"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <article className={`flex min-h-0 flex-col border border-line ${open ? `layer-${open.layer}` : ""}`}>
        {open ? (
          <>
            <header className="border-b border-line px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber">{open.id}</span>
                <LayerTag layer={open.layer} />
              </div>
              <h3 className="mt-1 text-[15px]">{open.title}</h3>
              <p className="mt-0.5 truncate text-[11px] text-phosphor-dim">{open.source} · {time(open.ts)}</p>
            </header>
            <pre className={`min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-3 py-3 ${letter ? "font-letter text-[17px] leading-snug text-[#f3e6cf]" : "text-[12.5px] leading-relaxed"}`}>
              {open.body}
            </pre>
            <footer className="border-t border-line px-3 py-2 text-right">
              <button onClick={() => onPin(open.id)} className="text-[11px] tracking-widest text-amber">
                {view.evidence.find((e) => e.id === open.id)?.pinned ? "◆ PINNED" : "◇ PIN TO BOARD"}
              </button>
            </footer>
          </>
        ) : (
          <p className="m-auto px-6 text-center text-phosphor-dim">Open a record. Pin what matters. You'll need it to challenge the Caretaker.</p>
        )}
      </article>
    </div>
  );
}
