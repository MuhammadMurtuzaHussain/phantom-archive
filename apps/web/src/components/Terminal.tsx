import { useEffect, useRef, useState } from "react";
import type { Claim, Line, View } from "../api";

/** Types out the newest ghost line, once. */
function Typed({ text, live }: { text: string; live: boolean }) {
  const [n, setN] = useState(live ? 0 : text.length);
  useEffect(() => {
    if (!live || matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(text.length); return; }
    setN(0);
    const t = setInterval(() => setN((x) => (x >= text.length ? (clearInterval(t), x) : x + 2)), 22);
    return () => clearInterval(t);
  }, [text, live]);
  return <span className={n < text.length ? "caret" : ""}>{text.slice(0, n)}</span>;
}

function ClaimChip({ c, onOpen }: { c: Claim; onOpen: (id: string) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px]">
      <span className="text-phosphor-dim">{c.id}</span>
      <span className={c.status === "revised" ? "line-through text-blood/70" : "opacity-80"}>{c.text}</span>
      {c.citations.map((id) => (
        <button key={id} onClick={() => onOpen(id)} className="border border-line px-1.5 text-amber hover:border-amber">
          {id}
        </button>
      ))}
      <span className="text-phosphor-dim">{c.confidence}</span>
    </div>
  );
}

export function Terminal({ view, busy, onAsk, onOpen }: { view: View; busy: boolean; onAsk: (q: string) => void; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const claims = new Map(view.ledger.map((c) => [c.id, c]));
  const lastGhost = view.transcript.findLastIndex((l) => l.role === "ghost");

  // Braces matter: scrollIntoView now returns a Promise in Chrome, and an effect must return nothing.
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [view.transcript.length, busy]);

  const say = (l: Line, i: number) => {
    if (l.role === "system") return <p key={i} className="text-[12px] text-amber/70">// {l.text}</p>;
    if (l.role === "investigator") return <p key={i} className="text-amber"><span className="opacity-60">&gt; </span>{l.text}</p>;
    return (
      <div key={i} className="glow">
        <p className="text-[15px] leading-relaxed"><Typed text={l.text} live={i === lastGhost} /></p>
        {l.source === "scripted" && <p className="text-[11px] text-phosphor-dim">scripted line, not the model</p>}
        {l.claims?.map((id) => claims.get(id)).filter(Boolean).map((c) => <ClaimChip key={c!.id} c={c!} onOpen={onOpen} />)}
      </div>
    );
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col border border-line bg-panel/60">
      <header className="flex items-center justify-between border-b border-line px-4 py-2 text-[11px] tracking-[0.2em] text-phosphor-dim">
        <span>CARETAKER · NODE 7</span>
        <span>{busy ? "the archive is thinking…" : "listening"}</span>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5" aria-live="polite">
        {view.transcript.map(say)}
        {busy && <p className="caret text-phosphor-dim" />}
        <div ref={end} />
      </div>
      <form
        className="flex items-center gap-2 border-t border-line px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!q.trim() || busy) return;
          onAsk(q.trim());
          setQ("");
        }}
      >
        <span className="text-amber">&gt;</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={busy || !!view.ending}
          placeholder="ask the Caretaker…"
          aria-label="Ask the Caretaker"
          className="flex-1 bg-transparent text-amber outline-none placeholder:text-phosphor-dim/60"
        />
        <button disabled={busy || !q.trim()} className="text-[11px] tracking-widest text-amber">ASK</button>
      </form>
    </section>
  );
}
