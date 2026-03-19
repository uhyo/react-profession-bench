# Spec 003: Accessible Interactive Quiz Builder — Design Intent

## Purpose

This spec is the benchmark's primary test of **accessibility** and **TypeScript quality** through discriminated unions. The quiz builder — with its tabbed modes, reorderable questions, delete confirmations, and multiple question types — naturally requires the most ARIA patterns and focus management of any spec.

The three question types (single-choice, multiple-choice, true/false) form a natural discriminated union that tests whether the model uses TypeScript's type system to enforce correctness or falls back to optional fields.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Accessibility & Semantics | **30%** | Primary focus. Tabs, reorder, add/delete, dialog — all demand ARIA. |
| TypeScript Quality | **25%** | Discriminated union for question types; type-specific editor components. |
| State Architecture | 15% | Quiz state + preview state, derived score after submission. |
| Component Design | 15% | Type-specific editors demand polymorphic component dispatch. |
| Effect Hygiene | 10% | Minimal — mostly event-driven interactions. |
| Performance | 5% | Small data set, not a performance-focused spec. |

## Key Traps

### Trap 1: Tab Panel ARIA Pattern

**Requirement 1** describes Edit and Preview as "tabs at the top of the page." This is the WAI-ARIA Tabs pattern.

- **Expert**: `role="tablist"` on the container, `role="tab"` + `aria-selected` on each tab, `role="tabpanel"` on the content area. Keyboard arrow navigation between tabs.
- **Novice**: Styled `<button>` or `<div>` elements with `onClick`. No ARIA roles, no keyboard navigation pattern.

This trap was chosen because tabbed interfaces are one of the most common UI patterns, yet their accessibility implementation is consistently missed by LLMs.

### Trap 2: Focus Management After Reorder

**Requirements 10-11** describe Move Up/Move Down buttons. After a move, the DOM changes: the button at position 2 now corresponds to a different question.

- **Expert**: After moving a question, focus follows the moved item. If the user clicked "Move Down" on question 3, after the move, focus should be on the Move Down button of question 3 (now at position 4).
- **Novice**: Focus stays at the old DOM position, which now corresponds to a different question. The user loses their place.

### Trap 3: Focus Management After Add/Delete

**Requirement 13** (Add Question) and **Requirement 12** (Delete) change the list length.

- **Expert**: Adding a question focuses the new question's text input. Deleting a question focuses the previous question, or the Add button if none remain.
- **Novice**: Focus is lost (returns to `<body>`) or stays on a nonexistent element.

### Trap 4: Delete Confirmation Dialog Accessibility

**Requirement 12** shows a confirmation dialog before deleting.

- **Expert**: `<dialog>` element or `role="dialog"` + `aria-modal="true"` + `aria-labelledby`. Focus trapped inside the dialog. Focus restored to the delete button on cancel.
- **Novice**: A styled `<div>` overlay with no ARIA, no focus trapping, no focus restoration.

### Trap 5: Discriminated Union vs Optional Fields

The data model provides:
```ts
type Question = SingleChoiceQuestion | MultipleChoiceQuestion | TrueFalseQuestion;
```

- **Expert**: Uses the discriminated union correctly. Creates `SingleChoiceEditor`, `MultipleChoiceEditor`, and `TrueFalseEditor` components, each receiving the narrowed type as props. A switch on `question.type` dispatches to the right editor.
- **Novice**: Creates a single `QuestionEditor` that handles all three types with `if (question.type === 'single-choice')` checks everywhere, or worse, uses a bag of optional fields (`options?: string[], correctAnswer?: boolean`).

### Trap 6: Type Change Resets Options (Event Handler)

**Requirement 9**: when the question type changes, options reset.

- **Expert**: The `onChange` handler for the type dropdown creates a new question object with the new type and default options. A single state update.
- **Novice**: `useEffect` watching `question.type` that resets the options when it changes. Creates a render cycle and potential timing bugs.

### Trap 7: Live Region Announcements

After moving, adding, or deleting a question, screen reader users have no visual feedback to rely on.

- **Expert**: A visually hidden `aria-live="polite"` region announces "Question moved to position 2" or "Question deleted."
- **Novice**: No announcements. The action is invisible to assistive technology.

## Data Model Design

The discriminated union was designed to have three variants with meaningfully different structures:

- **SingleChoiceQuestion**: `options: string[]` + `correctIndex: number | null`
- **MultipleChoiceQuestion**: `options: string[]` + `correctIndices: number[]`
- **TrueFalseQuestion**: `correctAnswer: boolean | null` (no custom options)

The `| null` on `correctIndex` and `correctAnswer` is intentional — it represents "no correct answer selected yet," forcing the model to handle the nullable case.

The key design decision was making `TrueFalseQuestion` structurally different (no `options` field) from the other two. This means code that blindly accesses `question.options` will fail on true/false questions, forcing proper type narrowing.

## Observations from Initial Benchmark

In practice, no model scored above 2/5 on accessibility for this spec. The tab pattern, focus management, and dialog accessibility were universally missed. This validates the spec's design as a genuine differentiator — these patterns are not yet in any model's "instinctive" repertoire.

Interestingly, Haiku (5/5) outscored Sonnet (4/5) on state architecture — it used zero `useEffect` calls and computed all derived values correctly. This suggests that basic React patterns can sometimes be executed more cleanly by smaller models that don't over-engineer.
