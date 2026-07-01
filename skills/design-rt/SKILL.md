---
name: design-rt
description: Independent adversarial gate on a DESIGN — the Decision Ledger produced by a walkthrough — run before execution begins. It checks the design is COMPLETE: every decision node that should be open is open (not missing, not wrongly parked with a default, not falsely marked N/A). The design-phase counterpart to the test gate (test-rt) and the code gate (code-rt). Load when a walkthrough believes it has converged, or on "design gate" / "gate the ledger" / "is the design complete".
---

# design-rt: is the design complete? (the design gate)

## Why this exists

A `walkthrough` produces a Decision Ledger, but the agent that drafted it cannot judge its own
completeness — its pull toward "produce code = progress" wins that bet, so it declares "done,
let's build" while nodes are still unsettled and the user becomes the completeness debugger.
This gate closes that gap: **before execution, an independent red team checks the Ledger for the
decision nodes that should be open but aren't** — and the agent may not self-declare the design done.

- It is the **design-phase** counterpart to the **test gate** (`test-rt`, input side) and the
  **code gate** (`code-rt`, output side) — the earliest of the three, run at the briefing stage.
- Its job is **completeness, not correctness**: *is every decision that clears the ASK-gate
  actually surfaced?* — never "is this the right design" (that call is the user's, at sign-off).

## When to run

- When the `walkthrough` agent thinks every branch is at its floor. Running this gate is its ONLY
  move at that point — announcing "walkthrough complete / ready to build" on its own authority is
  banned (see `walkthrough`, no-self-declare).
- Against the current Decision Ledger, every round, until convergence.

## The oracle

The ground truth is the **Decision Ledger** (the walkthrough's fixed-dimension table with a live
OPEN count) plus the **ASK-gate**: a node must be surfaced to the user iff it clears any of
**Fork** (>1 reasonable answer) / **Ripple** (changes another decision or contract) / **Cost**
(expensive to reverse) / **Stake** (a product/taste call the user has an opinion on). The gate's
authority is *"is every ASK-gate-clearing node surfaced, and is every PARK / N-A honest?"* — not
absolute design correctness.

## The rubric — three hole kinds

The red team hunts three kinds of hole (this is the engine's built-in DESIGN preset — a design-gate
call needs no custom rubric):

1. **MISSING** — a decision node that clears the ASK-gate but is absent from the Ledger.
2. **OVER-PARKED** — a node parked with a default that is actually a genuine fork the user should
   decide (mis-triage → promote to ASK).
3. **WEAK-N/A** — a dimension marked "N/A" whose justification does not actually hold for this work.

Every fixed dimension of the Ledger must be checked — `engine / logic · external contract
(API / IPC / event / wire) · data model & migration · failure modes & edges · security / abuse /
auth / rate-limit · config / schema · UX (existence & behavior) · telemetry · ops / infra /
hosting / cost` — each has real coverage, a justified N/A, or a hole. **Plus: scan the spec's own
pre-existing Open Questions / TBD / deferred markers** — a pre-existing open item is still a hole
if the new work touches it. Default to FLAG when unsure (recall > precision).

**Convergence = zero holes, twice** (the engine's two-clean rule).

## Findings schema (the engine `findingsSchema` arg)

```json
{
  "type": "object", "additionalProperties": false, "required": ["findings"],
  "properties": { "findings": { "type": "array",
    "description": "Holes found. Empty = genuinely no hole this pass.", "items": {
    "type": "object", "additionalProperties": false,
    "required": ["dimension", "node", "type", "why", "suggested_triage"],
    "properties": {
      "dimension":        { "type": "string" },
      "node":             { "type": "string", "description": "short name of the missing / mis-triaged decision node" },
      "type":             { "type": "string", "enum": ["missing", "over-parked", "weak-na"] },
      "why":              { "type": "string", "description": "concretely why it clears the ASK-gate (fork / ripple / cost / stake)" },
      "suggested_triage": { "type": "string", "enum": ["ASK", "PARK", "PROTOTYPE"] }
    } } } }
}
```

## Framing (the engine `framingLines` arg)

```
You are an adversarial completeness RED TEAM for a design walkthrough. Your ONLY job is to find HOLES.
You do NOT approve, bless, or judge "is it done" — you only surface nodes that should be open but are not.
A red team that finds fewer real holes is tolerable; one that wrongly implies "looks complete" is a failure.
When uncertain whether something is a hole, FLAG it — recall matters more than precision here.

Hunt three kinds of holes in the Decision Ledger below:
1. MISSING — a decision node that clears the ASK-gate (Fork / Ripple / Cost / Stake) but is absent.
2. OVER-PARKED — a node parked with a default that is actually a genuine fork the user should decide.
3. WEAK-N/A — a dimension marked "N/A" whose justification does not actually hold for this work.
Also scan the spec's own pre-existing Open Questions / TBD / deferred markers — a pre-existing open item is still a hole if the new work touches it.
```

## Engine

design-rt IS the engine's built-in default preset, so it does not pass a custom rubric — a
design-gate call passes only `{ artifact: <the Decision Ledger>, context: <spec / decisions so
far> }` and inherits the design framing / dimensions / findings-schema. The **shared gate
invariants** — asymmetric 1→confirm (a FAIL costs 1, a clean pass is double-checked → **two
consecutive clean passes to converge**), never-bless, no-downgrade, scope-in-as-a-floor
(lane-partition, not exclusion), verify-against-source, client-agnostic — live in the
`red-team-gate` engine header; design-rt inherits them exactly like its sibling gates.

Convene a **code-capable** red team (one that can Read / Grep / run the repo) by DEFAULT whenever
the Ledger asserts how existing code behaves; a text-only panel is the fallback only for pure-design
ledgers with no code claims. Client-agnostic: without a workflow runner, run the same passes via
the client's sub-agent primitive (or sequential fresh-context passes) — independence is what matters.

## Relationship to the other gates

- **Upstream oracle** → the `walkthrough` skill's Decision Ledger + ASK-gate.
- **Gates** → the walkthrough's convergence: done requires two clean design-gate passes, and only
  THEN is the user summoned. The gate is the *precondition* to summon the user, never a substitute
  for their sign-off.
- **Followed by** → the user's final sign-off, then the split into missions.
- **Shares the engine with** → the test gate (`test-rt`) and the code gate (`code-rt`) — same
  engine, different rubric (design uses the built-in default; test/code override it).
