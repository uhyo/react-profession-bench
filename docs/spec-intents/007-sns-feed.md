# Spec 007: SNS Post Feed — Design Intent

## Purpose

This spec tests two React 19 APIs that are both relatively niche and conceptually distinct from the more commonly tested hooks: **`useOptimistic`** for instant UI feedback on async mutations, and the **`<Activity>`** component for deprioritizing offscreen rendering. Additionally, it tests whether the model uses semantic HTML (`<article>`) for content units and applies memoization to prevent unnecessary text re-parsing.

The social feed is a natural fit for these patterns because likes are the prototypical "feels slow if not instant" interaction, and a long feed is the prototypical "offscreen content shouldn't block visible content" scenario.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Effect Hygiene | **25%** | Primary focus. `useOptimistic` replaces the manual setState-before-API pattern. |
| Performance | **25%** | Co-primary. `<Activity>` for offscreen deprioritization + memoized text parsing + `React.memo` on Post. |
| Accessibility | **20%** | `<article>` per post, `aria-pressed` on like, error toast announced. |
| State Architecture | 10% | Straightforward — posts array + pagination state. |
| Component Design | 10% | Natural decomposition (Feed, Post, LikeButton, PostBody). |
| TypeScript Quality | 10% | Types are simple — no discriminated unions or generics. |

## Key Traps

### Trap 1: Like/Unlike with `useOptimistic`

**Requirements 7–9** specify that the UI updates instantly and reverts on failure. This is exactly what `useOptimistic` was designed for.

- **Expert**: `useOptimistic` hook returns an optimistic state and an `addOptimistic` function. On click, the optimistic state is updated immediately. When the API resolves (or rejects), the base state updates and the optimistic layer is automatically reconciled.
- **Tier-2**: Manual optimistic update: `setState` to the hoped-for value before the API call, then revert in a `catch` block. This works but is error-prone — rapid clicks create race conditions (click like, click unlike quickly — which value do you revert to?), and the developer must carefully track the "real" vs "optimistic" state.
- **Tier-3**: No optimistic update — the UI waits for the API response. Visually laggy (800ms+ delay on every click).

### Trap 2: Offscreen Deprioritization with `<Activity>`

**Requirement 13** states that offscreen posts should not compete with visible posts for rendering priority. This is the use case for React's `<Activity>` component.

- **Expert**: Uses `<Activity mode="visible">` / `<Activity mode="hidden">` based on IntersectionObserver visibility tracking. React deprioritizes hidden subtrees, allowing visible posts to render promptly.
- **Acceptable alternative**: CSS `content-visibility: auto` — a browser-level optimization that achieves a similar effect without React involvement.
- **Tier-2**: Unmounting offscreen posts and remounting when scrolled back. This loses component state (like button pending state, etc.) and can be jarring.
- **Tier-3**: No offscreen optimization. All 50+ posts render and update at equal priority.

### Trap 3: Memoized Text Parsing

**Requirements 15–17** specify mention and hashtag parsing. **Requirement 17** explicitly states this should not recompute when unrelated state changes.

- **Expert**: `useMemo` on the parsed/rendered post body, keyed on `body` text. Also `React.memo` on the Post component so a like on post A doesn't re-parse post B.
- **Novice**: Inline parsing on every render. Every like toggle re-parses every visible post's body text.

## Data Model Design

The API has a deliberate 15% failure rate on `toggleLike` to test the rollback path of optimistic updates. The 50 posts with varied timestamps test the relative time formatting ("5m ago", "2h ago") which should be derived, not stored as state.

The `fetchPosts` API supports pagination (page + pageSize) for the infinite scroll requirement.

## Why This Spec Exists

`useOptimistic` and `<Activity>` are among the newest React APIs and are likely underrepresented in LLM training data. This spec creates a scenario where both are the natural, correct choice — unlike contrived examples, the social feed pattern is ubiquitous in real applications. The spec also tests the common pattern of combining `IntersectionObserver` with React (for both infinite scroll and visibility detection).
