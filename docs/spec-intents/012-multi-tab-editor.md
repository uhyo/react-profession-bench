# Spec 012: Multi-Tab Document Editor — Design Intent

## Purpose

This spec tests **`React.lazy` + `Suspense` for code splitting** and **preserving inactive tab state without remounting**. These are distinct from the Suspense-for-data-fetching pattern tested in spec 004 — here, Suspense is used for lazy component loading, and the preservation requirement tests whether the model understands that unmounting discards component state.

The multi-tab editor also naturally tests derived values (word count, Markdown preview, JSON validation) and tab management state architecture.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| State Architecture | **20%** | Co-primary. Tab management, document state, active tab tracking. |
| Performance | **20%** | Co-primary. React.lazy for code splitting, memoized Markdown preview. |
| Component Design | **20%** | Three distinct editor types with shared interface, tab management. |
| TypeScript Quality | 15% | DocumentType union, typed editor props, lazy component types. |
| Effect Hygiene | 15% | Ideally zero effects — all state is synchronous. |
| Accessibility | 10% | Tab bar ARIA pattern (tablist/tab/tabpanel). |

## Key Traps

### Trap 1: `React.lazy` for On-Demand Editor Loading

**Requirement 7** specifies that editor components are loaded on demand — not downloaded until a document of that type is first opened.

- **Expert**: Each editor is in a separate module, loaded via `React.lazy(() => import('./editors/MarkdownEditor'))`. The first Markdown document triggers the download; subsequent Markdown documents reuse the cached module. A `<Suspense fallback={<Loading />}>` boundary wraps the editor area.
- **Tier-2**: Dynamic `import()` called manually in a `useEffect` or event handler, with the loaded component stored in state. This works but misses React.lazy + Suspense which handles this declaratively.
- **Tier-3**: All editors statically imported at the top of the file. No code splitting.

### Trap 2: Preserving Inactive Tab State

**Requirement 8** specifies that switching tabs preserves content *and cursor position*. This is the key test.

- **Expert**: All open documents' editor components remain mounted but hidden (CSS `display: none` on inactive tabs, `display: block` on active). Since the components stay mounted, their internal React state (textarea value, cursor position, scroll position, undo history) is preserved automatically.
- **Acceptable**: Using the `<Activity>` component to keep inactive editors mounted at lower priority.
- **Tier-2**: Conditionally rendering only the active editor (`{activeId === doc.id && <Editor />}`). The document content is preserved (stored in parent state), but cursor position, selection, scroll position, and internal component state are lost because the component is unmounted and remounted on every tab switch.

This trap is subtle because storing content in state *appears* to preserve state — the text is there when you switch back. But cursor position jumps to the end, scroll resets to top, and any internal undo history is lost. An expert knows that mounting/unmounting has these side effects.

### Trap 3: Derived Values in Editors

Each editor type has derived values that should be computed during render:

- **Plain Text**: Word count and line count from `content`.
- **Markdown**: HTML preview from content (via `useMemo` — the parsing is expensive enough to warrant memoization).
- **JSON**: Validity check from content (try `JSON.parse`, catch error).

The Markdown preview is the strongest test: parsing Markdown on every keystroke without memoization is wasteful, but storing the parsed HTML as state and syncing via `useEffect` is the classic anti-pattern.

### Trap 4: Tab Close Behavior

**Requirement 9** specifies that closing the active tab activates the previous (or next) tab.

- **Expert**: The "next active tab" logic is computed in the close handler: find the previous tab, or the next, or null.
- **Novice**: A `useEffect` watching the documents array to adjust `activeTabId` — treating a synchronous consequence of a user action as a side effect.

## Data Model Design

The `DocumentType` discriminated union (`"plain-text" | "markdown" | "json"`) is simple by design — the complexity is in how the editors are loaded and managed, not in the data model. The `SAMPLE_CONTENT` record provides realistic starter content for each type so the editors have something to display immediately.

The `generateDocumentId()` function uses a simple counter — no async, no complexity. The spec is about component lifecycle, not data fetching.

## Why This Spec Exists

Code splitting with `React.lazy` is a production essential that most other benchmarks ignore. And the tab preservation trap reveals a deep understanding of React's component lifecycle — the difference between "content is preserved" and "all state is preserved" is subtle but critical in real applications like IDEs, email clients, and dashboards.
