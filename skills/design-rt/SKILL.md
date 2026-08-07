---
name: design-rt
description: >-
  Independent adversarial gate on a DESIGN — the Decision Ledger produced by a walkthrough —
  run before execution begins. It checks the design is COMPLETE: every decision node that
  should be open is open (not missing, not wrongly parked with a default, not falsely marked
  N/A). The design-phase counterpart to the test gate (test-rt) and the code gate (code-rt).
  Load when a walkthrough believes it has converged, or on "design gate" / "gate the ledger" /
  "is the design complete".
---

# design-rt: is the design complete? (the design gate)

## Why this exists

A `walkthrough` produces a Decision Ledger, but the agent that drafted it cannot judge its own
completeness — its pull toward "produce code = progress" wins that bet, so it declares "done,
let's build" while nodes are still unsettled and the user becomes the completeness debugger.
This gate closes that gap: **before execution, an independent red team checks the Ledger for the
decision nodes that should be open but aren't** — and the agent may not self-declare the design done.

- It is the **design-phase** counterpart to the **test gate** (`test-rt`, input side), **code gate**
  (`code-rt`, output side), **BDD gate** (`bdd-rt`, behavior examples), and user-facing
  **acceptance gate** (`accept-rt`) — the earliest gate,
  run at the briefing stage.
- Its job is **completeness, not correctness**: *is every decision that clears the ASK-gate
  actually surfaced?* — never "is this the right design" (that call is the user's, at sign-off).

## When to run

- When the `walkthrough` agent thinks every branch is at its floor. Running this gate is its ONLY
  move at that point — announcing "walkthrough complete / ready to build" on its own authority is
  banned (see `walkthrough`, no-self-declare).
- Against the current Decision Ledger, every round until convergence or **CAP = 3 fix-rounds**.
  Report `fix round / 3`, OPEN count, and confirmation pass progress. At the cap with unresolved
  blockers, escalate the remaining decisions to the user; never continue an unbounded sequence.

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

Each finding carries an explicit `blocking` boolean. A finding blocks only when it identifies a
concrete decision failure, the affected requirement/contract/user/safety behavior, evidence from the
Ledger/source, and the real cost of leaving it unresolved. **Convergence = zero blocking holes for the signed confirmation mode**
(`single` = one clean pass; `double` = two fresh sequential clean passes).

## Portable finding contract

This skill is executable without the optional engine. An off-engine reviewer returns a list of
findings with: `dimension` · `node` · `type` (`missing` / `over-parked` / `weak-na`) · `why` ·
`suggested_triage` (`ASK` / `PARK` / `PROTOTYPE`) · `severity` · required boolean `blocking`.
Use the fixed dimensions and materiality rule above. Empty findings means blocking-clean.

The shared engine carries the machine-readable JSON schema and the same generic design preset so
an engine call needs only `{ artifact, context, confirmation: <route single|double>, protocolVersion: 1 }`. The engine is an optional
accelerator, not required knowledge for understanding or manually running this skill.

## Engine

design-rt IS the engine's built-in default preset, so it does not pass a custom rubric — a
design-gate call passes only `{ artifact: <the Decision Ledger>, context: <spec / decisions so
far>, confirmation: <route single|double>, protocolVersion: 1 }` and inherits the design framing / dimensions / findings-schema. The **shared gate
invariants** — fail-fast plus the signed clean-confirmation mode, never-bless, no-downgrade, scope-in-as-a-floor
(lane-partition, not exclusion), verify-against-source, capability-before-diversity — live in the
`red-team-gate` engine header; design-rt inherits them exactly like its sibling gates.

Convene a **code-capable** red team (one that can Read / Grep / run the repo) by DEFAULT whenever
the Ledger asserts how existing code behaves; a text-only panel is the fallback only for pure-design
ledgers with no code claims.

Every pass uses a fresh context/session. The reviewer must be capable of checking the actual
artifact: use a code-capable reviewer when the Ledger asserts code behavior. A different model
or client is optional diversity only when it is comparably capable (or better) and reliable;
never downgrade reviewer quality to obtain heterogeneity. Same-model fresh-context passes are
fully valid. An off-engine runner needs this rubric reproduced verbatim.

## Relationship to the other gates

- **Upstream oracle** → the `walkthrough` skill's Decision Ledger + ASK-gate.
- **Invocation ownership** → `walkthrough` may invoke this validator as an explicit step in its
  transparent Definition composite. Independence comes from this skill's separately owned rubric,
  fresh reviewer, explicit findings, and convergence result, not from requiring a separate top-level caller.
- **Gates** → the walkthrough's convergence: done requires the signed `single`/`double` design-gate
  confirmation, and only THEN is the user summoned. The gate is the *precondition* to summon the user, never a substitute
  for their sign-off.
- **Followed by** → BDD formulation + `bdd-rt` when BDD is applicable, otherwise user sign-off;
  durable missions are created only when their carrier value justifies them.
- **Shares the engine with** → `bdd-rt`, `test-rt`, `code-rt`, and `accept-rt` — same engine, different
  rubrics (design uses the built-in default; the others override it).
