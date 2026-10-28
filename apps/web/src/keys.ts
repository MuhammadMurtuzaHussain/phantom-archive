import { keyClick } from "./sound";

// One bus for every key press, yours or the ghost's. The 3D keyboard listens
// and pushes the matching keycap down; the sound engine clicks.

export type Press = { code: string; ghost: boolean };
const subs = new Set<(p: Press) => void>();

export function onPress(f: (p: Press) => void) { subs.add(f); return () => { subs.delete(f); }; }

export function press(code: string, ghost = false) {
  subs.forEach((f) => f({ code, ghost }));
  keyClick(ghost ? "ghost" : code === "Space" ? "space" : code === "Enter" ? "enter" : "key");
}

/** The ghost types a character: find the key that would make it. */
export function codeForChar(ch: string): string | null {
  if (/^[a-z]$/i.test(ch)) return `Key${ch.toUpperCase()}`;
  if (/^[0-9]$/.test(ch)) return `Digit${ch}`;
  if (ch === " ") return "Space";
  const map: Record<string, string> = { ".": "Period", ",": "Comma", "-": "Minus", "'": "Quote", '"': "Quote", "?": "Slash", "/": "Slash", ";": "Semicolon", ":": "Semicolon" };
  return map[ch] ?? null;
}

let installed = false;
/** Your real keyboard drives the 3D one. */
export function listenToRealKeyboard() {
  if (installed) return;
  installed = true;
  addEventListener("keydown", (e) => { if (!e.repeat && !e.metaKey && !e.ctrlKey) press(e.code); });
}
