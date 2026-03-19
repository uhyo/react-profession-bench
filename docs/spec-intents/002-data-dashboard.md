# Spec 002: Multi-Panel Data Dashboard — Design Intent

## Purpose

This spec shifts focus from state/effect basics (covered by spec 001) to **rendering performance and component composition**. The three-panel layout with large data sets (200 contacts, 500 messages) creates natural pressure for memoization, and the shared panel structure tests whether the model recognizes composition opportunities.

The addition of concurrent rendering requirements (`useDeferredValue`) makes this spec the primary test of whether a model understands React's approach to keeping UIs responsive during expensive updates.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Performance Awareness | **30%** | Primary focus. Large datasets + real-time filtering demand memoization and concurrent rendering. |
| Component Design | **25%** | Two structurally similar panels (Contacts, Messages) are a composition opportunity. |
| TypeScript Quality | 20% | Discriminated union for message types (text/image/file) tests type narrowing. |
| State Architecture | 10% | Filtered lists should be derived, not stored, but this is less novel than spec 001. |
| Accessibility | 10% | List selection requires keyboard support, but it's not the focus. |
| Effect Hygiene | 5% | Minimal — static data means no fetching effects. Ideally zero effects. |

## Key Traps

### Trap 1: useDeferredValue for Search Filtering

**Requirements 19-20** (added after initial spec design) explicitly describe responsive search behavior: "the text input must update immediately with no perceptible lag" and "the list should appear visually dimmed while updating."

This is the textbook use case for `useDeferredValue`:
```tsx
const [query, setQuery] = useState("");
const deferredQuery = useDeferredValue(query);
const filtered = useMemo(() => filter(items, deferredQuery), [deferredQuery, items]);
const isStale = query !== deferredQuery;
```

- **Expert**: Uses `useDeferredValue`, renders the list with the deferred query, and applies reduced opacity when stale.
- **Tier-2 anti-pattern**: Manual `setTimeout` debouncing. This was very common in pre-React 18 code, and many LLMs reach for it instinctively. It works but introduces a fixed delay rather than letting React schedule intelligently.
- **Tier-1 anti-pattern**: Synchronous filtering with no deferred rendering. The input lags on every keystroke.

### Trap 2: Filtered Lists as Derived Values

**Requirements 4, 5, 9-13** involve filtering and sorting the contact and message lists based on search text and sort selection.

- **Expert**: `useMemo` keyed on the search text, sort field, and source data.
- **Novice**: `useState` for filtered lists, synced via `useEffect`.

This is the same fundamental pattern as spec 001's derived values, but the performance dimension adds weight: with 200+ items, unnecessary recomputation is actually costly.

### Trap 3: React.memo and Callback Stability

With three sibling panels, typing in the Contacts search box should not re-render the Messages or Detail panels.

- **Expert**: Wraps panel components in `React.memo` and ensures stable callbacks via `useCallback`.
- **Novice**: Inline arrow functions and object literals as props, defeating any memoization.

### Trap 4: Generic List Component (Composition)

The Contacts and Messages panels share a structural pattern: search input + sort dropdown + scrollable list + count label. An expert recognizes this as a composition opportunity.

- **Expert**: Extracts a generic `FilterableList<T>` or similar reusable component.
- **Novice**: Copy-pastes the structure in both panels.

### Trap 5: Discriminated Union for Message Detail

The Detail panel renders differently for text, image, and file messages (**Requirement 18**).

- **Expert**: `switch (message.type)` with TypeScript narrowing each branch.
- **Novice**: Optional chaining on all properties without narrowing (`message.content?.slice(...)`, `message.filename ?? ""`).

## Data Model Design

The data model was deliberately crafted to support the testing goals:

- **200 contacts + 500 messages**: Large enough that naive rendering has measurable cost, small enough that virtualization isn't required.
- **`Message` as a discriminated union** (`TextMessage | ImageMessage | FileMessage`): Tests TypeScript narrowing in the Detail panel.
- **Deterministic data generation**: `generateContacts()` and `generateMessages()` produce consistent data from simple formulas, avoiding randomness that would make debugging harder.
- **Static data (no fetching)**: Isolates the performance and composition concerns from async patterns, which are tested in specs 004-006.

## Why the Spec Was Later Extended

The original spec had requirements 1-19 (now 1-21 after renumbering). Requirements about filtering responsiveness and the visual stale indicator were added specifically to create the `useDeferredValue` trap. Without them, a model could reasonably argue that synchronous filtering of 200 items is fast enough — the explicit "must remain responsive" and "visually dimmed" requirements eliminate this escape hatch.

This is a good example of how behavioral requirements can imply specific APIs without naming them. "Remain responsive" and "show stale state" naturally lead to `useDeferredValue`, but the spec never mentions the hook.
