import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { api, type Evidence, type View } from "./api";
import { Terminal } from "./components/Terminal";
import { EvidencePanel } from "./components/EvidencePanel";
import { LedgerPanel } from "./components/LedgerPanel";
import { TheoryPanel } from "./components/TheoryPanel";
import { Relic } from "./components/Relic";

const KEY = "phantom-archive:session";
const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (id: string) => { try { localStorage.setItem(KEY, id); } catch { /* private window: no resume */ } },
};

type Tab = "evidence" | "ledger" | "theory";

function Title({ onEnter, resumable }: { onEnter: (fresh: boolean) => void; resumable: boolean }) {
  return (
    <main className="crt grid min-h-full place-items-center p-4">
      <div className="w-full max-w-xl">
        <p className="text-[11px] tracking-[0.3em] text-amber">PORT ARDEE RECORDS OFFICE · 31 OCT 2049</p>
        <h1 className="glow flicker mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">PHANTOM ARCHIVE</h1>
        <p className="mt-2 text-phosphor-dim">Case 001: The Vale Archive</p>
        <div className="mt-8 space-y-2 text-[13px] leading-relaxed text-phosphor/85">
          <p>The operator is missing. The archive shuts down at midnight. Something inside it is still talking.</p>
          <p className="text-phosphor-dim">Question the Caretaker. Read what it can't hide. Pin evidence, catch its lies, and decide what becomes of it.</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => onEnter(true)} className="border border-amber px-4 py-2 tracking-[0.2em] text-amber hover:bg-amber/10">ENTER THE ARCHIVE</button>
          {resumable && <button onClick={() => onEnter(false)} className="border border-line px-4 py-2 tracking-[0.2em] text-phosphor-dim hover:border-phosphor-dim">RESUME</button>}
        </div>
        <p className="mt-10 text-[11px] text-phosphor-dim">All people, places and events are fictional. The ghost is Gemma, an open-weight model.</p>
      </div>
    </main>
  );
}

function Ending({ view, onRestart }: { view: View; onRestart: () => void }) {
  const e = view.ending!;
  const carry = e.id === "carry";
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-void/95 p-6">
      <div className="max-w-xl">
        <p className={`text-[11px] tracking-[0.3em] ${carry ? "text-marigold" : "text-amber"}`}>{view.endings.find((x) => x.id === e.id)?.title.toUpperCase()}</p>
        <p className={`glow mt-6 font-letter text-2xl leading-snug ${carry ? "text-[#ffd9a8]" : "text-phosphor"}`}>{e.text}</p>
        <button onClick={onRestart} className="mt-10 border border-line px-4 py-2 text-[12px] tracking-[0.2em] text-phosphor-dim hover:border-phosphor-dim">OPEN A NEW CASE FILE</button>
      </div>
    </div>
  );
}

function Game() {
  const [view, setView] = useState<View | null>(null);
  const [entered, setEntered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Evidence | null>(null);
  const [tab, setTab] = useState<Tab>("evidence");
  const [ghost, setGhost] = useState("…");
  const [err, setErr] = useState<string | null>(null);
  const saved = store.get();

  useEffect(() => { api.health().then((h) => setGhost(`${h.ghost.model} @ ${h.ghost.home}`)).catch(() => setGhost("unreachable")); }, []);

  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    setBusy(true);
    setErr(null);
    try { return await fn(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }, []);

  const enter = async (fresh: boolean) => {
    const v = await run(async () => {
      if (!fresh && saved) { try { return await api.state(saved); } catch { /* server restarted: start over */ } }
      return api.newSession();
    });
    if (!v) return;
    store.set(v.id);
    setView(v);
    setOpen(null);
    setEntered(true);
  };

  if (!entered || !view) return <Title onEnter={enter} resumable={!!saved} />;
  const id = view.id;
  const openEvidence = async (eid: string) => {
    const r = await run(() => api.read(id, eid));
    if (r) { setOpen(r.evidence); setView(r.state); setTab("evidence"); }
  };
  const unread = view.evidence.filter((e) => !e.read).length;
  const standing = view.lies.filter((l) => l.standing).length;

  return (
    <main className="crt flex h-full flex-col gap-3 p-3 sm:p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[11px] tracking-[0.2em]">
        <span className="glow text-[13px] text-phosphor">PHANTOM ARCHIVE</span>
        <span className="text-amber">VALE ARCHIVE · 31 OCT 2049 · SHUTDOWN 00:00</span>
        <span className="text-phosphor-dim">ghost: {ghost}</span>
      </header>
      {err && (
        <p role="alert" className="flex items-center justify-between gap-3 border border-blood/50 px-3 py-1.5 text-[12px] text-blood">
          {/no such session/.test(err) ? "The archive restarted and this case file was lost." : err}
          {/no such session/.test(err) && <button onClick={() => enter(true)} className="border border-blood/60 px-2 py-0.5 tracking-widest">OPEN A NEW CASE FILE</button>}
        </p>
      )}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex min-h-[60vh] flex-col gap-3 lg:min-h-0">
          <Terminal view={view} busy={busy} onAsk={async (q) => { const r = await run(() => api.turn(id, q)); if (r) setView(r.state); }} onOpen={openEvidence} />
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <Relic view={view} busy={busy} onEvent={async (t) => { const v = await run(() => api.relic(id, t)); if (v) setView(v); }} />
            <section className="border border-line bg-panel/60 p-3 text-[11.5px] leading-relaxed text-phosphor-dim">
              <p className="mb-1 tracking-[0.2em] text-[10px]">THREE SOURCES OF TRUTH</p>
              <p><span className="text-marigold">■ physical</span>: what the relic and the sensors felt.</p>
              <p><span className="text-phosphor">■ digital</span>: logs, files, pages. They don't lie, but they don't explain.</p>
              <p><span className="text-violet">■ the ghost's word</span>: what the Caretaker says. Check it.</p>
              <p className="mt-2 text-amber/80">{standing ? `${standing} of the Caretaker's claims still stand.` : "The Caretaker has nothing left to hide."}</p>
            </section>
          </div>
        </div>
        <div className="flex min-h-[70vh] flex-col border border-line bg-panel/60 p-3 lg:min-h-0">
          <nav className="mb-3 flex gap-1 text-[11px] tracking-[0.2em]" role="tablist">
            {([["evidence", `EVIDENCE${unread ? ` · ${unread} NEW` : ""}`], ["ledger", `LEDGER · ${standing} STANDING`], ["theory", "THEORY"]] as const).map(([t, label]) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`border px-3 py-1.5 ${tab === t ? "border-amber text-amber" : "border-line text-phosphor-dim hover:text-phosphor"}`}>{label}</button>
            ))}
          </nav>
          {tab === "evidence" && (
            <EvidencePanel view={view} open={open} busy={busy} onOpen={openEvidence}
              onPin={async (eid) => { const v = await run(() => api.pin(id, eid)); if (v) setView(v); }}
              onScan={async () => { const v = await run(() => api.scan(id)); if (v) setView(v); }} />
          )}
          {tab === "ledger" && (
            <LedgerPanel view={view} busy={busy} onOpen={openEvidence}
              onChallenge={async (lieId, cited) => { const r = await run(() => api.challenge(id, lieId, cited)); if (r) setView(r.state); }} />
          )}
          {tab === "theory" && (
            <TheoryPanel view={view} busy={busy} onOpen={openEvidence}
              onAnswer={async (q, a) => { const v = await run(() => api.answer(id, q, a)); if (v) setView(v); }}
              onEnd={async (eid) => { const r = await run(() => api.ending(id, eid)); if (r) setView(r.state); }} />
          )}
        </div>
      </div>
      {view.ending && <Ending view={view} onRestart={() => enter(true)} />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Game /></StrictMode>);
