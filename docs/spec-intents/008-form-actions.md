# Spec 008: Multi-Section Survey Form — Design Intent

## Purpose

This spec tests React 19's **form actions** ecosystem: `<form action={fn}>`, `useActionState`, and `useFormStatus`. These APIs replace the traditional `onSubmit` + `e.preventDefault()` + manual `isPending` state pattern with a declarative form lifecycle. The spec also tests whether the model understands that native HTML `<form>` submission (Enter-to-submit) is the correct approach — not `onKeyDown` hacks.

The survey form is chosen because it has multiple input types (text, radio, checkbox, textarea, file) which exercise the full range of form semantics.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Accessibility | **30%** | Primary focus. Native form behavior, `<fieldset>`/`<legend>`, `aria-describedby` for errors. |
| Effect Hygiene | **25%** | Co-primary. With form actions, the entire submit lifecycle requires zero `useEffect`. |
| TypeScript Quality | 15% | Discriminated union for form state, typed FormData extraction. |
| State Architecture | 15% | Form state is straightforward but the action-state pattern is a distinct architecture. |
| Component Design | 10% | The SubmitButton component using `useFormStatus` is the key design signal. |
| Performance | 5% | Not performance-sensitive. |

## Key Traps

### Trap 1: `<form action={fn}>` vs `onSubmit`

**Requirements 2, 9, 10** describe a form that submits data to an API and supports Enter-to-submit.

- **Expert**: `<form action={submitAction}>` where `submitAction` is an async function receiving `FormData`. React 19 handles the form lifecycle natively — pending state, error handling, and form reset are managed declaratively.
- **Tier-2**: `<form onSubmit={handler}>` with `e.preventDefault()` and manual state management. Enter-to-submit works (because it's still a `<form>`), but the developer manually manages `isPending`, `error`, and `success` state — exactly what `useActionState` handles automatically.
- **Tier-3**: `onKeyDown` on each input checking for Enter. This reimplements native form behavior, is fragile (misses edge cases like IME composition), and reveals a lack of understanding of HTML forms.

### Trap 2: `useActionState` vs Manual State

**Requirements 11–13** describe the form lifecycle: pending → error/success.

- **Expert**: `useActionState` wraps the submit action and returns `[state, dispatch, isPending]`. The state is a discriminated union: `{ status: 'idle' } | { status: 'error', errors: ... } | { status: 'success' }`. The dispatch function is used as the `<form action>`.
- **Tier-2**: `useTransition` + manual state — closer to the right pattern (gets `isPending`) but doesn't leverage `useActionState`'s state machine.
- **Tier-3**: Multiple `useState` (isPending, error, success) + try/catch. Verbose and easy to get wrong (forgetting to reset states, race conditions on rapid submissions).

### Trap 3: `useFormStatus` for the Submit Button

**Requirement 11** says the submit button shows "Submitting..." and is disabled during submission.

- **Expert**: A `SubmitButton` component that calls `useFormStatus()` to read `{ pending }`. This hook automatically picks up the pending state from the nearest `<form>` — zero prop drilling.
- **Tier-2**: Passing `isPending` as a prop from the parent. Works but misses the purpose of `useFormStatus`.

### Trap 4: Enter-to-Submit via Native Form Behavior

**Requirement 9** explicitly asks for Enter-to-submit in text inputs.

With `<form action={fn}>` and `<button type="submit">`, this is automatic — the browser handles it. No code needed. The presence of `onKeyDown` handlers checking for `event.key === 'Enter'` is a red flag indicating the developer doesn't understand native form submission.

## Data Model Design

The `submitSurvey` API has a deliberate **30% failure rate** — much higher than other specs. This ensures the error handling path is exercised frequently and tests whether the form remains filled (not reset) after a failure. The submission history feature (requirements 18–20) provides additional context for the error recovery pattern.

The `SurveyData` type is intentionally broad (text, number, array, nullable) to test type-safe FormData extraction.

## Why This Spec Exists

Form handling is one of the most common tasks in web development, yet it's where React developers most frequently fight the platform. React 19's form actions represent a philosophical shift: instead of fighting native `<form>` behavior, React now embraces and extends it. This spec tests whether LLMs understand that shift — or whether they still default to the pre-React 19 `e.preventDefault()` + manual state pattern.

The Enter-to-submit requirement is particularly telling. The "correct" answer is to write zero code — the browser does it. Any code written for this requirement is a signal of misunderstanding.
