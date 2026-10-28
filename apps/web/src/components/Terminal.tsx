import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Line, View } from "../api";
import { codeForChar, press } from "../keys";

/** A line the browser adds itself (command echoes, hints, help). `after` anchors it in the server transcript. */
export type LocalLine = { after: number; role: "investigator" | "system"; text: string };

function Typed({ text, live, onOpen }: { text: string; live: boolean; onOpen: (id: string) => void }) {
  const [n, setN] = useState(live ? 0 : text.length);
  useEffect(() => {
    if (!live || matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(text.length); return; }
    setN(0);
    // The ghost types on your keyboard: each tick presses the key for the newest character.
    let i = 0;
    const t = setInterval(() => {
      i = Math.min(text.length, i + 2);
      const code = codeForChar(text[i - 1] ?? "");
      if (code) press(code, true);
      setN(i);
      if (i >= text.length) clearInterval(t);
    }, 46);
    return () => clearInterval(t);
  }, [text, live]);
  return n < text.length ? <>{text.slice(0, n)}<span className="caret" /></> : <>{linkify(text, onOpen)}</>;
}

/** EV ids inside any line become links. */
function linkify(text: string, onOpen: (id: string) => void): ReactNode[] {
  return text.split(/(EV-(?:R-)?\d{3})/g).map((part, i) =>
    /^EV-/.test(part) ? (
      <button key={i} onClick={() => onOpen(part)} className="text-amber underline decoration-amber/40 underline-offset-4 hover:decoration-amber">{part}</button>
    ) : (
      part
    ),
  );
}

export function Terminal({ view, local, busy, pending, onSubmit, onOpen }: {
  view: View; local: LocalLine[]; busy: boolean; pending: string | null; onSubmit: (raw: string) => void; onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [h, setH] = useState(-1);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const claims = new Map(view.ledger.map((c) => [c.id, c]));
  const lastGhost = view.transcript.findLastIndex((l) => l.role === "ghost");

  // Braces matter: scrollIntoView returns a Promise in Chrome, and an effect must return nothing.
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [view.transcript.length, local.length, busy]);
  useEffect(() => { if (!busy) input.current?.focus(); }, [busy]);
  // Typing anywhere goes to the prompt, even after clicking the desk.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const a = document.activeElement;
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && a !== input.current && !(a instanceof HTMLInputElement)) input.current?.focus();
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  const row = (l: Line | LocalLine, key: string, live = false) => {
    if (l.role === "system") return <p key={key} className="line-in text-phosphor-dim">{"// "}{linkify(l.text, onOpen)}</p>;
    if (l.role === "investigator") return <p key={key} className="line-in amber-glow text-amber">{"> "}{l.text}</p>;
    const g = l as Line;
    const cites = [...new Set(g.claims?.flatMap((id) => claims.get(id)?.citations ?? []) ?? [])];
    return (
      <div key={key} className="phosphor">
        <p className="max-w-[68ch]"><Typed text={g.text} live={live} onOpen={onOpen} /></p>
        {(cites.length > 0 || g.source === "scripted") && (
          <p className="mt-1 text-[13px] text-phosphor-dim">
            {cites.length > 0 && <>cites {cites.map((id, i) => <span key={id}>{i > 0 && ", "}{linkify(id, onOpen)}</span>)}</>}
            {g.source === "scripted" && <span>{cites.length ? "  " : ""}(scripted line, the model did not answer)</span>}
          </p>
        )}
      </div>
    );
  };

  const rows: ReactNode[] = [];
  const localAt = (n: number) => local.filter((x) => x.after === n).forEach((x, j) => rows.push(row(x, `l${n}-${j}`)));
  localAt(0);
  view.transcript.forEach((l, i) => {
    rows.push(<div key={`t${i}`} className={l.role === "ghost" ? "pt-2" : ""}>{row(l, `r${i}`, i === lastGhost)}</div>);
    localAt(i + 1);
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2" aria-live="polite">
        {rows}
        {busy && pending && <p className="amber-glow text-amber">{"> "}{pending}</p>}
        {busy && <p className="pt-2 text-phosphor-dim">the Caretaker is answering<span className="caret" /></p>}
        <div ref={end} className="h-2" />
      </div>
      <form
        className="mt-3 flex items-center gap-2 border-t border-phosphor-faint pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!q.trim() || busy) return;
          onSubmit(q.trim());
          setHistory((x) => [q.trim(), ...x].slice(0, 30));
          setH(-1);
          setQ("");
        }}
      >
        <span className="amber-glow text-amber">&gt;</span>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && history.length) { e.preventDefault(); const n = Math.min(h + 1, history.length - 1); setH(n); setQ(history[n]!); }
            if (e.key === "ArrowDown") { e.preventDefault(); const n = h - 1; setH(n); setQ(n >= 0 ? history[n]! : ""); }
          }}
          disabled={busy || !!view.ending}
          aria-label="Type a question or a command"
          autoComplete="off"
          spellCheck={false}
          className="amber-glow flex-1 bg-transparent text-amber outline-none placeholder:text-phosphor-dim focus-visible:outline-none"
          placeholder={busy ? "" : "ask, or type help"}
        />
      </form>
    </div>
  );
}
