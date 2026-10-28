// Mirrors the API's view(). The browser never sees truths, proofs or verdicts.
export type Layer = "physical" | "digital" | "interpretation";
export type Face = "calm" | "watching" | "lying" | "grief" | "gone";

export type EvidenceBrief = {
  id: string; title: string; layer: Layer; kind: string; source: string; ts: string; tags: string[]; read: boolean; pinned: boolean;
};
export type Evidence = EvidenceBrief & { body: string };
export type Claim = {
  id: string; text: string; citations: string[]; confidence: "low" | "medium" | "high";
  status: "standing" | "revised" | "upheld" | "abstained" | "stripped"; supersedes?: string; at: string; origin: "lie" | "turn" | "challenge";
};
export type Line = { role: "investigator" | "ghost" | "system"; text: string; at: string; source?: "model" | "scripted"; claims?: string[] };

export type View = {
  id: string;
  case: { title: string; now: string; deadline: string; fiction: string };
  evidence: EvidenceBrief[];
  lies: { id: string; claim: string; standing: boolean }[];
  ledger: Claim[];
  transcript: Line[];
  questions: { id: string; prompt: string; answers: Record<string, string> }[];
  theory: Record<string, string>;
  /** Minutes of the night spent, out of minutes. At the end the city cuts the power. */
  clock: { elapsed: number; minutes: number };
  endings: { id: string; title: string; open: boolean }[];
  ending: { id: string; title: string; variant: string; text: string } | null;
  scanned: boolean;
  relic: { type: string; at: string }[];
  face: Face;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: { "content-type": "application/json" }, ...init });
  if (!res.ok && res.status !== 409) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
const post = <T,>(path: string, body?: unknown) => call<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

export const api = {
  health: () => call<{ ghost: { model: string; home: string } }>("/health"),
  newSession: () => post<View>("/session"),
  state: (id: string) => call<View>(`/session/${id}/state`),
  read: (id: string, eid: string) => call<{ evidence: Evidence; state: View }>(`/session/${id}/evidence/${eid}`),
  pin: (id: string, eid: string) => post<View>(`/session/${id}/pin/${eid}`),
  scan: (id: string) => post<View>(`/session/${id}/scan`),
  relic: (id: string, type: string) => post<View>(`/session/${id}/relic`, { type }),
  turn: (id: string, message: string) => post<{ state: View }>(`/session/${id}/turn`, { message }),
  challenge: (id: string, lieId: string, cited: string[]) =>
    post<{ result: { landed: boolean; reason: string }; state: View }>(`/session/${id}/challenge`, { lieId, cited }),
  answer: (id: string, question: string, answer: string) => post<View>(`/session/${id}/answer`, { question, answer }),
  ending: (id: string, eid: string) => post<{ ok: boolean; state: View }>(`/session/${id}/ending/${eid}`),
};
