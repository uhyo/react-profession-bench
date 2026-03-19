# Spec 001: Event Registration Form — Design Intent

## Purpose

This is the foundational spec of the benchmark, designed to test the most basic and most important signal of React proficiency: **whether the developer understands when NOT to use `useEffect`**.

The multi-step form with live preview is a classic React application pattern that, despite its apparent simplicity, creates numerous decision points where a novice and an expert will naturally make different choices.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| State Architecture | **25%** | Primary focus. The spec is dense with derived-value traps. |
| Effect Hygiene | **20%** | Second focus. Every derived-value trap is also an effect-hygiene trap. |
| Component Design | 20% | Three form steps + preview + modal = natural component boundaries. |
| TypeScript Quality | 15% | Provided data model exercises basic typed props and union types. |
| Performance | 10% | Low complexity — memoization is nice-to-have, not critical. |
| Accessibility | 10% | Forms have clear a11y expectations but it's not the focus. |

## Key Traps

### Trap 1: Word Count (Derived State)

**Requirement 9** asks for a word count below the bio textarea. This is the single clearest derived-state test in the entire benchmark.

- **Expert**: `const wordCount = countWords(bio)` — one line, computed during render.
- **Novice**: `const [wordCount, setWordCount] = useState(0)` + `useEffect(() => setWordCount(countWords(bio)), [bio])` — two extra hooks, an unnecessary render cycle, and a flash of stale count.

This trap was chosen because it is unambiguous. There is no legitimate reason to store word count as state. If a model gets this wrong, it demonstrates a fundamental misunderstanding of React's rendering model.

### Trap 2: Phone Number Formatting (Event Handler vs Effect)

**Requirement 8** specifies auto-formatting as `(XXX) XXX-XXXX`. The formatting must happen as the user types.

- **Expert**: Format in the `onChange` handler. The handler strips non-digits, applies formatting, and calls `setState` with the formatted value.
- **Novice**: `useEffect` watching the phone number state, reformatting it, and calling `setState` again. This creates a render loop: user types → state updates → effect runs → state updates again.

### Trap 3: Next Button Disabled State (Derived from Validation)

**Requirement 2** says the Next button is disabled when the current step has validation errors.

- **Expert**: `const isDisabled = hasValidationErrors(currentStepData)` — computed during render.
- **Novice**: `const [isNextDisabled, setIsNextDisabled] = useState(true)` + `useEffect` watching all form fields.

### Trap 4: Live Preview (No Separate State)

**Requirement 4** asks for a live preview sidebar. The preview shows the same data as the form.

- **Expert**: `<LivePreview data={formData} />` — the preview component receives the form state directly.
- **Novice**: A separate `previewData` state, synchronized with form data via `useEffect`.

### Trap 5: Validation on Blur (Event Handler, Not Effect)

**Requirement 21** specifies validate-on-blur with re-validate-on-change after first blur. This is a subtle interaction pattern that tempts effect-based approaches.

- **Expert**: `onBlur` handler marks the field as touched and runs validation. `onChange` handler checks if the field was previously touched and re-validates.
- **Novice**: `useEffect` watching both the field values and touched state to trigger validation.

### Trap 6: Dietary Restriction Mutual Exclusion

**Requirement 13** specifies that "None" deselects others and vice versa.

- **Expert**: Handle the logic in the `onChange` handler.
- **Novice**: `useEffect` watching the selected restrictions to enforce mutual exclusion.

## Data Model Design

The `RegistrationData` type is intentionally flat and simple — `PersonalInfo` + `EventPreferences`. This avoids introducing complexity that would distract from the state management patterns being tested.

The `Session` and `DietaryRestriction` types use string literal unions, which test basic TypeScript competency without requiring advanced type manipulation.

## Why This Spec Comes First

This spec serves as a calibration point. If a model scores well here, it understands React's fundamentals. If it scores poorly, the more advanced specs (Suspense, useSyncExternalStore, etc.) are likely to be beyond its capability.

The spec was also chosen because multi-step forms are extremely common in real applications, making the benchmark practical and grounded.
