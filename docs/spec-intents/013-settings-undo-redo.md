# Spec 013: Settings Dashboard with Undo/Redo — Design Intent

## Purpose

This spec tests **`useReducer`** for complex state machines (the undo/redo pattern), **React 19's `<Context>` syntax** (shorthand for `<Context.Provider>`), and **context splitting** to avoid unnecessary re-renders. It also tests **discriminated union action types** and whether the model can extract a generic, reusable `useUndoReducer` hook.

Settings dashboards are common in real applications, and undo/redo is a pattern that clearly benefits from a reducer — making this a natural rather than contrived test.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| State Architecture | **30%** | Primary focus. useReducer with undo/redo history is the core test. |
| TypeScript Quality | **20%** | Co-primary. Typed action unions, generic hook, Settings types. |
| Component Design | **20%** | Context providers, separated settings groups, preview sub-components. |
| Effect Hygiene | 10% | One legitimate effect for keyboard shortcuts. |
| Performance | 10% | Context splitting to minimize re-renders. |
| Accessibility | 10% | Form controls, keyboard shortcuts. |

## Key Traps

### Trap 1: `useReducer` with Undo/Redo History

**Requirements 5–10** describe a full undo/redo system. This is the textbook use case for `useReducer`.

- **Expert**: The reducer state has the shape `{ past: Settings[], present: Settings, future: Settings[] }`. The reducer handles actions: setting changes push `present` to `past` and clear `future`; UNDO pops from `past` and pushes `present` to `future`; REDO pops from `future` and pushes `present` to `past`; RESET pushes `present` to `past` and sets `present` to defaults.

  Ideally extracted as a generic `useUndoReducer<T>` hook that takes an initial state and returns `{ state, set, undo, redo, canUndo, canRedo, reset }`. This hook knows nothing about Settings — it works with any state type.

- **Tier-2**: `useReducer` but with the undo/redo logic mixed into the component (not extracted as a hook), or with bugs in the history management (new changes don't clear future, undo doesn't push to future).

- **Tier-3**: Multiple `useState` for past/present/future, manually synchronized. Error-prone and verbose.

### Trap 2: `<Context>` (React 19) vs `<Context.Provider>`

**Requirement 13** says settings must be accessible without prop drilling through 3+ levels.

- **Expert**: Creates a `SettingsContext` and uses `<SettingsContext value={settings}>` — the React 19 shorthand where the context object itself is the JSX tag.
- **Tier-2**: `<SettingsContext.Provider value={settings}>` — the pre-React 19 verbose syntax. Functionally identical but indicates the developer hasn't adopted React 19 conventions.
- **Tier-3**: Prop drilling settings through intermediate components that don't use them.

### Trap 3: Context Splitting

- **Expert**: Two separate contexts: `SettingsContext` (current settings values) and `SettingsDispatchContext` (the dispatch function / setter). Components that only dispatch (the settings panel controls) read from `SettingsDispatchContext` and don't re-render when settings values change. Components that only read (the preview) read from `SettingsContext` and don't receive dispatch.
- **Acceptable**: A single context is acceptable for this app's scale. The evaluator should note whether the model shows awareness of the pattern even if it doesn't apply it.
- **Anti-pattern**: A single context containing both values and functions, with no acknowledgment of the re-render implications.

### Trap 4: Derived `canUndo` / `canRedo`

**Requirement 7** says undo is disabled when there's no history and redo is disabled when there are no undone actions.

- **Expert**: `const canUndo = past.length > 0` and `const canRedo = future.length > 0` — computed during render from the reducer state.
- **Novice**: Separate `useState` for `canUndo` and `canRedo`, synced via `useEffect` watching `past` and `future`.

### Trap 5: Notification Frequency Disabled State

**Requirement 4** says the frequency dropdown is disabled when both email and push notifications are unchecked.

- **Expert**: `disabled={!settings.notifications.emailNotifications && !settings.notifications.pushNotifications}` — a one-line derived value.
- **Novice**: A separate state variable synced via effect.

## Data Model Design

The `Settings` type is deliberately nested (Appearance, Layout, Notifications) to test whether the reducer handles deep updates correctly (e.g., `{ ...state, appearance: { ...state.appearance, theme: 'dark' } }`). The `DEFAULT_SETTINGS` constant provides the reset target.

The `ACCENT_COLORS` and `CONTENT_WIDTHS` records provide CSS values for the live preview, making it easy to apply settings visually without complex logic.

## Why This Spec Exists

`useReducer` is the right tool for complex state with multiple transitions, yet many React developers default to `useState` for everything. The undo/redo pattern is the clearest example of where a reducer is not just better but practically necessary — implementing the past/present/future stack with multiple `useState` calls is so error-prone that the choice of hook reveals the developer's understanding of when each tool is appropriate.

The `<Context>` syntax test is small but telling — it directly reveals whether the model's knowledge includes React 19 conventions. Similarly, context splitting is a production pattern that's rarely taught but immediately recognizable to experienced React developers.
