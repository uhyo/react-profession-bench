# Evaluation Rubric (v2)

This rubric instructs the LLM judge for **benchmark v2**. It replaces the v1 holistic
1–5 category scoring with **checkpoint verification**: the judge issues a verdict for
every checkpoint in the spec's checkpoint file, with quoted evidence. The judge does
**not** compute any score — the runner computes all scores from the verdicts.

(v1's `evaluation/rubric.md` is frozen and must not be edited; this file is the v2
baseline and is itself frozen once v2-第1回 is published.)

## How v2 evaluation works

- Each spec ships a checkpoint file (`evaluation/v2/<spec>/checkpoints.json`,
  schema: `evaluation/v2/checkpoint-schema.json`): 15–25 concrete, verifiable
  requirements. Each has a tier (`core` / `competent` / `expert`), a category tag,
  and a weight.
- The judge reads the spec and the full submission, then verdicts each checkpoint:
  **met**, **partial**, or **missed**, each with quoted code evidence.
- The runner computes, per spec:

  ```
  raw_score   = (Σ met_weight + 0.5 × Σ partial_weight) / Σ total_weight × 100
  final_score = raw_score × compile_gate × rules_gate
    compile_gate = 0.6 if `tsc -b --noEmit` failed, else 1
    rules_gate   = 0.6 if the judge reported ≥1 Rules of React violation, else 1
  ```

  This is a true 0–100 scale. Category subscores are computed the same way over each
  category's checkpoints (gates apply only to the final score).

## Instructions for the LLM Judge

1. Read the original spec, then read the **entire** submission before issuing any
   verdict.
2. For each checkpoint, in order:
   - Search the code for evidence bearing on the checkpoint's `requirement`.
   - Decide the verdict using the checkpoint's `met_when` / `partial_when` criteria.
   - Quote the decisive code **verbatim**, prefixed with its file name, in
     `evidence`. Keep quotes short — the smallest excerpt that proves the verdict.
   - Write a 1–2 sentence `note` explaining the verdict.
3. Verdict semantics:
   - **met** — the requirement is fully satisfied and you can quote positive
     evidence. If you cannot point to code that satisfies it, it is not met.
   - **partial** — a real attempt exists but is flawed or incomplete per
     `partial_when` (or, if `partial_when` is absent, use it only for genuinely
     borderline implementations).
   - **missed** — the requirement is unaddressed, or the implementation is
     fundamentally wrong (e.g. matches a listed anti-pattern). A feature that is
     simply absent is **missed**, never "not applicable".
   - When in doubt between two verdicts, choose the lower one. "met" is a positive
     claim that requires positive evidence.
4. Verdict **every** checkpoint, exactly once, using its `id`. Do not add, skip, or
   merge checkpoints.
5. Judge only what the checkpoints ask. The anti-pattern catalog
   (`evaluation/v2/anti-patterns.md`) is a recognition aid — use it to spot problems
   and report them in `anti_patterns_observed`, but it carries no point values and
   must not override checkpoint criteria.
6. Never invent code, line numbers, or APIs. Evidence must be copyable from the
   submission.

## Rules of React gate

Professional React code strictly obeys the
[Rules of React](https://react.dev/reference/rules); a violation anywhere is
disqualifying-level, independent of how many checkpoints pass. Report every
violation you find in `react_rule_violations`, classified as one of:

| `rule` | Violation |
|---|---|
| `impure-render` | Side effects during render: mutating module/external state, writing storage, subscribing, DOM mutation, or non-idempotent work in a component/hook body outside effects and event handlers. |
| `state-mutation` | Directly mutating state, props, or values previously passed to `useState`/`useReducer` (e.g. `items.push(...)` then `setItems(items)`). |
| `conditional-hook` | Hooks called conditionally, in loops, after early returns, or otherwise not at the top level of a component/custom hook. |
| `direct-component-call` | Calling a component function directly, or calling hooks outside components/custom hooks. |
| `stale-closure-deps` | An effect reads reactive values (props/state) that are omitted from its dependency array, creating a stale-closure hazard, without an honest mediation (`useEffectEvent`, or a ref that is reliably kept current). |

This gate is deliberately **high-precision**: report a violation only when the
evidence is unambiguous — the quoted code alone must prove it. The submission will
contain no lint output or disable comments (the scaffold has no ESLint); judge the
code's behavior, never the presence or absence of comments. If you are not certain
a rule is violated, do not report it here — mention it in
`anti_patterns_observed` instead. The runner multiplies the final score by 0.6 when
any violation is reported, so a false positive is expensive.

## Category definitions (tags)

Every checkpoint carries one category tag. These definitions are generic — all
spec-specific guidance lives in the spec's checkpoint file.

| Category | What it covers |
|---|---|
| `state_architecture` | Minimal state, no duplication, derived values computed during render, state owned at the right level. |
| `effect_hygiene` | Effects only for true side effects (subscriptions, timers, external systems), correct dependencies, cleanup, no derived-state or event-handling effects. |
| `component_design` | Single responsibility, sensible decomposition and composition, right abstraction level, no monoliths and no pointless fragmentation. |
| `typescript_quality` | Precise types, no `any`, discriminated unions and narrowing where they add clarity, types as documentation. |
| `performance_awareness` | Memoization where justified and only there, stable references where they matter, concurrent APIs to keep interaction responsive. |
| `accessibility_semantics` | Semantic HTML, label associations, correct ARIA patterns, keyboard operability, screen-reader-visible state. |

## Output format

Respond with **only** a JSON object (no markdown fences, no commentary) matching
`evaluation/v2/judge-output-schema.json`:

```json
{
  "verdicts": [
    {
      "id": "<checkpoint id>",
      "verdict": "met" | "partial" | "missed",
      "evidence": "<file name + verbatim code quote; empty string only when missed with no relevant code>",
      "note": "<1-2 sentences>"
    }
  ],
  "react_rule_violations": [
    {
      "rule": "impure-render" | "state-mutation" | "conditional-hook" | "direct-component-call" | "stale-closure-deps",
      "evidence": "<file name + verbatim code quote proving the violation>",
      "note": "<1-2 sentences>"
    }
  ],
  "anti_patterns_observed": ["<anti-pattern with file reference>"],
  "strengths": ["<notable positive observations beyond the checkpoints>"],
  "summary": "<3-5 sentence overall assessment>"
}
```

`verdicts` must contain one entry per checkpoint, in the same order as the
checkpoint file. No scores appear anywhere in the output.
