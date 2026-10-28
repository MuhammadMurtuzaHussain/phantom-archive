import { keyClick } from "./sound";

// Every key press, yours or the ghost's, sounds like the old keyboard on the desk.

export function press(code: string, ghost = false) {
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
/** Your real keyboard, heard. */
export function listenToRealKeyboard() {
  if (installed) return;
  installed = true;
  addEventListener("keydown", (e) => { if (!e.repeat && !e.metaKey && !e.ctrlKey) press(e.code); });
}
