---
name: bdd-rt
description: >-
  Independent pre-implementation red-team gate for BDD scenarios. Checks that formulated examples
  faithfully cover the agreed behavior, use concrete and externally observable outcomes, avoid
  implementation detail, and remain realistically automatable. Runs only when BDD is on, after
  formulation and before user sign-off or TDD automation.
---

# bdd-rt: gate the behavior examples

## Why this exists

The author who formulates examples can encode the same misunderstanding already present in the prose.
This gate independently checks the behavior specification before tests and production code make it
expensive to change.

Its scope is deliberately narrow. It audits **the agreed behavior represented by the scenarios**. It
does not brainstorm extra product scope, grade prose style, or demand exhaustive edge cases.

## When to run

- Only when `bdd` is ON; that is a structural prerequisite, not automatic activation.
- Turn it ON when independent review materially reduces behavior-contract risk.
- After the cohesive scenario set is formulated, before user sign-off and TDD automation.
- Once per coherent behavior slice, not once per scenario.
- Skip when BDD is OFF, or record an independent OFF reason when direct sign-off is sufficient for an explicit low-risk scenario set.

## Oracle

The oracle is the signed behavior contract:

- confirmed acceptance criteria;
- applicable Decision Ledger entries when a walkthrough ran;
- verified existing behavior the new examples intentionally preserve;
- the AC -> scenario trace.

The reviewer may not invent a new requirement. A scenario faithfully implementing a questionable
signed requirement is not rewritten by the gate; the conflict is returned to the user.

## Blocking rubric

A finding blocks only when it names a concrete failure scenario, identifies the affected requirement
or observable contract, and explains the cost of leaving it unfixed. The five blocking dimensions are:

1. **Behavior coverage** — a confirmed, material behavior has no scenario, or a scenario has no signed
   requirement/rule behind it.
2. **Concrete example** — the scenario is too abstract to distinguish the intended rule or boundary.
3. **Observable outcome** — `Then` asserts implementation activity instead of an externally visible
   result, so the behavior cannot be verified.
4. **Contradiction or ambiguity** — scenarios conflict with each other or permit materially different
   implementations with different user/contract outcomes.
5. **Automation viability** — the scenario cannot reasonably become an executable specification at the
   declared boundary, or is coupled to implementation details that make it false documentation.

## Advisory only

These never block by themselves:

- scenario title, wording, grammar, tags, ordering, or file organization;
- optional `Background`/`Scenario Outline` refactors;
- additional edge cases outside the signed contract;
- stylistic Given/When/Then preferences;
- implementation-test coverage, assertion strength, or Red-is-red — those belong to `test-rt`.

Convergence is zero blocking findings. Same-root findings are collapsed; speculative concerns without
a concrete behavior impact are advisory or omitted.

## Execution grounding

- Parse real `.feature` files when a Gherkin parser is available.
- Verify referenced existing behavior from source when a scenario depends on it.
- Step definitions are not required yet; this gate runs before Automation.
- In declared `FORMULATION_ONLY` mode, the absence of a runner or step definitions is expected and
  never blocks by itself. Judge whether the examples could be automated at the stated system boundary,
  not whether tooling has been installed.
- If the artifact claims an existing Cucumber harness but it cannot be inspected, mark automation
  viability UNVERIFIED. It blocks only when that uncertainty would make the chosen artifact unusable.

## Findings schema

```json
{
  "type": "object", "additionalProperties": false, "required": ["findings"],
  "properties": { "findings": { "type": "array", "items": {
    "type": "object", "additionalProperties": false,
    "required": ["dimension", "scenario", "location", "title", "why", "evidence", "behavior_impact", "blocking"],
    "properties": {
      "dimension":       { "type": "string", "enum": ["behavior-coverage", "concrete-example", "observable-outcome", "contradiction-ambiguity", "automation-viability", "advisory"] },
      "scenario":        { "type": "string" },
      "location":        { "type": "string" },
      "title":           { "type": "string" },
      "why":             { "type": "string" },
      "evidence":        { "type": "string" },
      "behavior_impact": { "type": "string" },
      "blocking":        { "type": "boolean" },
      "suggested_fix":   { "type": "string" }
    },
    "allOf": [
      { "if": { "properties": { "dimension": { "const": "advisory" } } }, "then": { "properties": { "blocking": { "const": false } } } }
    ]
  } } }
}
```

## Framing

```text
You are an adversarial BDD RED TEAM reviewing behavior examples before implementation. Find only
material ways the scenarios fail to encode the signed behavior. You do not approve, rewrite product
policy, or expand scope.

A BLOCKING finding must provide all four: (1) a concrete failure or ambiguity, (2) the affected
acceptance criterion / rule / observable contract, (3) evidence from the scenario, source, or
declared automation boundary, and (4) the real cost of leaving it unfixed. Without those, the finding
is advisory or omitted.

Check behavior coverage, concreteness, externally observable outcomes, contradictions, and realistic
automation viability. Implementation details, wording preferences, optional refactors, and unsigned
extra edge cases never block. Do not judge implementation-test assertion strength; test-rt owns that.
```

Dimensions: `behavior coverage` · `concrete examples` · `observable outcomes` · `contradiction / ambiguity` · `automation viability`.

## Engine

Invoke the shared engine with:

`{ artifact: <scenarios + AC trace>, context: <ACs + relevant decisions + automation boundary>, framingLines: <above>, findingsSchema: <above>, identityFields: ['dimension','scenario','location','title'], dimensions: <above>, agentType: 'general-purpose', artifactLabel: 'BDD SCENARIOS under review', confirmation: <route single|double>, protocolVersion: 1 }`.

Every pass uses a fresh, sufficiently capable reviewer. `single` or `double` confirmation comes from
the signed risk route; the hard line uses `double`. Passes for the same artifact remain sequential.
An off-engine runner is a plain agent, so reproduce this rubric verbatim (framing + dimensions +
findings schema).

**CAP = 3 fix-rounds.** Every update reports `fix round / 3`, open blockers, and confirmation progress.
At the cap with unresolved blockers, stop and escalate the remaining behavior conflicts to the user;
do not continue generating scenario batches indefinitely.

## Relationships

- Upstream: `walkthrough`/Decision Ledger when needed, plus confirmed acceptance criteria.
- Invocation ownership: `walkthrough` may invoke this validator inside its transparent Definition
  composite, while this skill retains its own rubric, fresh reviewer, findings, and convergence result.
- Produces: behavior examples ready for user sign-off and Automation.
- Followed by: `tdd` and `test-rt` when those stations are independently ON.
- A product-decision finding remains an ordinary schema-valid blocking finding from this validator.
  The invoking Definition composite translates it into `UpstreamDecisionGap` and reopens the decision
  source; the gate does not silently decide policy or change its output schema.
