---
name: the-line
description: >-
  Adaptive software-delivery route planner. Selects the shortest sufficient path from optional
  stations: walkthrough, design gate, BDD, BDD gate, durable missions, TDD, test gate, coding,
  code gate, prove-done, acceptance gate, and review. No station is mandatory merely because it
  appears in the catalog. Uses risk, uncertainty, reversibility, and verification ROI to turn
  stations ON/OFF with explicit reasons; supports a hard-line mode and safe author/reviewer
  pipeline parallelism for demonstrably independent work.
---

# The Line: shortest sufficient delivery route

## The fixed order

For non-trivial logic the sequence is fixed and is not a menu:

1. **TDD** — tests FIRST, before implementation.
2. **test gate** (`test-rt`) — red-team the tests while implementation does not exist yet.
3. **coding** — implement against those tests.
4. **code gate** (`code-rt`) — red-team the implementation.

Writing code before the tests, or running the code gate in place of the test gate,
is not a lighter version of this — it removes the only point where the tests can still
be judged on their own merits rather than on whether they happen to pass.

## Core rule

`the-line` is a **dynamic route planner**, not a fixed ceremony checklist.

> Use every station that materially reduces uncertainty or delivery risk, and skip every station
> whose cost exceeds its value for this task.

No station is mandatory merely because the task triggered `the-line`. A route may be long for an
ambiguous, high-risk product change or only `edit -> targeted check -> review` for explicit low-risk
work. Every ON/OFF decision is visible with a reason; nothing is silently skipped or mechanically
forced.

## Route shapes

### Full behavior route

When walkthrough is ON, it owns one transparent composite Definition call:

```text
walkthrough[
  decision discovery/resolution
  -> design-rt
  -> bdd Formulation when useful
  -> bdd-rt when independently ON
  -> user sign-off
]
-> Signed Definition Bundle
-> split into durable missions when useful

per mission or direct execution slice:
  tdd
  -> test-rt
  -> coding
  -> code-rt
  -> prove-done
  -> accept-rt when user-facing
  -> review
```

When walkthrough is OFF but examples remain useful, use the standalone Definition path:

```text
explicit stable behavior contract
-> bdd STANDALONE
-> bdd-rt when independently ON
-> user sign-off
-> execution
```

### Straightforward bug fixes

```text
explicit bug contract
-> targeted regression tests when useful
-> coding
-> targeted checks
-> code-rt only when the change carries material correctness/contract risk
-> review
```

Two explicit error-code mappings do not require a walkthrough or BDD merely because there are two
changes. Their route depends on ambiguity, coupling, and regression risk, not item count.

### Copy or mechanical work

```text
edit
-> minimal render/lint/diff check
-> review
```

Walkthrough, BDD, TDD, test gate, code gate, and acceptance gate are OFF unless the change introduces
behavior that makes one independently useful.

## Definition ownership and no duplicate invocation

`the-line` selects the Definition Route but does not reimplement it. When walkthrough is ON, pass its
ON/OFF and confirmation decisions into the walkthrough composite. Consume the returned Definition
Receipt and treat every confirmed nested row as satisfied: never invoke design-rt, BDD, BDD gate, or
sign-off a second time merely because those stations also appear in the catalog.

When walkthrough is OFF, `the-line` may invoke BDD in STANDALONE mode against an explicit stable
contract, followed by `bdd-rt` when independently ON and then sign-off. This is a separate route,
not a fallback discovery workshop.

The line therefore uses light composition semantics:

```text
maybe(walkthrough composite)
|> ensure(Definition Receipt)
|> maybe(mission)
|> implementation route
```

`ensure` means "run only the missing or stale portion." If a decision reopens, invalidate the affected
receipt rows and route that portion through its owner; do not replay the whole Definition pipeline by
default.

## Applicability decisions

Evaluate every station independently for applicability. Invocation ownership may be nested: when
walkthrough is ON it invokes the applicable Definition stations as one transparent composite. The line
aggregates ON/OFF decisions; each station's own skill still owns its detailed rubric and result.

| Station | ON when | OFF when |
|---|---|---|
| `walkthrough` | Meaningful product/design/architecture forks, unclear requirements, expensive decisions, or user taste must be settled | The behavior and implementation constraints are explicit enough to execute without user decisions |
| `design-rt` | A walkthrough produced a Decision Ledger | No walkthrough/Decision Ledger exists; slaved OFF |
| `bdd` | Concrete examples materially clarify domain rules, journeys, state transitions, failures, or cross-system behavior | Mechanical/internal work or an explicit behavior that a direct test communicates better |
| `bdd-rt` | BDD is ON, a cohesive scenario set exists, and independent review materially reduces behavior-contract risk | BDD is OFF, or the scenario set is explicit/low-risk enough that direct sign-off provides sufficient evidence |
| durable `mission` | Cross-session durability, delegated execution, multiple slices, or a formal review gate is valuable | Small same-session work can be executed safely without a durable carrier |
| `tdd` | Its regression/logic/verification benefit exceeds setup/runtime/instability cost | Tests add more friction than confidence or the work has no durable behavior |
| `test-rt` | TDD is ON and a cohesive Red test cluster is ready | TDD is OFF; slaved OFF |
| `code-rt` | The diff has material correctness, contract, regression, security, data, concurrency, or explicit-preference risk | Copy/docs/format/mechanical work, or a tiny explicit change whose targeted checks close the realistic risk |
| `prove-done` | A coding deliverable crosses a behavior/runtime contract and is approaching completion | No coding deliverable is being claimed complete, or only mechanical/document content changed |
| `accept-rt` | A user-facing interaction/surface has enough first-use risk to justify holistic pre-handoff review | Internal work, pure copy/visual adjustment with adequate direct validation, or no human-driven surface |
| user review | The user requested review or a durable mission/change is being handed back | A purely internal automated substep is not yet ready for handoff |

Station count, file count, or the phrase "non-trivial" alone never decides the route. Judge:

- decision uncertainty;
- observable behavior complexity;
- contract and integration reach;
- failure impact and reversibility;
- quality evidence already available;
- station cost relative to expected risk reduction.

## Tool-awareness and no implicit installation

The line inspects existing project-local tooling but never installs a BDD or test framework merely to
turn a station ON.

- Existing BDD runner -> `bdd` may use EXECUTABLE mode.
- No BDD runner + examples still valuable -> FORMULATION_ONLY, or BDD OFF when examples add little.
- No test harness -> TDD OFF and test-rt OFF unless the user separately authorized setup.
- An explicit "initialize BDD/Cucumber" request routes to `bdd-setup`; `bdd-setup` is infrastructure
  setup, not an automatic station in the delivery route.

Never make dependency installation a hidden cascade from a hard-line pin.

## Modes

### Adaptive line (default)

Propose the shortest sufficient route with every station ON/OFF and one concrete reason. Low- and
medium-risk gates use `confirmation: single`; high-risk gates use `confirmation: double`.

### Hard line

Turn every **applicable** station ON and use `confirmation: double` for every gate. Structural
preconditions still apply: hard line cannot create a Decision Ledger when no decision work exists,
invent BDD behavior for a rename, or create meaningful Red tests for copy-only work.

### Explicit override

The user may pin a station ON/OFF at sign-off. A pin that conflicts with a structural prerequisite
is explained and rejected or cascade-enables the prerequisite only when that prerequisite was
discretionarily OFF. Reconciliation happens before silent execution, never as a mid-run interruption.

## Risk and confirmation

Gate confirmation is separate from station applicability.

**High risk -> double confirmation:**

- security, auth, payment, privacy, or destructive actions;
- data migration/loss, first upgrade, startup, or core command path;
- cross-service schemas/contracts;
- concurrency or distributed state;
- broad state-machine rewrites or expensive-to-reverse decisions.

**Low/medium risk -> single confirmation:** one fresh blocking-clean reviewer is sufficient.

Any blocking failure returns after one reviewer regardless of risk. Same-artifact confirmation passes
are always fresh and sequential; two simultaneous reviews never count as consecutive confirmation.

## Materiality bar

A finding blocks only when it supplies all of:

1. a concrete failure scenario;
2. the affected acceptance criterion, contract, user behavior, or safety property;
3. artifact/source/runtime evidence;
4. the real cost of leaving it unfixed.

Speculation, optional robustness, naming, organization, symmetry, prose preference, and unsigned
extra scope are advisory or omitted. Collapse findings with the same root cause. The gate is not a
license to search indefinitely for cosmetic improvements.

## BDD and TDD boundary

- `walkthrough` owns most BDD Discovery when Discovery is needed.
- `bdd` owns behavior-example Formulation.
- `bdd-rt` gates those examples before sign-off/automation.
- `tdd` owns Automation and inner Red -> Green -> Refactor cycles.
- `test-rt` gates actual tests, not Gherkin wording.

BDD and TDD are independently applicable. BDD ON does not force unit-level TDD; TDD ON does not force
Gherkin when the behavior is already unambiguous.

## Safe pipeline parallelism

Parallelism optimizes wall-clock latency, not reviewer token cost. Use it only when work is genuinely
independent and the review artifact is immutable.

```text
Author lane:  coding A -> coding B -> fix A if needed -> ...
Gate lane:               code-rt A -> code-rt B -> ...
```

Before overlapping work, record:

```yaml
depends_on: []
write_scope: []
contract_scope: []
shared_resources: []
gate_snapshot: <immutable reference>
integration_mode: isolated | interaction-risk | coupled
```

Parallel eligibility requires all of:

1. **Dependency isolation** — B does not depend on A's unconfirmed result.
2. **Write isolation** — no shared files, generated artifacts, lockfiles, or migration outputs.
3. **Contract isolation** — no shared API, schema, event, state machine, or behavior rule.
4. **Runtime isolation** — tests do not collide through databases, ports, fixtures, devices, or global state.
5. **Immutable snapshot** — the reviewer reads/runs a frozen worktree or equivalent snapshot, never a
   working tree that the author continues to modify.
6. **Cheap invalidation** — an A blocker cannot make substantial B work worthless.

Default concurrency cap: **one author lane + one gate lane**. Use host background agents only when the
client supports them. Otherwise fall back to sequential execution; never pretend concurrency occurred.

## Composition without duplicate review

> Review each behavior once. After composition, review only behavior created by the composition.

Choose before parallel execution:

### `isolated`

A and B have no meaningful interaction surface. Run individual gates as applicable, then combined
build/affected tests. Do not run another semantic combined gate.

### `interaction-risk`

A and B are independently reviewable but may interact at a narrow boundary. After individual gates,
run deterministic combined checks plus one **integration-focused** review of only contract collision,
shared state, ordering, merge-created paths, and combined user behavior. It must not reopen local A/B
issues. Use double confirmation only when the interaction itself is high risk.

### `coupled`

A and B share a contract/state machine/user journey strongly enough that separate reviews would be
duplicative. Do not pipeline them as independent artifacts. Build a cohesive batch and run one gate.

If an A finding changes a contract B relies on, stop or invalidate B and recompute the route.

## Durable route record

When a durable mission is ON, its contract records:

- each station ON/OFF and reason;
- gate confirmation (`single`/`double`) and risk reason;
- the Definition Receipt when walkthrough was ON (Decision Ledger, design gate, BDD mode/artifact,
  AC trace, BDD gate, and user sign-off status);
- standalone BDD AC -> scenario trace when walkthrough was OFF and BDD was ON;
- parallel eligibility fields and integration mode;
- invalidation/loop rules.

When a mission is OFF, keep the same route compactly in the current task plan or handoff. Durability is
optional; explicit reasoning is not.

## Bounded progress for every batched station

Any station that emits work in batches or rounds must expose a denominator before or with its first
batch. Every update reports `completed/total`, current batch/round, and what remains.

| Station | Progress signal |
|---|---|
| walkthrough | resolved decision nodes / mapped total, plus batch index |
| BDD | ACs represented / applicable ACs, scenarios formulated / planned scenarios |
| BDD/test gate | fix round / cap, open blockers, confirmation pass when double |
| TDD | completed cohesive clusters / planned clusters, ACs automated / applicable ACs |
| missions | done / total missions, with blocked/open counts |
| code/acceptance gate | fix round / cap, open blockers, confirmation pass |
| prove-done | verified dimensions / 5 and remaining `[c]` items |

If the denominator changes, report the old value, new value, delta, and discovery reason. Do not emit
an apparently endless sequence such as D1-D5 followed by unannounced D6-D10 batches. When no honest
exact denominator exists yet, use a bounded estimate and name the event that will make it exact.

## Revalidation loops

- BDD reveals a decision gap -> reopen walkthrough/decision source -> design gate when applicable ->
  reformulate -> bdd-rt.
- `test-rt` changes tests -> rerun the affected Red evidence before coding.
- `code-rt` fix changes behavior -> rerun affected tests and code gate according to route risk.
- `accept-rt` fix changes the artifact -> rerun affected stations that were previously ON, then
  acceptance gate. Recalculate the route when the fix changes risk, contracts, or tooling: activate a
  newly applicable station only for that new scope, and record why the denominator changed.
- Pure documentation clarification that does not change the reviewed contract does not invalidate code
  or runtime evidence.

## Spoken labels

Say `design gate`, `BDD gate`, `test gate`, `code gate`, and `acceptance gate`. Write "red team" in
full in user-facing prose. The engine identifier remains `red-team-gate`.

## Final route examples

```text
Copy edit:
walkthrough OFF -> BDD OFF -> TDD OFF -> edit -> lint/render check -> review

Explicit low-risk bug:
walkthrough OFF -> BDD OFF -> TDD AUTO/ON -> test gate single -> coding
-> code gate single when risk warrants -> targeted verification -> review

Ambiguous high-risk payment flow:
walkthrough[design gate double -> BDD INTEGRATED -> BDD gate double -> sign-off]
-> Signed Definition Bundle -> missions -> TDD -> test gate double -> coding
-> code gate double -> prove-done -> acceptance gate double -> review
```
