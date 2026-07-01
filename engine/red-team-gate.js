// One adapter for a client-agnostic red-team convergence gate whose CANONICAL definition
// (the Ledger + red-team rubric + asymmetric-escalation rule) lives in your design/walkthrough
// skill. The gate is NOT bound to any one client: others run the same red-team passes via their
// own subagent primitive, or fall back to sequential fresh-context passes. This file accelerates
// it via the client's Workflow tool.
//
// GENERIC ENGINE: the control flow below (asymmetric 1→confirm, dedupe, return shape) is
// INSTANTIATION-AGNOSTIC. The three per-instantiation parts are ARGS, with a built-in generic
// DESIGN preset as their defaults (so a design-gate caller can invoke with just {artifact, context}):
//   - framingLines   : the cognitive task (what KIND of holes to hunt, over what artifact)
//   - findingsSchema : the structured-output shape (design: missing/over-parked/weak-na;
//                      code/test instantiations REPLACE this with tier/severity/file/line)
//   - dimensions     : the rubric dimension list
// A code-review or test-review instantiation calls this same engine with its own
// framingLines + findingsSchema + dimensions. Canonical invariants live in the design skill.
//
// INSTALL: symlink or copy this file into your client's workflow directory (see the adjacent README).
//
// COST RULE (asymmetric escalation): a FAIL is cheap to trust (one real hole = not done →
// send back), a PASS is the dangerous claim (a lone "looks clean" could be a miss). So:
//   run 1 red team → if it finds holes, return NOT-converged (cost: 1 agent).
//                  → if it finds nothing, run a 2nd INDEPENDENT red team to confirm.
//                      both clean → CONVERGED (cost: 2). 2nd finds holes → NOT-converged (cost: 2).
// So every "pass" survives 2 independent checks; every "fail" costs only 1.
//
// TERMINOLOGY: this referee role is the "red team" — it red-teams the artifact and NEVER
// blesses completion. Write "red team" in full, not the "RT" abbreviation.
//
// SHARED GATE INVARIANTS (canonical — every gate that runs this engine inherits these; the
// design-rt / test-rt / code-rt skills reference here instead of restating them):
//   - TWO-CONSECUTIVE-CLEAN: "converged" = two independent clean passes in a row (see COST RULE
//     above); a single clean pass never converges.
//   - NEVER-BLESS: the red team only red-teams; it never declares "done" — only the human signs off.
//   - NO-DOWNGRADE: every finding is OPEN by default. It leaves OPEN only by being genuinely
//     folded/fixed, or by the USER ruling it out of scope — never by the (biased) calling agent
//     relabelling it "narrow / obvious / not first-order / cosmetic". A round with ANY finding is
//     not clean; there is no "narrowness / diminishing-returns -> declare converged" shortcut.
//   - SCOPE-IN IS A FLOOR, NOT A CEILING: the caller may EXTEND the rubric, never shrink it. When the
//     surface is too big for one red team, split into LANES by dimension/subsystem and run one per
//     lane (coverage-preserving) — never tell a red team "skip area X" (coverage-shrinking = the leak).
//     Hand the resolved set as REFERENCE to dedupe against, not a demand to re-derive; dedup is
//     POST-filtering done in the open (drop a dup by citing the entry), never pre-filtering.
//   - VERIFY-AGAINST-SOURCE: any claim about how EXISTING code behaves (a fallback, a pipeline/stage
//     order, a wire/error shape, a data-structure invariant) must be checked against the real source
//     when the red team can read it — assumed-behavior folds are a top recurring miss.
//   - CLIENT-AGNOSTIC: independence is what matters, not this file. With no workflow runner, run the
//     same passes via the client's sub-agent primitive, or as sequential fresh-context passes.
export const meta = {
  name: 'red-team-gate',
  description: 'Arg-driven adversarial convergence gate. Independent same-tier red team(s) hunt holes against a per-instantiation rubric (framingLines + dimensions + findingsSchema; a generic design preset is built in, code/test instantiations override). RED-TEAMS, never blesses. Asymmetric escalation: 1 red team by default; a FAIL returns immediately (cheap); a clean pass is double-checked by a 2nd independent red team, so "converged" always requires TWO independent clean passes.',
  phases: [
    { title: 'Red-team', detail: 'first independent red team hunts holes' },
    { title: 'Confirm', detail: 'on a clean first pass, a 2nd independent red team confirms' },
  ],
}

// === per-instantiation args (all optional except the artifact) ===
// artifact | ledger : string  — the thing under audit (design: Decision Ledger; code: diff+mission
//                               contract; test: the test cases). `ledger` kept as backward-compat alias.
// context           : string  — supporting material (spec / diff / decisions so far / test output)
// dimensions?       : string[] — rubric dimensions (default = design dimensions)
// framingLines?     : string[] — the cognitive task: what KINDS of holes to hunt (default = design)
// findingsSchema?   : object   — JSON schema for findings (default = design: missing/over-parked/weak-na)
// weightPasses?     : [string, string] — the two alternating "weight these dims" hints (default = design)
// artifactLabel?    : string   — header for the artifact block (default = 'DECISION LEDGER (the artifact under audit)')
// agentType?        : string   — 'general-purpose' so red teams can Read/Grep real source (the verify-against-code rule)
// Default to a CODE-CAPABLE agent (Read/Grep/run the repo) so the verify-against-source invariant
// holds for a bare {artifact, context} call; pass an explicit text-only agentType to opt out.
const AGENT_TYPE = (args && args.agentType) || 'general-purpose'
const ARTIFACT = ((args && (args.artifact != null ? args.artifact : args.ledger)) || '').toString()
const CONTEXT = ((args && args.context) || '').toString()
const ARTIFACT_LABEL = (args && args.artifactLabel) || 'DECISION LEDGER (the artifact under audit)'

// ===== RUBRIC-SCOPE INVARIANT (read before adding any default below) =====
// The baked defaults below are a GENERIC, publishable DESIGN preset ONLY. This engine's
// mechanism is rubric-agnostic — every rubric is just args. NEVER add a PRIVATE or
// consumer-specific rubric (or any denylist / secret / proprietary content) as a default
// here: private rubrics are ALWAYS passed as args by their caller, so this shareable engine
// never carries private content. Keeping only a generic preset baked is what lets the engine
// be distributed as pure mechanism.
// =========================================================================

const DIMENSIONS = (args && args.dimensions) || [
  'engine / core logic',
  'external contract (API / IPC / event / wire format / cross-repo schema)',
  'data model & migration',
  'failure modes & edge cases',
  'security / abuse / auth / rate-limiting',
  'config / schema surface',
  'UX (existence & behavior, not pixels)',
  'telemetry / observability',
  'ops / infra / hosting / cost',
]

// Default framing = design-walkthrough completeness (MISSING / OVER-PARKED / WEAK-N/A).
const DEFAULT_FRAMING = [
  'You are an adversarial completeness RED TEAM for a design walkthrough. Your ONLY job is to find HOLES.',
  'You do NOT approve, bless, or judge "is it done" — you only surface nodes that should be open but are not.',
  'A red team that finds fewer real holes is tolerable; one that wrongly implies "looks complete" is a failure.',
  'When uncertain whether something is a hole, FLAG it — recall matters more than precision here.',
  '',
  'Hunt three kinds of holes in the artifact below:',
  '1. MISSING — a decision node that clears the ASK-gate (Fork / Ripple / Cost / Stake) but is absent.',
  '2. OVER-PARKED — a node parked with a default that is actually a genuine fork the user should decide.',
  '3. WEAK-N/A — a dimension marked "N/A" whose justification does not actually hold for this work.',
  'Also scan any pre-existing Open Questions / TBD / deferred markers in the spec — a pre-existing open item the new work touches is still a hole (classify as MISSING).',
]
const FRAMING_LINES = (args && args.framingLines) || DEFAULT_FRAMING

const DEFAULT_WEIGHT_PASSES = [
  'This pass: weight CONTRACT / DATA-MODEL / FAILURE-MODE / SECURITY dimensions (most under-walked).',
  'This pass: weight OPS / INFRA / COST / TELEMETRY / UX-existence dimensions (most often forgotten entirely).',
]
const WEIGHT_PASSES = (args && args.weightPasses) || DEFAULT_WEIGHT_PASSES

const DEFAULT_FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      description: 'Holes found. Empty = genuinely no hole this pass.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dimension', 'node', 'type', 'why', 'suggested_triage'],
        properties: {
          dimension: { type: 'string' },
          node: { type: 'string', description: 'short name of the missing / mis-triaged decision node' },
          type: { type: 'string', enum: ['missing', 'over-parked', 'weak-na'] },
          why: { type: 'string', description: 'concretely why it clears the ASK-gate (fork / ripple / cost / stake)' },
          suggested_triage: { type: 'string', enum: ['ASK', 'PARK', 'PROTOTYPE'] },
        },
      },
    },
  },
}
const FINDINGS_SCHEMA = (args && args.findingsSchema) || DEFAULT_FINDINGS_SCHEMA

if (!ARTIFACT.trim()) {
  return { converged: false, error: 'no artifact/ledger provided — cannot red-team', openNodes: [] }
}

function redTeamPrompt(i) {
  return [
    ...FRAMING_LINES,
    '',
    'Check EVERY dimension below — for each, is there real coverage, a justified N/A, or a hole?',
    DIMENSIONS.map((d, k) => `  ${k + 1}. ${d}`).join('\n'),
    '',
    WEIGHT_PASSES[i % WEIGHT_PASSES.length],
    '',
    'Any fold/claim about how EXISTING code behaves (a fallback, a pipeline/stage order, an error or wire shape, a data-structure invariant) must be VERIFIED against the real source if you can read it — never assume it; assumed-behavior folds are a top recurring miss.',
    '',
    '=== CONTEXT (spec / diff / decisions so far) ===',
    CONTEXT || '(none provided)',
    '',
    `=== ${ARTIFACT_LABEL} ===`,
    ARTIFACT,
    '',
    'Return findings via structured output. Be specific: name the exact location/node, not a vague area.',
  ].join('\n')
}

function dedupe(findings) {
  const seen = new Set()
  const out = []
  for (const f of findings || []) {
    // key on the first two stable identity-ish fields, schema-agnostic
    const a = (f.dimension || f.tier || '').toString().toLowerCase().trim()
    const b = (f.node || f.location || f.title || '').toString().toLowerCase().trim()
    const key = `${a}|${b}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

// --- Pass 1: a single red team. A FAIL is trustworthy on its own. ---
phase('Red-team')
const first = await agent(redTeamPrompt(0), { label: 'red-team#1', phase: 'Red-team', schema: FINDINGS_SCHEMA, agentType: AGENT_TYPE })
if (!first) {
  return { converged: false, error: 'red-team#1 did not run — re-run the gate', openNodes: [], checks: 0 }
}
const firstFindings = dedupe(first.findings || [])
if (firstFindings.length > 0) {
  log(`pass 1 found ${firstFindings.length} hole(s) → NOT converged (cost: 1 red team)`)
  return {
    converged: false,
    openNodes: firstFindings,
    checks: 1,
    note: 'Holes found by the first red team. Fold them into the artifact as OPEN and keep walking. A FAIL needs only 1 check — do NOT summon the user.',
  }
}

// --- Pass 1 was clean. A clean pass is the dangerous claim → require an INDEPENDENT 2nd confirm. ---
phase('Confirm')
const second = await agent(redTeamPrompt(1), { label: 'red-team#2 (confirm)', phase: 'Confirm', schema: FINDINGS_SCHEMA, agentType: AGENT_TYPE })
if (!second) {
  return { converged: false, error: 'first pass was clean but the confirm red team did not run — unconfirmed; re-run', openNodes: [], checks: 1 }
}
const secondFindings = dedupe(second.findings || [])
if (secondFindings.length > 0) {
  log(`pass 1 clean, but the independent confirm pass found ${secondFindings.length} hole(s) → NOT converged (cost: 2)`)
  return {
    converged: false,
    openNodes: secondFindings,
    checks: 2,
    note: 'First pass was clean but the independent confirm pass found holes. Fold as OPEN and keep walking. Do NOT summon the user.',
  }
}

log('two independent red teams each found nothing → CONVERGED (cost: 2)')
return {
  converged: true,
  openNodes: [],
  checks: 2,
  note: 'CONVERGED: two independent red teams each found no hole. Present the full artifact to the user for final sign-off — do NOT self-declare done.',
}
