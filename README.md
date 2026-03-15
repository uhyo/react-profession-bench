# react-profession-bench

A benchmark for measuring how well LLMs write **professional-quality React code**.

Unlike general coding benchmarks, this project specifically targets React-specific proficiency: state architecture, effect hygiene, component design, TypeScript quality, and accessibility — the things that separate production-ready code from "it works but I wouldn't ship it."

## How It Works

The benchmark runs in three phases:

### Phase 1: Implementation

An LLM agent receives:

- A **spec** describing a small React application's behavior and requirements (never hinting at implementation patterns)
- A **data model** with TypeScript type definitions
- A **scaffold** project (Vite + React 19 + TypeScript) with an empty `src/App.tsx`

The agent implements the application. No external UI or state management libraries are allowed — the benchmark measures React knowledge, not library knowledge.

### Phase 2: Static Analysis

The submitted code is analyzed automatically via AST inspection:

- **Anti-pattern detection** — flags known bad patterns (e.g., `useEffect` for derived state, missing cleanup, index-as-key in dynamic lists)
- **Best-practice checks** — verifies presence of custom hooks, typed props, semantic HTML, controlled inputs, accessibility labels
- **Structural metrics** — component count, `useEffect` count, `any` type count, average component size

Each anti-pattern has a severity (Critical / Major / Minor). The static score starts at 100 and deducts per finding.

### Phase 3: LLM-Judge Evaluation

A separate LLM evaluates the code against a structured rubric with six categories:

| Category | Weight | What It Measures |
|---|---|---|
| State Architecture | 25% | Minimal state, no duplication, derived values computed not stored |
| Effect Hygiene | 20% | Effects used only for true side effects, proper cleanup and deps |
| Component Design | 20% | Single responsibility, proper composition, right abstraction level |
| TypeScript Quality | 15% | Precise types, no `any`, discriminated unions, types as documentation |
| Performance Awareness | 10% | Justified memoization, stable references, no over-optimization |
| Accessibility & Semantics | 10% | Semantic HTML, labels, ARIA, keyboard navigation |

Each category is scored 1–5. The judge also receives the static analysis results to anchor its evaluation.

### Final Score

```
Final Score = (Static Score × 0.4) + (LLM Judge Score × 0.6)
```

The LLM judge runs 3 times; the median is used to reduce variance.

## Project Structure

```
react-profession-bench/
├── README.md
├── specs/                          # Benchmark specifications (given to implementer)
│   ├── 001-event-registration-form/
│   │   ├── spec.md                 # Behavioral spec
│   │   └── data-model.ts           # TypeScript types
│   ├── 002-data-dashboard/
│   │   ├── spec.md
│   │   └── data-model.ts           # Types + static data (200 contacts, 500 messages)
│   ├── 003-quiz-builder/
│   │   ├── spec.md
│   │   └── data-model.ts           # Discriminated union types for question types
│   └── 004-user-profile-browser/
│       ├── spec.md
│       └── data-model.ts           # Types + simulated async API with delays/errors
├── scaffold/                       # Template project given to the LLM
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       └── App.tsx
├── evaluation/                     # Evaluation criteria (NOT shown to implementer)
│   ├── rubric.md                   # LLM-judge scoring rubric (per-spec weights)
│   ├── anti-patterns.md           # Catalog of detected anti-patterns
│   ├── 001-event-registration-form/
│   │   └── expected-signals.json   # Spec-specific signals + rubric weights
│   ├── 002-data-dashboard/
│   │   └── expected-signals.json
│   ├── 003-quiz-builder/
│   │   └── expected-signals.json
│   └── 004-user-profile-browser/
│       └── expected-signals.json
└── runner/                         # Orchestration engine (future)
    └── ...
```

## Specs

Each spec is a self-contained Markdown document describing a small React application. Specs are designed to create **natural decision points** where an expert and a novice would make different choices — without ever mentioning hooks, patterns, or implementation approaches.

### Design Principles

1. **Specs describe behavior, never implementation.** If the spec says "extract form logic into a custom hook," we are testing instruction-following, not React proficiency.
2. **Forbid external libraries** so the benchmark measures React fundamentals.
3. **Keep apps small** (5–15 components, ~500–800 lines) but rich in decision points.
4. **Anti-patterns are more informative than best practices.** It is easier to reliably detect what someone does wrong than to fully enumerate what they do right.

### Available Specs

Each spec has its own rubric weight profile, emphasizing different React skills.

| ID | Name | Primary Focus | Key Signals Tested |
|---|---|---|---|
| 001 | Event Registration Form | State Architecture, Effect Hygiene | Derived state traps, useEffect anti-patterns, validation-on-blur, form handling |
| 002 | Multi-Panel Data Dashboard | Performance, Component Design | Memoization of expensive filtering/sorting, React.memo, generic list composition, discriminated unions |
| 003 | Accessible Interactive Quiz Builder | Accessibility, TypeScript Quality | ARIA patterns, focus management, keyboard navigation, discriminated union narrowing, type-specific components |
| 004 | User Profile Browser | Effect Hygiene, Accessibility | Suspense for data fetching, granular Suspense boundaries, error boundaries, useTransition for navigation, progressive loading, loading skeletons |

## Evaluation Details

See [`evaluation/rubric.md`](evaluation/rubric.md) for the full scoring rubric and [`evaluation/anti-patterns.md`](evaluation/anti-patterns.md) for the catalog of detected anti-patterns.

## Key Design Decision: Why `useEffect` Matters So Much

The single strongest signal of React proficiency is how a developer uses `useEffect`. The most common mistake — and the one that most clearly reveals a lack of understanding of React's mental model — is using `useEffect` to synchronize derived state:

```tsx
// Anti-pattern: derived state via useEffect
const [bio, setBio] = useState("");
const [wordCount, setWordCount] = useState(0);
useEffect(() => {
  setWordCount(bio.trim().split(/\s+/).length);
}, [bio]);

// Correct: compute during render
const [bio, setBio] = useState("");
const wordCount = bio.trim().split(/\s+/).length;
```

This pattern is so prevalent among LLMs and junior developers that it serves as a litmus test. The benchmark specs are specifically designed to create opportunities where this anti-pattern is tempting.
