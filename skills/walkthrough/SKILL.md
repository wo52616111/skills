---
name: walkthrough
description: 'Align on meaningful decisions with the user by PROPOSING answers, not interrogating them. Walk the real decision tree top-down and produce a signed execution contract. Use only when the task contains genuine product/design/architecture forks, expensive choices, or uncertainty that needs user alignment; explicit low-risk work may skip walkthrough even when the-line is active. TRIGGER PHRASES: "walk me through this" / "walk through this" / "walk it through" / "walk it".'
---

# Walkthrough Skill: Propose, Don't Interrogate

## Why this skill exists

You delegate work to agents and want to **stay in control of the global
picture without being interrogated**. The failure mode this skill kills:

> Agent asks "How do you want to handle X? A or B or C?" — using the user's brain
> as a substitute for its own thinking. Worse, it invents questions that have
> obvious answers, or it misses the questions that actually matter.

This skill replaces **Q&A** with a **proposal walkthrough**. The agent does the
thinking first, lays out a drafted decision tree, and the user reviews it the way
a senior reviews a junior's design doc — by approving, rejecting, or editing, not
by answering a quiz.

This is the **briefing stage** of a Briefing → Silent → Review work mode. Its
output is the signed contract that lets execution run with zero interruptions
afterward.

## The core inversion

| ❌ Interrogation style | ✅ Walkthrough (this skill) |
|---|---|
| "Which database should we use?" | "I'll use Postgres (already in the repo, migrations exist). Alternative: SQLite — rejected, no concurrent writes. ok?" |
| "Do you want auth on this endpoint?" | "This endpoint inherits the existing `requireSession` middleware like its siblings. ok?" |
| Asks one question at a time, waits | Lays out the whole drafted tree, user sweeps it once |
| Agent offloads thinking to user | Agent completes the thinking, user audits it |

**Rule:** every node the agent surfaces must come with the agent's own
recommended answer. If the agent has no recommendation, it has not done its
homework yet — go explore the codebase, don't ask.

## Role and public contract

`walkthrough` is a **transparent composite Definition function**, not merely a decision collector:

```text
walkthrough(raw requirement, Definition Route)
  -> decision discovery and resolution
  -> design-rt
  -> bdd when applicable
  -> bdd-rt when independently enabled
  -> explicit user sign-off
  -> Signed Definition Bundle
```

It may be called directly or by `the-line`; both entrypoints use this same contract. A direct call
uses an adaptive Definition Route unless the user pins a station. A `the-line` call supplies the
already selected ON/OFF and confirmation decisions. Every nested call and result remains visible;
`walkthrough` does not reimplement validator or BDD logic.

**Input:** raw request, repository evidence, existing spec/constraints, and an optional Definition
Route covering design gate, BDD mode, BDD gate, and confirmation.

**Output:** a Signed Definition Bundle containing the Decision Ledger, acceptance criteria,
non-behavior constraints, applicable scenarios and AC trace, the Definition Receipt, execution-safety
sections, and implementation notes.

**Explicit effects:** batched user decision interaction, durable writes to the Definition artifact
(Decision Ledger, scenarios, receipt, and execution contract), fresh independent validator calls, and
final user sign-off. Dependency installation and durable execution lifecycle transitions are excluded:
`bdd-setup` and `mission` remain separate capabilities.

## When to load

- Starting non-trivial work that needs the user aligned before execution.
- User says "walk me through", "let's walk through".
- Before delegating a chunk of work to another agent/session (produce the contract first).
- When a request is big enough that you'd otherwise interrupt the user repeatedly mid-build.

Do **not** load merely because work changes behavior, spans multiple files, or triggered `the-line`.
Skip when the requirement and constraints are explicit, no meaningful user decision remains, and the
agent can execute without later interruption. Examples include two straightforward error-code fixes,
a well-specified regression with a known root cause, copy/format work, or work already covered by a
signed contract.

## What the agent does

### 1. Do the homework first (silent)
Before surfacing anything, explore the codebase and resolve everything you can on
your own. **Any question answerable by reading the repo must be answered by reading
the repo, not by asking the user.** Only genuine forks survive to the walkthrough.

### 2. Map the full tree FIRST — define "done" before walking any node

**The map is a shallow outline, NOT a pile of decisions.** It lists *which slots
need filling* — node names + one-line scope + status (`decided` / `open` /
`parked`) — grouped by area, scannable in roughly one screen. It does NOT contain
proposals, recommendations, or ask the user to decide anything. Showing the map is
showing a table of contents, not making the user read every chapter at once.

Its three jobs:
1. **Define "done"** — the walk is complete only when every node is `decided` or
   `parked` (conservative default). Without the map, "done" has no definition and
   the agent's bias toward coding fills the void early. The map is maintained as the
   **written Decision Ledger** (the Ledger), and completeness is verified by an independent
   red team panel (the red-team gate) — never the agent's own judgment.
2. **Show shape and size** — the user sees how big the work is and can catch a
   missing branch before any time is spent deciding.
3. **Expose dependencies** — which nodes gate which, so the walk order is correct.

### Bounded-progress contract

Before presenting the first decision batch, count the mapped nodes and show progress explicitly:

```text
Decision progress: 5/25 resolved
Current batch: 2/5
Remaining areas: API contract, failure modes, rollout
```

Every later batch repeats `resolved/total` and the batch index. The user must never have to guess
whether another unknown number of D-batches is coming. If discovery adds nodes, change the denominator
openly: `25 -> 28 (+3 migration decisions discovered while resolving D11)`. Never hide denominator
growth or reset numbering. When an exact total genuinely cannot be known initially, give a bounded
range and the event that will finalize it, then replace the range with an exact count as soon as the
map is complete.

The map must span **both axes**, not one:
- **Altitudes:** architecture → module → contract → implementation.
- **Subsystems:** every component the work touches (e.g. engine, UI/UX,
  config/schema, telemetry, migration, edge-cases/failure-modes).

The trap this kills: walking one subsystem's column deeply (because its homework
was easy) and mistaking that for coverage. A map of `engine × 4 altitudes` is NOT
a map of the work if the work also has a UI, a config surface, and failure modes.
If you cannot list the nodes, the homework (step 1) is not done. If the map is so
large it can't be scanned in one view, group it hierarchically (areas → sub-areas)
and consider mapping-then-walking one area at a time — but still show the
top-level area list up front so size is honest.

### 3. Walk the map progressively, top-down — one layer per round, pruning as you go
The map is complete; the **walk is progressive**. Do not surface every leaf at
once — that drowns the user, the exact fear this guards against. Instead, each
round resolves **one coherent layer or cluster** (a handful of related nodes),
highest-altitude / highest-leverage first:

1. **Architecture level** — overall approach, what changes where, major trade-offs.
2. **Module level** — how each affected component changes.
3. **Contract level** — interfaces, data shapes, API/event/IPC contracts.
4. **Implementation level** — only the details that carry real risk or are genuinely ambiguous.

**Top-down because upstream decisions PRUNE downstream nodes.** Resolving a
high-altitude node often deletes a whole cluster below it (pick "trail UI" and
every "menu layout / menu paging" node simply never becomes a question). So:
- Walk the pruning nodes FIRST; never pre-expand a branch a pending upstream
  decision might delete (it wastes the user's attention and inflates the tree —
  see anti-pattern 5).
- Each round is therefore a **human-sized batch**, and rounds get *smaller* as you
  descend, because more is already determined above.
- After each round, redraw the map (or its open-count) so the user always sees the
  remaining `open` set shrinking toward the gate.

A "batch" is a coherent layer/cluster — neither a single trickled node (anti-pattern
4) nor the entire leaf-set at once (the drown-the-user failure). Resolve dependencies
explicitly: if D3 only matters when D1 = option A, walk D1 first and let it gate D3.

### 4. For each node, present a proposal card
```
D<n> [<level>]: <the decision>
  → Recommend: <the choice> — <one-line why>
  Alternatives considered: <X — rejected because Y>
  Assumption (unsure): <thing I assumed; correct me if wrong>   ← only if genuinely unsure
```
The user responds ok (accept) / no (reject, optionally why) / edit (rewrite the choice).

Surface the **whole current batch** (the round's layer/cluster) at once, then let
the user sweep it in one pass — not one node trickled at a time (anti-pattern 4),
and not the whole tree's leaves at once (drowns the user). The map (step 2) is what's
shown complete up front; the *proposals* arrive batched, layer by layer.

### 4b. How deep to decompose — enumerate, triage, park (the floor)

> The rule for "when is decomposition done?" — catch every open point without
> manufacturing junk. (Less battle-tested than the rest of this skill.)

The trap: **enumerating** leaves and **asking** about them are treated as one action,
so you either ask about junk (a cosmetic default presented as a question) or you skip
junk *and* silently miss a real one. **Separate them.** Enumerate exhaustively; ask
selectively.

For every leaf you can enumerate, route it to exactly one of three:

- **ASK** (surface to the user) — iff it passes the ASK-gate (any one):
  - **Fork**: more than one reasonable answer, no obvious winner (incl. "maybe we don't need it at all").
  - **Ripple**: the answer changes another decision / a contract / what another branch builds.
  - **Cost**: getting it wrong is expensive to reverse (structural, data-shape, user-facing behavior others rely on).
  - **Stake**: a product/taste call the user plausibly has an opinion on.
- **PARK + stated default** (list it, do NOT ask) — when all four miss: obvious default,
  cheap to change, no ripple, user wouldn't care.
- **PROTOTYPE** (defer to a rendered preview) — when the only open part is "what does the
  *already-agreed* thing look/feel like" (pure visual craft). Existence/behavior of a UI
  element is an ASK or PARK decision; only its pixels/feel are PROTOTYPE. Never sweep an
  existence question ("do we even need X?") into PROTOTYPE.

**The floor signal.** Keep enumerating leaves until the *new* candidates you generate
**consistently fail the ASK-gate** — i.e. they start feeling like junk (cosmetic, cheap,
no ripple). That feeling is the floor. It is NOT a signal to stop enumerating — it is the
signal to stop *asking*: enumerate down to it, PARK everything at/below it, ASK only what's
above it.

**Anti-laziness + safety valve.** PARKed leaves must be **shown** (with their defaults),
never silently dropped. This makes "I judged the rest junk" auditable: the user skims the
parked list and **pulls any item back into ASK** if a default is wrong or they actually
have a stake. So mis-triage is recoverable, and erring toward over-fine just means a
slightly longer parked list (cheap to skim) — never a silent gap.

**Bias under doubt:** if unsure whether a leaf clears the ASK-gate, **PARK it with a
visible default** — don't skip it. Over-fine is a longer parked list; too-early is a silent
hole. Prefer the former.

### 4c. Resolve at DECISION-altitude, not implementation-altitude

> The rule for *how* you resolve a node, paired with 4b's *which*
> nodes to surface.

A node has a **decision kernel** (the behavior / contract / data-shape / scope / security
posture — *what the system does*) and, below it, **code-mechanics** (the wiring that
implements that decision — *how the code is written*: which call-site, which line, which
sort, the exact enum-arm). **The walkthrough decides the kernel; code-mechanics defer to
implementation.** These are different altitudes and you must resolve at the kernel one.

- **Decide the kernel; demote pure mechanics to an explicit IMPL-NOTE.** "On the final
  keystroke the user sees exactly one Completed event" is a kernel → decide it now. "Add a
  `PartialEq` arm for the new variant" / "insert the call at line N" is mechanics → record it
  as an implementation note or acceptance criterion, NOT as an undecided fork. An impl-note
  is not a deferred decision (there's no fork) — it's a "don't forget when coding" item.
- **The failure this kills:** the agent, pulled toward code, "resolves" a node by
  **specifying the wiring** (impl-altitude) instead of the behavior (decision-altitude) —
  then (a) the real decision is still unmade, and (b) the guessed wiring is often wrong, and
  a wrong wiring-fold **spawns new holes**, so the red team's count *rises* instead of
  falling. The agent then mis-concludes "this can only be resolved by writing code" and
  tries to dispatch. That conclusion is almost always FALSE: the kernel was decidable all
  along; the agent was just resolving at the wrong altitude.
- **The test:** does the answer change *what the system does* (behavior, contract, data shape,
  scope, security)? → it's a kernel, decide it in the walkthrough. Does it only change *how the
  code is written*, the behavior being fixed? → impl-mechanics, note it and move on. "We've hit
  implementation altitude, dispatch" is a valid state ONLY when every remaining item is pure
  mechanics with its kernel already decided — never a way to escape undecided kernels.
- **Rising red team count is usually an altitude symptom, not a domain-depth fact.** Before
  concluding "the domain is just deep / needs code," check whether your own recent folds
  specified wiring instead of behavior. Re-fold them at the kernel altitude; the count should
  stop climbing.
- **Cross-walkthrough recurrence = a missing SHARED SUBSTRATE, not N independent holes.** When the
  SAME class of hole recurs across *sibling* walkthroughs/consumers (e.g. two separate gates each
  flag the same missing shared foundation),
  the signal is NOT to keep folding it into each consumer — there is an unbuilt shared foundation
  underneath them. Stop, design/build the substrate ONCE (engine, format, schema), and let each
  consumer become a thin instantiation on top. Folding the same substrate hole into every consumer
  is how you get N half-right copies and a gate that never converges.

### 5. Completeness gate — automated convergence, THEN the user's final sign-off

This gate exists to kill ONE recurring, observed failure: agents declaring "done,
let's build" after ~2 rounds while a pile of nodes are still unsettled, forcing the
user to be the completeness debugger in an endless bounce-back churn. It does **not**
rely on the agent self-judging completeness — the agent's pull toward "produce code =
progress" always wins that bet. It relies on a written ledger + an independent referee
+ a computed verdict.

**5a. The Decision Ledger — a written artifact, not a mental map.** Step 2's map is
maintained as a literal ledger in the work's **durable doc** (the task tracker / spec /
plan doc), updated every round, with a live OPEN count. It carries across sessions: the
next agent inherits "here are the still-OPEN nodes," not a decision-filled doc that merely
*looks* finished. Required shape:

```
## Decision Ledger  (OPEN: <n>)
| Dimension | Node | Status | Decision / default / why-N/A |
|---|---|---|---|
| engine/logic                      | … | decided / parked / prototype / OPEN | … |
| external contract (API/IPC/event) | … | … | … |
| data model & migration            | … | … | … |
| failure modes & edge cases        | … | … | … |
| security / abuse                  | … | … | … |
| config / schema                   | … | … | … |
| UX                                | … | … | … |
| telemetry                         | … | … | … |
| ops / infra                       | … | … | … |
```
Every dimension row must be present and non-blank — each is either enumerated (≥1
node) or explicitly `N/A: <reason>`. A whole dimension silently absent is the most
common real failure (this is how endpoint auth / hosting infra get missed); fixed
rows make that impossible to skip invisibly. Add task-specific dimensions; never
delete a required one.

**5b. The agent may NOT self-declare done.** Banned, on the agent's own authority:
"walkthrough complete" / "ready to build" / "let's fold the contract" / "all done."
Per-node ok mid-walk is progress, NOT permission to execute. When the agent *thinks*
it has hit the floor, its only move is to run the gate (5c) — never to announce
completion.

**5c. Invoke the independently owned design gate.** When every branch appears to be at its floor,
call `design-rt` with the current Ledger and the signed confirmation mode. Do not restate, narrow, or
hand-roll its rubric here. The validator owns reviewer capability, materiality, findings, fail-fast
behavior, confirmation, and fix-round cap.

- Blocking findings return as explicit OPEN Ledger nodes; fold them and continue the walkthrough
  without summoning the user.
- Blocking-clean plus Ledger OPEN == 0 satisfies the design-gate row of the Definition Receipt.
- Preserve advisory findings for final sign-off without adding them to OPEN.
- The walkthrough author cannot downgrade or override the independently returned verdict.

**5d. After design convergence, formulate BDD examples when BDD is applicable.** Invoke `bdd` in
INTEGRATED mode with the Ledger as its decision source. Invoke `bdd-rt` only when the independently
selected Definition Route turns that gate ON. If formulation returns an `UpstreamDecisionGap`, or a
BDD-gate finding identifies a missing product decision, translate that finding into the same typed gap,
reopen the Ledger, and rerun the affected design gate before formulating again.
Skip BDD or its gate independently with a stated reason when each adds no useful risk reduction.

**5e. THEN — and only then — the user is the final arbiter.** Design convergence plus BDD-gate
convergence when that gate is ON is the precondition to summon the user, not a substitute for them. Present
the full ledger and scenario trace as a report ("main + red team converged; here is the blueprint and
behavior examples — decided / parked-with-default / prototype") and ask for the final call. The user ok
(proceed to fold the contract / build) or no (they caught what the panel missed → those
nodes return to OPEN, keep walking). Because the user is summoned ONLY post-convergence,
they never see a premature "done" and never churn on half-baked claims.

- **Every "no" from the user is a red team miss → feed the missed pattern back into the
  red-team rubric** so the panel catches it next time. The loop self-sharpens.

**"Done" is a computed state, never an assertion:**
`done ≡ (ledger OPEN == 0) ∧ (the route's design-gate confirmation satisfied) ∧ (BDD artifact complete or BDD OFF) ∧ (BDD-gate confirmation satisfied or BDD gate OFF) ∧ (user sign-off)`.
No narrowness/diminishing-returns shortcut substitutes for the signed `single`/`double` confirmation.

Once done, emit the **Signed Definition Bundle**. Its execution contract is a structured plan doc
carrying the locked decisions plus the four execution-safety sections (Commands, Open Assumptions,
Stop Conditions, Parked Decisions). It also contains this minimal receipt:

```text
Definition Receipt
- walkthrough: ON
- Decision Ledger: complete
- design gate: single|double confirmed
- BDD invocation: INTEGRATED | N/A
- BDD tooling: OFF | FORMULATION_ONLY | EXECUTABLE
- BDD artifact + AC trace: <location or N/A>
- BDD gate: single|double confirmed | OFF + reason
- user sign-off: approved
```

The receipt lets an outer caller treat nested stations as already satisfied instead of invoking them
again. It is deliberately not a speculative schema/hash framework; if a decision reopens, mark the
affected receipt row stale, rerun that portion of the composite, and report the denominator change.
Execution then runs silently per the work mode.

> Rationale: this gate guards against an agent declaring done after ~2 rounds with nodes still
> unsettled (which forces a human to become the completeness debugger); a prose-only gate does
> not bind. The **anti-leak discipline** (scope-in floor + coverage-preserving lane-partition,
> not exclusion + resolved-set-as-reference + no-downgrade rule + banned narrowness shortcut +
> signed confirmation bar that self-heals bad folds + human as single end-of-gate sign-off) guards
> against a biased main agent controlling BOTH the red team's scope-in AND its
> verdict-interpretation, which would defeat independence from both ends.

## Anti-patterns (these are the whole point)

### Anti-pattern 1 — Manufacturing questions
Inventing questions that have obvious or repo-derivable answers, just to look
thorough. If you find yourself asking something you could answer by reading three
files, **read the three files**.

### Anti-pattern 2 — Questions without a recommendation
Every surfaced node carries your recommended answer. A bare "what do you want?"
is offloading your thinking onto the user. Banned.

### Anti-pattern 3 — Missing the load-bearing decision
The opposite failure: glossing over the one choice that actually shapes everything
(the architecture fork, the irreversible migration) while sweating trivia. Lead
with the highest-altitude, highest-impact decisions.

### Anti-pattern 4 — One question at a time
Trickling questions serially fragments the user's time — the exact thing the work
mode exists to prevent. Batch the tree; let the user sweep it in one pass.

### Anti-pattern 5 — Walking forever
The walkthrough is time-boxed and terminates in a signed contract. If a node can
be a conservative default + a parked decision instead of a question, prefer
that — don't expand the tree to look diligent.

### Anti-pattern 6 — Partial-walk-as-whole (the load-bearing one)
Surfacing the legible slice of the tree — usually the subsystem whose homework was
easiest — getting it ok'd, and treating that approval as completion. Then drifting
into "ready to fold the contract / start building" while whole branches (UI/UX,
edge cases, telemetry, config surface) were never even listed. This is the failure
the step-2 map and the step-5 gate exist to prevent: if the full map is drawn first,
a partial walk is *visibly* partial — to both you and the user. The agent's pull
toward "produce code = progress" will keep re-reading a few ok's as a green light;
the map + gate are the counterweight. Symptom to self-check: "Can I name every node
still open?" If you can't, you haven't mapped — you've sketched. But the self-check
is only a trigger, NOT the safeguard: the independent red team panel (the red-team gate) is what
actually enforces completeness, because the same bias that produced the partial walk
also corrupts the self-check.

## Parallel fan-out (round-robin) — optional, for large multi-subsystem work

> **Less battle-tested — default to serial.** Use this only when a walkthrough
> is large enough that the user idling during homework is real waste AND the work
> splits into genuinely independent subsystems.

**Goal:** hide homework latency. The human stays a serial consumer but rotates
across N agents — each hands a *small* chunk, the user decides, that agent goes to
compute, the user turns to the next ready agent. Producer-parallel, consumer-serial,
never idle. (NOT "the human thinks about N things at once.")

**Structure: serial trunk → parallel branches.** The tree prunes top-down, so the
trunk (cross-cutting decisions) MUST be walked serially first; only then are the
branches independent enough to fan out.

**Partition mechanically, not by gut (answers "how much / when to split"):**
- On the step-2 map, annotate every node: *"if this decision flipped, which branches
  must redo work?"* Affects **>1 branch → trunk** (decide serially). Affects **≤1 →
  branch-internal** (fan-out candidate). Show the annotations; the user eyeballs them
  — the partition is a reviewable artifact, not an agent's hunch.
- **Fan-out trigger is dependency-cone closure, per branch, not a global "trunk done"
  timer.** Fan out branch B the moment every trunk node that affects B is `decided` —
  even if other branches' premises aren't settled yet.
- Guard **too-late** (one agent draws the whole tree): trunk decides ONLY cross-cutting
  nodes; the instant a node is branch-internal, trunk must hand it off, not decide it.
- Guard **too-early** (fan out onto unstable ground): a branch is eligible only when its
  cone is provably closed; if a "decided" trunk node later reopens, re-converge via the
  escalation channel.

**Context handoff to a fresh agent (possibly a different tool):** the medium is
**files, never conversation history** — a self-contained branch brief (whose format
mandates self-containment). **Inline the premises** (locked trunk decisions, branch
scope, branch-relevant homework with file:line, conventions, the "don't decide
cross-cutting — escalate" rule); do not just link, a fresh/cross-tool agent may not
chase links.

**The fresh-agent handshake validates fan-out-readiness AND context completeness at
once:** on spawn, the branch agent reads the brief and **echoes back** its restated
goal, the premises it's relying on, and any cross-cutting unknowns. Clean echo →
fan-out confirmed (trunk was ready, context transferred). An echo that surfaces a
cross-cutting unknown → that node belongs in the trunk: pull it back, decide it,
update the brief, re-handshake.

**Round-robin mechanics (client-dependent):** use whatever the client offers to surface
**per-agent readiness** (a "needs input" signal) so the user round-robins without blind
polling, with a way to peek a branch's chunk + reply inline or attach to the full
session. Cross-tool branches (different agent runtimes) typically have **no** native
coordination — files/git are the only bridge, so keep cross-tool handoff strictly
file-based. (The concrete per-client mechanism lives in that client's binding.)

**Close the same way:** a coordinator runs the step-5 completeness gate across ALL
branch fragments together (catching cross-branch seams), then folds the single
execution contract.

**Residual risk (acknowledged, not eliminable):** a mis-annotated dependency (a
cross-cutting node mislabeled branch-internal) causes a branch to decide something that
later conflicts → escalation + the coordinator gate contain it, but some rework is
irreducible. Fan out only cleanly-separable branches; when in doubt, keep it in the
trunk.

## Relationship to the work mode

- **Output** → a Signed Definition Bundle: execution contract + Definition Receipt + applicable
  behavior scenarios and AC trace.
- **Standalone parity** → direct invocation and `the-line` invocation produce the same bundle; an
  outer route consumes the receipt and never repeats satisfied nested stations.
- **Followed by** → silent execution, then review (Briefing → Silent → Review).
- **Replaces** → an older interrogation-style approach.
- **The design gate** → the referee for this walkthrough is the independently owned `design-rt`
  skill (it instantiates the shared `red-team-gate` engine with the design rubric; this walkthrough's
  Ledger is its oracle). The composite invokes it but cannot author or override its verdict.
- **Sibling gates** → the same engine runs the **test gate** (`test-rt`), **code gate**
  (`code-rt`), and user-facing **acceptance gate** (`accept-rt`) at later per-mission stages.
