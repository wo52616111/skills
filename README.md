# Composable skills for disciplined agent delivery

A collection of plain-Markdown agent skills for selecting the shortest sufficient path from clarification through implementation and review. The skills can be installed together as an adaptive delivery flow or used independently.

The core rule is simple: the author does not declare its own work complete. Important artifacts are checked by a fresh, sufficiently capable reviewer, and the user remains the final sign-off.

## Adaptive pipeline

When walkthrough is ON, it is a transparent composite Definition function:

```text
walkthrough[
  decision discovery/resolution
  -> design gate
  -> BDD formulation when useful
  -> BDD gate when independently ON
  -> user sign-off
]
-> Signed Definition Bundle
-> split into durable missions when useful

per mission:
  tdd when useful
  -> test gate when TDD is on
  -> coding
  -> code gate
  -> prove-done
  -> acceptance gate when user-facing
  -> done
  -> user review
```

When walkthrough is OFF, BDD may still run in STANDALONE mode against an explicit stable behavior
contract. The outer route consumes the Definition Receipt and never repeats nested stations already
completed by walkthrough.

This is a catalog of possible stations, not a mandatory checklist. A straightforward bug may skip
walkthrough and BDD; a copy-only edit may skip every semantic gate and use only a minimal render/lint
check. Every station is independently ON/OFF with a reason.

If an acceptance-gate finding changes the artifact, rerun affected stations that were already ON:

```text
[affected code/evidence stations that were ON]
-> [newly applicable stations if risk/contracts/tooling changed]
-> acceptance gate
```

This prevents stale evidence without activating unrelated stations. Recalculate the route when the fix
changes risk, contracts, or tooling, and record any denominator change and its reason.

## Skills

| Role | Skill | Purpose |
|---|---|---|
| Orchestrator | `the-line` | Selects the route and composes capabilities with light conditions; it does not duplicate nested skill logic. |
| Composite Definition | `walkthrough` | Maps and resolves the decision tree, invokes independent Definition validators and applicable BDD, obtains sign-off, and returns a Signed Definition Bundle. |
| Design gate | `design-rt` | Checks the Decision Ledger for missing, over-parked, or weakly dismissed decisions. |
| Behavior formulation | `bdd` | Turns agreed behavior into concrete observable examples using Discovery, Formulation, and Automation boundaries. |
| BDD gate | `bdd-rt` | Reviews formulated examples for coverage, concreteness, observable outcomes, contradictions, and automation viability. |
| BDD setup | `bdd-setup` | Explicitly installs and proves the project-specific Cucumber toolchain; never runs automatically. |
| Execution carrier | `mission` | Stores one durable unit of work, its acceptance criteria, station route, safety rules, verification, and review result. |
| Test strategy | `tdd` | Enables TDD when its quality benefit exceeds its cost and bounds unproductive retry loops. |
| Test gate | `test-rt` | Reviews pre-implementation tests against signed acceptance criteria and verifies that Red is genuinely Red. |
| Code gate | `code-rt` | Reviews the finished diff for correctness, contract, regression, security, observability, and explicit preference violations. |
| Verification | `prove-done` | Requires evidence that changed behavior reaches real contract boundaries and works beyond isolated unit tests. |
| Acceptance gate | `accept-rt` | Reviews a user-facing result for coherence, usability, integration, completeness, and preventable first-use problems. |
| Work log | `wip` | Maintains a durable, resumable progress record across sessions. |
| Specification | `sdd` | Structures specifications into a small entrypoint plus on-demand component and research layers. |

Skills remain independently owned capabilities, but they need not all be leaf functions. A transparent
composite may invoke another skill while preserving that skill's rubric, reviewer independence,
findings, effects, and result. `the-line` selects routes; it does not absorb domain-specific logic.

## Reviewer independence

Every gate pass runs in a fresh context or session. The reviewer must have the tools and reasoning capability required by the rubric.

A different model or agent client is optional diversity, not a requirement. Use one only when it is comparably capable or better, reliable for the artifact, and worth the cost. Never downgrade reviewer quality merely to make two passes heterogeneous. A capable same-model reviewer in a fresh context is a fully supported path.

## Gate protocol

The optional shared engine in `engine/red-team-gate.js` implements the common gate protocol:

- A blocking failure is trusted after one pass and returns immediately.
- Gate routes choose `single` or `double` clean confirmation. Existing callers default to `double`.
- Adaptive low/medium-risk routes use `single`; high-risk and hard-line routes use `double`.
- Advisory findings remain visible but never block convergence.
- Every finding carries an explicit boolean `blocking` field.
- Custom finding schemas declare stable `identityFields` so deduplication cannot hide or contradict findings.
- Empty rubrics, malformed schemas, missing identity values, runner failures, and protocol mismatches fail closed.
- The reviewer red-teams the artifact; it never replaces user sign-off.

The engine is an optional accelerator. Each gate skill contains enough rubric and procedure to run manually with another agent primitive.

## When each station applies

| Station | Runs when | Skips when |
|---|---|---|
| `walkthrough` | Meaningful user/product/design/architecture decisions remain | Requirements and constraints are explicit enough to execute without user decisions |
| `design-rt` | A walkthrough Decision Ledger needs independent completeness validation | Walkthrough is off; structurally unavailable |
| `bdd` | Concrete examples clarify domain rules, journeys, state transitions, failures, or cross-system behavior | Mechanical/internal work or an explicit behavior better expressed by a direct test |
| `bdd-rt` | BDD is on, scenarios are ready, and independent review materially reduces behavior-contract risk | BDD is off, or direct sign-off is sufficient for an explicit low-risk scenario set |
| `bdd-setup` | The user explicitly asks to initialize executable BDD/Cucumber tooling | Normal delivery routing; missing tooling never auto-installs it |
| durable `mission` | Cross-session durability, delegation, multiple slices, or formal review value justify a carrier | Small same-session work does not benefit from durable overhead |
| `tdd` | Expected quality benefit exceeds implementation and maintenance cost | Tests would add more friction than confidence |
| `test-rt` | TDD is on and a cohesive test cluster is ready before implementation | TDD is off |
| `code-rt` | The diff has material correctness/contract/regression/security risk | Mechanical work or a tiny explicit change whose targeted checks close realistic risk |
| `prove-done` | A coding deliverable crosses behavior/runtime boundaries and approaches completion | No behavior/runtime deliverable is being claimed complete |
| `accept-rt` | A human-driven surface has material first-use risk | Internal work or a directly verifiable low-risk presentation-only change |

When a durable mission is used, it records the complete station route. Without a mission, the current
task plan records the same ON/OFF reasons compactly. Durability is optional; route honesty is not.

## Safe pipeline parallelism

Independent work may use one author lane plus one background gate lane when the host supports it.
Parallel work requires dependency, write, contract, and runtime-resource isolation plus an immutable
review snapshot. Same-artifact confirmation passes stay sequential.

Composition does not trigger a duplicate full review:

- `isolated`: combined build/affected tests only;
- `interaction-risk`: one narrow review of behavior created by composition;
- `coupled`: batch before review and run one cohesive gate.

Review each behavior once; after composition, review only behavior created by the composition.

## Bounded progress

Every batched station reports a denominator: decision nodes resolved/total, ACs represented/total,
TDD clusters complete/total, missions done/total, gate fix-round/cap, or verification dimensions/5.
If the total grows, the update states the old total, new total, and why. A sequence of decision batches
must never feel unbounded to the user.

## Honest runtime limits

Static review is not live acceptance. When a path requires a real launch, upgrade, device, browser interaction, or external environment, the reviewer must label that path unverified.

Startup, first-upgrade, data-loss, security, and primary-interaction paths block when failure would make the result unusable or unsafe. Lower-risk runtime-only checks are handed to the user as explicit verification steps.

## Install

These skills follow the open `skills` CLI repository layout.

```bash
# Replace OWNER with the GitHub account or organization hosting this repository
# Install the complete collection into the current project
npx skills add OWNER/skills

# Install one skill
npx skills add OWNER/skills --skill code-rt

# Install globally
npx skills add OWNER/skills -g

# Select a target agent
npx skills add OWNER/skills -a claude-code

# Preview the available skills
npx skills add OWNER/skills --list
```

The CLI installs the `skills/<name>/SKILL.md` directories. The shared engine is separate because workflow-script installation is client-specific.

## Manual installation

Copy any directory under `skills/` into the skill directory used by your agent. A single skill remains readable and usable on its own; references to sibling skills describe optional composition points.

The gates do not depend on the engine. Every `*-rt` skill carries its own full rubric, so the portable way to run one is to hand that rubric to fresh reviewer contexts yourself and apply the route's signed `single` or `double` confirmation by hand.

`engine/red-team-gate.js` automates that loop, but it is **not a standalone program** and `node engine/red-team-gate.js` will not run it. The file is a workflow-script *body*: it uses top-level `return`, and it expects its host to supply `args` along with three functions — `agent(prompt, options)`, which spawns an independent reviewer context and returns its structured result, plus `phase()` and `log()` for progress reporting. This repository does not specify that host API, so unless your client already exposes that exact contract, read the engine as a reference implementation of the convergence loop rather than as something you can drop in.

## Durable files

The methodology uses ordinary files and does not require a particular backend. A standalone project can use:

```text
.workflow/
  wip/
  specs/
  missions/
```

A local integration may map these roles to another task tracker, specification store, or mission system. The public skills describe roles and contracts rather than depending on one private tool.

## Repository layout

```text
skills/
  accept-rt/SKILL.md
  bdd/SKILL.md
  bdd-rt/SKILL.md
  bdd-setup/SKILL.md
  code-rt/SKILL.md
  design-rt/SKILL.md
  mission/SKILL.md
  prove-done/SKILL.md
  sdd/SKILL.md
  tdd/SKILL.md
  test-rt/SKILL.md
  the-line/SKILL.md
  walkthrough/SKILL.md
  wip/SKILL.md
engine/
  red-team-gate.js
README.md
LICENSE
```

## Public release safety

A release should pass three gates before it is pushed publicly:

1. Deterministic scan: block secrets, private identifiers, internal paths, and symlinks before copying anything.
2. Semantic purity review: inspect the complete diff plus every untracked release file for contextual or narrative leaks that a denylist cannot recognize.
3. Human review: read the final public diff and perform the irreversible push manually.

The public repository is a one-way release mirror. Private bindings, machine-specific runners, credentials, internal paths, and personal work context do not belong here.
