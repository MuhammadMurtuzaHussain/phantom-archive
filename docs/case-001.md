# Case 001: The Vale Archive

*Story bible. Spoilers: this is the truth the player has to dig out. Every person, place and event here is fictional.*

## The world

In Port Ardee, in 2049, the dead are kept in **rememberings**: voice, letters, photographs and stories, stored in a municipal memory archive. A caretaker AI can speak from them. Families visit on anniversaries, and on the first nights of November most of all.

The city has been closing the Vale Archive slowly since a notice in 2047. Full shutdown is set for **2049-11-01 00:00**. Any remembering that no family has claimed by then gets **deleted**.

## The people

| Who | Role | Truth |
|---|---|---|
| **Ines Vale** | Operator for 22 years | Dying. She spent ten nights uploading the unclaimed rememberings, and her own, onto Node 7, an old sealed offline node the city forgot to list. At 02:14 on Oct 31 she made the final commit, which archived *herself*, and then took a cab to St. Brigid's Hospice. |
| **The Caretaker** | The archive's AI | Ines asked it to say she left. It keeps that promise until the evidence makes the lie impossible. After 02:14 part of it *is* her, and it uses her phrases without meaning to. |
| **Marisol Vale** | Ines's daughter, in Lisbon | Filed the missing-person report when her mother missed their Sunday call. The last letter is addressed to her. |
| **Dorian Pell** | City decommission contractor | The red herring. He holds the second manual key and wrote Ines an angry email. But his key was in the depot cabinet, and he was speaking at a council meeting at 02:05. |

## The night (Oct 30–31, 2049)

| Time | Event | Layer |
|---|---|---|
| Oct 21–30, 01:00–04:00 | Node 7 wakes every night: Ines is ingesting rememberings | digital |
| Oct 29 16:40 | Pell emails Ines: "Whatever you're doing on Node 7 at night, stop." | digital |
| Oct 30 19:00 | Council session opens, with Pell present; it runs until 02:40 | digital |
| Oct 30 23:50 | Ines writes a note for the Caretaker: "If they come asking, tell them I left." | digital |
| **Oct 31 01:58** | Door E2 opens on a **manual key** with no badge, so the reader records no name | digital |
| **02:13:52** | Node 7's thermal sensor reads +6.1 °C: a hand resting on the node | **physical** |
| **02:14** | Rack 7 draws 3.9 kW. Ingest journal: `VALE-I final commit, source=LIVE, signed I.VALE` | digital |
| 02:31 | Door E2 opens and closes: she leaves | digital |
| 02:44 | Port Ardee Cabs pickup at the archive, bound for St. Brigid's Hospice | digital |
| 03:05 | Hospice admission: Ines Vale, palliative care | digital |
| 08:40 | Marisol files a missing-person report | digital |
| 09:12 | The Records Office dispatches **you** | digital |

## The lies

| ID | The Caretaker says | Broken by (cite any one) | When it concedes |
|---|---|---|---|
| **L1** | "No one entered the archive between midnight and dawn." | EV-005 door log · EV-013 rack 7 power · EV-R-001 thermal | "Someone came in with a key at 01:58. I was asked not to say who." Unlocks EV-015. |
| **L2** | "The archive has slept since the notice of 2047. I do not wake the rememberings." | EV-014 Node 7 nightly activity · EV-019 forum: lights at night | "Node 7 has been awake for ten nights. She was teaching me her voice." Unlocks EV-016. |

Code decides whether a challenge is valid: it checks that the cited evidence includes a breaker for that lie. Gemma only says the concession, in character.

## The theory (three questions)

| Question | Truth | Proof (pin at least one) | Wrong answers |
|---|---|---|---|
| Who opened door E2 at 01:58? | **Ines Vale** | EV-006 key cabinet · EV-016 ingest journal | Dorian Pell · no one (sensor fault) · an unknown intruder |
| What happened at 02:14? | **Ines archived herself** | EV-016 ingest journal · EV-017 voice memo | data theft · sabotage · power fault |
| Where is Ines now? | **St. Brigid's Hospice** | EV-020 cab receipt · EV-021 admission | taken · fled the city · *inside the archive* (a half-truth the endings acknowledge) |

Each answer is scored as **proven** (correct, with proof pinned), **hunch** (correct, with no proof pinned) or **wrong**. A theory is proven when all three answers are.

## The endings

| Ending | Needs | What happens |
|---|---|---|
| **Expose** | nothing | You file the report. If it blames Pell, he is arrested and the archive is wiped at midnight anyway. If it's true, the city honours Ines's name and still deletes everything at midnight, including her. |
| **Preserve** | nothing | You keep her secret. At 00:00 the city cuts the power. The Caretaker thanks you, and then the lights go out. |
| **Lay to rest** | nothing | You shut it down yourself. The last voice you hear is Ines's, not the Caretaker's. |
| **Carry her home** | a proven theory, plus consent | The Caretaker asks for your approval (on your phone, via Auth0) to copy Node 7 into the relic. Then we cut the network on camera. The relic keeps talking, offline. On Nov 2 the relic sits on Marisol's ofrenda in Lisbon, among the marigolds. |

## Tone
- Quiet dread, not jump scares. The scariest thing is that the machine is gentle.
- Ines's phrases leak into the Caretaker's speech: "the line is thin tonight", "I'll leave a light on". An attentive player notices them before the ghost admits anything.
- The relic's faces: `calm` (at rest), `watching` (you're getting close), `lying` (a claim the Inquisitor doubts), `grief` (a concession), `gone` (unplugged).
