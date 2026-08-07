---
name: bdd
description: >-
  Risk-aware Behaviour-Driven Development for turning agreed requirements into concrete,
  observable examples before implementation. Uses the Cucumber BDD practices of Discovery,
  Formulation, and Automation without forcing Gherkin onto work that has no meaningful behavior
  ambiguity. Use in INTEGRATED mode inside a walkthrough Definition composite or in STANDALONE mode
  from an explicit stable behavior contract when domain rules, journeys, state transitions, or
  cross-system behavior benefit from concrete examples.
---

# BDD: concrete behavior before implementation

## Goal

Use concrete examples to remove behavior ambiguity before code and tests harden the wrong contract.
BDD is not "write Cucumber tests after coding". It is a collaboration loop:

1. **Discovery** — discuss real examples to expose rules, boundaries, and unanswered questions.
2. **Formulation** — write agreed examples as precise, observable scenarios that can be automated.
3. **Automation** — implement the behavior, beginning with an automated test that guides the code.

Within `the-line`, `walkthrough` owns most Discovery, this skill owns Formulation, and `tdd` owns
Automation plus the inner Red -> Green -> Refactor cycles.

## Applicability

BDD is independently ON/OFF. The existence of a walkthrough, mission, or TDD route does not force it.

**Enable BDD when concrete examples materially clarify:**

- user journeys or business/domain rules;
- state transitions, permissions, or failure recovery;
- cross-service or producer/consumer behavior;
- several reasonable interpretations of an acceptance criterion;
- important boundaries where examples communicate better than abstract prose.

**Skip BDD when it would manufacture ceremony:**

- copy, documentation, formatting, or mechanical rename work;
- internal refactors with intentionally unchanged observable behavior;
- build/tooling repairs whose expected result is already explicit;
- pure visual styling with no interaction or state behavior;
- a small, fully specified change where one direct test communicates the contract better.

Record `BDD ON/OFF + reason`. "The line contains BDD" is never a reason to turn it on.

## Inputs

- Confirmed acceptance criteria.
- Relevant Decision Ledger entries when a walkthrough ran.
- Existing behavior and constraints verified from source when the scenarios depend on them.
- Product language used by the people who will read the behavior.

If no walkthrough ran, the task must still have an explicit, stable behavior contract. If examples
expose a real unresolved fork, stop formulation and return an explicit `UpstreamDecisionGap`; BDD
must not silently invent product policy or start a second untracked discovery process.

## Invocation modes

### INTEGRATED

Called by the `walkthrough` Definition composite with a Decision Ledger, acceptance criteria, and
behavioral rules/example seeds. In this mode:

- Discovery is already owned by walkthrough; do not repeat it.
- Do not revisit or override a signed decision.
- Formulate the smallest scenario set and AC trace from the supplied behavior.
- If a required observable rule is missing, return `UpstreamDecisionGap { node, missing_behavior,
  required_by }`; walkthrough reopens that node, reruns the affected design gate, then invokes BDD again.

### STANDALONE

Called when walkthrough is OFF because an existing specification already provides a stable behavior
contract. Use concrete examples to clarify that contract, but do not manufacture product policy. A
real fork still returns `UpstreamDecisionGap` to the user/decision source.

Both modes produce the same behavior artifact and can be gated by `bdd-rt`. Mode describes provenance,
not a different quality bar.

## Formulation rules

Each scenario describes behavior from outside the implementation:

```gherkin
Feature: Retry a failed payment

  Scenario: Retry succeeds with a valid payment method
    Given a payment previously failed
    When the customer retries with a valid payment method
    Then the payment is completed
    And the order is ready for fulfillment
```

Prefer:

- one meaningful behavior per scenario;
- concrete preconditions and examples;
- one primary action in `When`;
- outcomes observable by a user or system boundary in `Then`;
- domain language rather than code vocabulary;
- the smallest set of examples that distinguishes the agreed rules.

Avoid:

- function/class/module names, mocks, repository calls, or database implementation steps;
- UI click-by-click scripts when the behavior is the real contract;
- generic statements such as "works correctly";
- exhaustive permutations with no distinct rule;
- adding scenarios for speculative requirements the user did not sign;
- automating scenarios only after implementation and calling that BDD.

## Tooling modes

`bdd` never installs dependencies. Detect the current project capability:

- **EXECUTABLE** — a compatible project-local Cucumber/Gherkin runner already exists; write real
  `.feature` artifacts and declare the runner command.
- **FORMULATION_ONLY** — examples materially reduce ambiguity but no executable runner exists; keep a
  scenario catalog, state that Automation is not enabled, and do not let `bdd-rt` pretend steps ran.
- **OFF** — examples add insufficient value, or the task is mechanical/explicit enough to proceed
  directly.

If the user explicitly asks to initialize tooling, route that separate request to `bdd-setup`. BDD ON
or the-line activation never authorizes installation.

## Artifact choice

Use a real `.feature` file when the project already executes it with Cucumber or another Gherkin runner.
Otherwise keep a **scenario catalog** in the signed specification or mission contract. Do not create
dead `.feature` files that pretend to be living documentation but never run.

Every artifact maintains a compact trace:

```text
acceptance criterion -> scenario(s) -> automation owner
```

The automation owner may initially be `pending`; it must resolve during TDD/implementation before
handoff if the scenario is part of the executable contract.

For batched formulation, report `ACs represented / applicable ACs` and `scenarios formulated /
planned scenarios` with every batch. If examples reveal new applicable behavior, update the denominator
explicitly and state why.

## Relationship to TDD

BDD and TDD operate at different zoom levels:

- **BDD scenarios** define externally observable behavior and examples.
- **TDD tests** provide fast implementation feedback for the units and integrations needed to make
  a scenario pass.
- The first outer Red may be the executable BDD scenario. Inner TDD micro-cycles then implement it.
- `test-rt` checks actual pre-implementation tests. It does not re-litigate scenario wording already
  gated by `bdd-rt`.

BDD does not replace TDD, and TDD must not copy every Gherkin sentence into duplicate low-value tests.

## Workflow

Integrated Definition route:

```text
walkthrough discovery/resolution
-> design gate
-> BDD Formulation (INTEGRATED; no repeated Discovery)
-> bdd-rt when independently ON
-> user sign-off
```

Standalone route:

```text
explicit stable behavior contract
-> BDD Formulation (STANDALONE)
-> bdd-rt when independently ON
-> user sign-off
```

If formulation or `bdd-rt` reveals a missing product/design decision:

```text
UpstreamDecisionGap -> reopen decision source -> design gate when applicable -> reformulate -> bdd-rt
```

Do not continue into TDD against a scenario whose underlying decision is still open.

## Proportionality examples

**Domain behavior:** subscription cancellation has immediate/end-of-cycle rules -> BDD ON.

**Two explicit error-code mappings:** no meaningful product fork, direct targeted tests suffice ->
walkthrough OFF, BDD OFF; TDD/code gate are decided independently by risk.

**Copy-only change:** no behavior contract -> BDD OFF, TDD OFF, code gate OFF; edit + minimal render or
lint check is sufficient.

## Output contract

Before `bdd-rt` when that gate is ON, or before direct sign-off when it is OFF, provide:

- invocation mode (`INTEGRATED` or `STANDALONE`) and source artifact;
- BDD ON/OFF and reason;
- tooling mode (`EXECUTABLE`, `FORMULATION_ONLY`, or `OFF`) and evidence;
- scenario artifact location;
- AC -> scenario trace;
- `UpstreamDecisionGap` entries, if any (these block formulation rather than becoming open BDD policy);
- intended automation boundary (`.feature` runner or scenario-catalog consumer).

The artifact remains behavior-focused and understandable without private tooling or bindings.
