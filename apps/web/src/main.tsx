import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function Boot() {
  const [ghost, setGhost] = useState<string>("…");
  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((h) => setGhost(`${h.ghost.model} @ ${h.ghost.home}`)).catch(() => setGhost("unreachable"));
  }, []);
  return (
    <main className="min-h-dvh grid place-items-center p-4">
      <div className="max-w-xl w-full">
        <p className="text-amber text-xs tracking-widest">VALE ARCHIVE · NODE 7 · 2049-10-31</p>
        <h1 className="mt-4 text-2xl">You took your time.</h1>
        <p className="mt-6 text-xs opacity-60">ghost: {ghost}</p>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Boot /></StrictMode>);
