---
name: the-line
description: 'End-to-end coding-delivery orchestrator: walkthrough (whole requirement) → split into N missions → per mission: tdd → test gate → coding → code gate → prove-done → review. Two modes — adaptive ("the line": the agent proposes a recommended per-mission station route) and forced ("the hard line": all applicable stations pinned on). A THIN orchestrator — it fixes the ORDER, the MODES, the SKIP NORM, and the spoken GATE LABELS, and delegates every station to its own skill; it reimplements nothing. Load on "the line" / "run the line" / "the hard line" / "go with the line" / "follow the line" whenever they name the coding flow — NEVER as a casual synonym for "just proceed". Non-trivial coding work (multi-file / multi-repo, a behavior change, or genuinely new logic) IS the trigger, whether or not the phrase was said.'
---

# the line — coding delivery orchestrator

A **thin** orchestrator. It names a recurring coding flow and the two ways to run it, and
**reimplements nothing** — every station is its own skill. This skill only fixes the ORDER,
the MODES, the SKIP NORM, and the spoken GATE LABELS, and points into the station skills.

## When the line applies (default for non-trivial coding work)

If the work warrants a walkthrough — multi-file / multi-repo, a behavior change, or
genuinely new logic — **the line is the default path, whether or not the trigger phrase was
said.** Recognizing the phrase is a convenience, not the only entry: non-trivial coding work
*is* the trigger.

A few clarifying questions is **NOT** a substitute for the `walkthrough` station — no written
Decision Ledger, no design gate, no sign-off = the line was skipped. Jumping straight from a
light Q&A into coding is the exact failure this orchestrator exists to prevent. Only genuinely
trivial edits (rename / typo / format) bypass it.

## The flow (two levels)

```
the line
└─ walkthrough (entire requirement) → converge → split into N missions
     ├─ mission 0: tdd → test gate → coding → code gate → prove-done → done → review
     ├─ mission 1: tdd → test gate → coding → code gate → prove-done → done → review
     └─ …
```

- `walkthrough` is the first station (requirement level); it then forks into N mission sub-lines.
- **N ≥ 1.** N = 1 is just one sub-line, not special-cased. Work too trivial to warrant a
  walkthrough → the line does not apply (do the edit directly).
- Stations delegate to: `walkthrough` (briefing) · `mission` (carrier) · `tdd` ·
  `test-rt` (test gate) · the author (coding) · `code-rt` (code gate) · `prove-done`.
- Each mission is carried by a **durable contract** (see the `mission` skill) — persist it
  as a stable doc per mission. *(If a local overlay specifies a richer carrier — a tool that
  manages the contract's lifecycle — prefer it over a plain file.)*

## Two modes

- **the line** (adaptive, default): the agent proposes a **per-mission station route** —
  which stations run, which skip, and why — shown as part of each mission's contract at
  sign-off. The user reviews; then silent execution.
- **the hard line**: pin **all *applicable* stations** on. Realized purely via each mission's
  recorded per-station config (tdd forced on + code gate not skipped + acceptance criteria
  present). It does **not** add a stricter gate bar — two-consecutive-clean is already the
  engine default for the design / test / code gates. *Applicable*: `test-rt` is derived from
  `tdd`; if tdd is structurally off (mechanical / copy work), the hard line cannot conjure
  tests, so the test gate stays off.
- **Partial override**: the user may force a single station **on** (subject to the
  pin-conflict rule below).

## Skip norm

A station's skippability is decided by its **own** skill — the line invents no new skip rule;
it only **aggregates and surfaces** the route:

- `tdd`: forced-on / forced-off / auto (benefit ≥ cost + 1).
- `code-rt` (code gate): runs for behavior-changing code; pure-mechanical work
  (rename / format / docs) skips via the skip flag recorded in the mission contract.
- `test-rt` (test gate): **slaved to tdd** — runs iff tdd is on; it has no independent skip
  decision.

The route is **always shown** to the user, with a per-station reason for every skip (never
silent). A test-gate skip reason is sourced from tdd ("TDD off → no first-class tests to gate").

## Pin conflicts (resolved at sign-off only)

- A user pin-**on** overrides a **discretionary** skip (tdd auto-off, a convenience code-gate skip).
- A pin-on that contradicts a **structural precondition** is resolved by the prerequisite's own
  verdict: prerequisite discretionary-off (tdd auto) → **cascade-enable** it; prerequisite
  structurally off (e.g. mechanical work) → **reject the pin with a stated reason**.
- **All** reconciliation happens at sign-off / when the mission contract is created, **before**
  silent execution. A conflict is recorded in the mission's `## Parked Decisions` — never a
  mid-execution user interrupt.

## Gate labels (spoken)

The walkthrough / red-team-family gate steps have sayable names:

| spoken label | what it is |
|---|---|
| **the Ledger** | the written Decision Ledger (with its live OPEN count) |
| **no-self-call** | the agent may not self-declare "done"; only the gate + the user can |
| **the red-team gate** | independent red-team convergence. By layer: **design gate** (`design-rt`, run from `walkthrough`) · **test gate** (`test-rt`) · **code gate** (`code-rt`) |
| **sign-off** | the user's final ok after convergence |

- Write **"red-team"** in full — never the "RT" abbreviation.
- `red-team-gate` is the **engine identifier**; in speech say *design / test / code gate*.
- In any proposal or route shown to the user, use **ok / no / edit** (not ✓ / ✗).

## Gate execution discipline (sequential 1→confirm — NEVER parallel)

Every red-team gate (design / test / code) runs by the **asymmetric cost rule** (see the
`walkthrough` skill's gate) — restated here because it is the #1 mis-run station:

- Spawn **ONE** red team for the round.
- **FAIL** (≥1 hole — by the no-downgrade rule *any* hole = fail) → fold the holes as OPEN,
  re-walk. **A fail needs only that 1 check; do NOT spawn more for the same round.**
- **CLEAN** → spawn a **2nd, INDEPENDENT, FRESH** red team to confirm.
- **Converge only on TWO CONSECUTIVE clean passes** — a clean pass, then a fresh confirming
  pass that is *also* clean. Each pass is a NEW agent; never re-use a prior round's agent as
  the "independent" confirm.

**❌ Anti-pattern — running N red teams in parallel "for speed / independence."** The general
"parallelize independent agents" guidance does **NOT** apply to gate passes. Parallel-burning
(a) wastes a panel when the round is a fail (1 would have sufficed), and (b) mistakes *two
simultaneous* passes for the *two consecutive* the bar requires. **Two-at-once ≠ converged.**

## Honest wiring (enforced vs convention)

- The gates **running** (test gate before coding, code gate before marking a mission done) is a
  **convention the agent follows** — not mechanically forced. The skip flag and acceptance
  criteria live in the mission contract and are read **by the skills**, not by any enforcing layer.
- **Degraded env** (can't build / test): the code gate's execution-dependent findings stay
  Tier-1 UNVERIFIED → can't clear → `code-rt` CAP = 3 → **escalate to the user**. Under the hard
  line this is the **intended terminus**, not a hang. Escalation is **per-gate** (test gate and
  code gate may each escalate).
- `code-rt`'s scope is **broad** (3 tiers): Tier-1 correctness / contract / regression /
  security / acceptance-criteria (blocks), Tier-2 explicit-preference violations (blocks),
  Tier-3 open-ended quality nits (advisory only). It is not a narrow build/test pass.

## Relationship to the work mode

- **Briefing** → `walkthrough` produces the Decision Ledger + the design gate + sign-off, then
  the requirement is split into N missions.
- **Silent execute** → each `mission` runs its station route; `code-rt` gates marking the
  mission done; on cap → escalate.
- **Review** → the user's per-mission review is the sign-off.
- A **thin** layer — the per-mission route lives on the mission contract's review surface; it
  adds no new owner.
