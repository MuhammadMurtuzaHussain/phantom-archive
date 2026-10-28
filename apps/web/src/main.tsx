import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { api, type Evidence, type View } from "./api";
import { Terminal, type LocalLine } from "./components/Terminal";
import { Claims, Files, Panel, Theory } from "./components/Panels";
import { Relic } from "./components/Relic";
import { HELP, hint, parse, relicAwake, stages, type Stage } from "./progress";

const KEY = "phantom-archive:session";
const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (id: string) => { try { localStorage.setItem(KEY, id); } catch { /* private window: no resume */ } },
};
type PanelName = "files" | "claims" | "theory";
const ORDER: Stage[] = ["files", "claims", "theory"];

function Boot({ ghost, resumable, onStart }: { ghost: string; resumable: boolean; onStart: (fresh: boolean) => void }) {
  const lines = [
    "PORT ARDEE RECORDS OFFICE, remote session",
    "connecting to VALE MEMORIAL ARCHIVE, node 7 ...",
    "link established   31 OCT 2049  09:12",
    "archive shutdown   01 NOV 2049  00:00",
    "",
    "operator I. VALE   unreachable since 30 OCT",
    `caretaker process  running (${ghost})`,
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(lines.length); return; }
    const t = setInterval(() => setShown((n) => (n >= lines.length ? (clearInterval(t), n) : n + 1)), 320);
    return () => clearInterval(t);
  }, [lines.length]);
  const ready = shown >= lines.length;
  useEffect(() => {
    if (!ready) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart(true);
      if ((e.key === "r" || e.key === "R") && resumable) onStart(false);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [ready, resumable, onStart]);

  return (
    <div className="flex h-full flex-col justify-between px-[clamp(1.25rem,6vw,6rem)] py-[clamp(1.5rem,8vh,5rem)]">
      <div>
        <h1 className="phosphor text-[clamp(1.6rem,4vw,2.6rem)] font-semibold leading-tight tracking-tight">PHANTOM ARCHIVE</h1>
        <p className="text-phosphor-dim">Case 001: The Vale Archive</p>
        <div className="mt-10 space-y-0.5 text-[14px]">
          {lines.slice(0, shown).map((l, i) => <p key={i} className="line-in min-h-[1.65em] whitespace-pre text-phosphor/85">{l}</p>)}
        </div>
        {ready && (
          <div className="line-in mt-8 space-y-1">
            <button onClick={() => onStart(true)} className="amber-glow text-amber hover:underline">&gt; press enter to connect<span className="caret" /></button>
            {resumable && <p><button onClick={() => onStart(false)} className="text-phosphor-dim hover:text-amber">&gt; press r to resume your last case file</button></p>}
          </div>
        )}
      </div>
      <p className="text-[12px] text-phosphor-dim">Every person, place and event here is fictional. The Caretaker is Gemma, an open-weight model.</p>
    </div>
  );
}

function Game() {
  const [view, setView] = useState<View | null>(null);
  const [local, setLocal] = useState<LocalLine[]>([]);
  const [panel, setPanel] = useState<PanelName | null>(null);
  const [reading, setReading] = useState<Evidence | null>(null);
  const [busy, setBusy] = useState(false);
  const [lost, setLost] = useState(false);
  const [ghost, setGhost] = useState("connecting");
  const announced = useRef<Set<Stage>>(new Set());
  const saved = store.get();

  useEffect(() => { api.health().then((h) => setGhost(`${h.ghost.model} on ${h.ghost.home}`)).catch(() => setGhost("model unreachable")); }, []);

  const say = useCallback((role: LocalLine["role"], texts: string[], v: View | null = view) => {
    const after = v?.transcript.length ?? 0;
    setLocal((x) => [...x, ...texts.map((text) => ({ after, role, text }))]);
  }, [view]);

  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    setBusy(true);
    try { return await fn(); } catch (e) {
      if (/no such session/.test((e as Error).message)) setLost(true);
      else say("system", [`error: ${(e as Error).message.slice(0, 160)}`]);
    } finally { setBusy(false); }
  }, [say]);

  // Teach each new part of the game once, the moment it opens up.
  useEffect(() => {
    if (!view) return;
    const s = stages(view);
    for (const st of ORDER) {
      if (s[st] && !announced.current.has(st)) {
        announced.current.add(st);
        say("system", hint(st, view), view);
      }
    }
  }, [view, say]);

  const start = useCallback(async (fresh: boolean) => {
    const v = await run(async () => {
      if (!fresh && saved) { try { return await api.state(saved); } catch { /* the archive restarted */ } }
      return api.newSession();
    });
    if (!v) return;
    store.set(v.id);
    const s = stages(v);
    announced.current = new Set(ORDER.filter((st) => s[st]));
    setLocal(s.files ? [] : [{ after: 1, role: "system", text: "Ask it anything. Type a question and press enter." }]);
    setPanel(null);
    setReading(null);
    setLost(false);
    setView(v);
  }, [run, saved]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setPanel(null); setReading(null); } };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  if (!view) return <Boot ghost={ghost} resumable={!!saved} onStart={start} />;
  const id = view.id;
  const s = stages(view);

  const openFile = async (eid: string) => {
    const r = await run(() => api.read(id, eid));
    if (!r) return;
    setView(r.state);
    setReading(r.evidence);
    setPanel("files");
  };
  const challenge = async (lie: string, cited: string[]) => {
    setPanel(null);
    const r = await run(() => api.challenge(id, lie, cited));
    if (r) setView(r.state);
  };

  const submit = async (raw: string) => {
    const c = parse(raw);
    if (c.kind === "ask") {
      const r = await run(() => api.turn(id, c.text));
      if (r) setView(r.state);
      return;
    }
    say("investigator", [raw]);
    switch (c.kind) {
      case "help":
        say("system", [...HELP.start, ...ORDER.filter((st) => s[st]).flatMap((st) => HELP[st])]);
        return;
      case "panel":
        setReading(null);
        setPanel(c.panel);
        return;
      case "open":
        if (!view.evidence.some((e) => e.id === c.id)) return say("system", [`${c.id} has not been recovered yet.`]);
        return openFile(c.id);
      case "pin": {
        if (!view.evidence.some((e) => e.id === c.id)) return say("system", [`${c.id} has not been recovered yet.`]);
        const v = await run(() => api.pin(id, c.id));
        if (v) { setView(v); say("system", [`${c.id} ${v.evidence.find((e) => e.id === c.id)?.pinned ? "pinned as evidence" : "unpinned"}.`], v); }
        return;
      }
      case "challenge":
        if (!c.cited.length) return say("system", [`Challenge ${c.lie} with what? For example: challenge ${c.lie} EV-005`]);
        return challenge(c.lie, c.cited);
      case "scan": {
        const v = await run(() => api.scan(id));
        if (v) { setView(v); say("system", ["Scan filed as EV-012."], v); }
        return;
      }
      case "relic": {
        const v = await run(() => api.relic(id, c.type));
        if (v) setView(v);
        return;
      }
    }
  };

  const titles: Record<PanelName, string> = { files: "files", claims: "the Caretaker's claims", theory: "theory" };
  const pin = async (eid: string) => { const v = await run(() => api.pin(id, eid)); if (v) setView(v); };

  return (
    <div className="relative flex h-full">
      <div className={`flex min-w-0 flex-1 flex-col px-[clamp(1.25rem,6vw,6rem)] pb-4 pt-4 transition-[padding] ${panel ? "lg:pr-[min(48%,660px)]" : ""}`}>
        <header className="mb-6 flex items-center justify-between text-[13px] text-phosphor-dim">
          <span>vale archive, node 7</span>
          <span className="flex items-center gap-4">
            {relicAwake(view) && <Relic view={view} busy={busy} onEvent={async (t) => { const v = await run(() => api.relic(id, t)); if (v) setView(v); }} />}
            <span>shutdown 00:00</span>
          </span>
        </header>
        {lost ? (
          <div className="space-y-3">
            <p className="text-phosphor">The archive restarted, and this case file was lost with it.</p>
            <button onClick={() => start(true)} className="text-amber hover:underline">&gt; open a new case file</button>
          </div>
        ) : (
          <Terminal view={view} local={local} busy={busy} onSubmit={submit} onOpen={openFile} />
        )}
        <nav className="mt-2 flex gap-5 text-[13px] text-phosphor-dim" aria-label="Commands">
          {ORDER.filter((st) => s[st]).map((st) => (
            <button key={st} onClick={() => { setReading(null); setPanel(panel === st ? null : st); }}
              className={`hover:text-amber ${panel === st ? "text-amber" : ""}`}>{st}</button>
          ))}
          <button onClick={() => submit("help")} className="hover:text-amber">help</button>
        </nav>
      </div>

      <Panel open={panel === "files"} title={reading ? "file" : titles.files} onClose={() => { setPanel(null); setReading(null); }}>
        <Files view={view} reading={reading} busy={busy} scanUnlocked={s.claims} onOpen={openFile} onBack={() => setReading(null)} onPin={pin}
          onScan={async () => { const v = await run(() => api.scan(id)); if (v) setView(v); }} />
      </Panel>
      <Panel open={panel === "claims"} title={titles.claims} onClose={() => setPanel(null)}>
        <Claims view={view} busy={busy} onChallenge={challenge} onOpen={openFile} />
      </Panel>
      <Panel open={panel === "theory"} title={titles.theory} onClose={() => setPanel(null)}>
        <Theory view={view} busy={busy}
          onAnswer={async (q, a) => { const v = await run(() => api.answer(id, q, a)); if (v) setView(v); }}
          onEnd={async (eid) => { setPanel(null); const r = await run(() => api.ending(id, eid)); if (r) setView(r.state); }} />
      </Panel>

      {view.ending && (
        <div className="line-in absolute inset-0 z-40 flex flex-col justify-center bg-screen px-[clamp(1.25rem,8vw,8rem)]">
          <p className={view.ending.id === "carry" ? "text-marigold" : "text-amber"}>{view.endings.find((x) => x.id === view.ending!.id)?.title}</p>
          <p className={`mt-6 max-w-[60ch] font-hand text-[clamp(1.3rem,2.4vw,1.75rem)] leading-snug ${view.ending.id === "carry" ? "text-[#ffdcae]" : "text-phosphor"}`}>{view.ending.text}</p>
          <button onClick={() => start(true)} className="mt-12 w-fit text-[13px] text-phosphor-dim hover:text-amber">&gt; open a new case file</button>
        </div>
      )}
    </div>
  );
}

function Monitor() {
  return (
    <main className="h-full p-[clamp(0px,1.2vw,14px)]">
      <div className="screen power-on h-full"><Game /></div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Monitor /></StrictMode>);
