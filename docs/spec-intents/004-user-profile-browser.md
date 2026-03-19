# Spec 004: User Profile Browser — Design Intent

## Purpose

This spec tests **Suspense for async data fetching** — the most significant paradigm shift in React 18/19. The profile browser's three independently-loaded sections (Profile Info, Posts, Followers) are the textbook case for granular Suspense boundaries, and the profile-to-profile navigation tests `useTransition` for keeping the old UI visible.

This is the spec where the gap between "knows React basics" and "knows modern React" should be most visible.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Effect Hygiene | **25%** | Primary focus. With Suspense, data fetching needs zero `useEffect`. |
| Accessibility | **20%** | Loading skeletons, error states, and navigation all have a11y implications. |
| State Architecture | 15% | Navigation state + cached user list + per-section async state. |
| Component Design | 15% | Section components, error boundaries, skeleton components. |
| Performance | 15% | useTransition for navigation, user list caching. |
| TypeScript Quality | 10% | Types are straightforward; not the focus. |

## Key Traps

### Trap 1: Suspense vs useEffect for Data Fetching

The core trap. **Requirements 3, 7-9** describe async data loading with loading skeletons.

- **Expert (score 5)**: Uses `<Suspense fallback={<Skeleton />}>` wrapping each section. Inside, uses React 19's `use()` hook to read a promise. No `useEffect`, no `useState`, no `isLoading` state. The loading lifecycle is declarative.
- **Tier-2 (score 3)**: `useEffect` + `useState` + `isLoading` for each section. Works correctly but requires ~15 lines of boilerplate per section that Suspense eliminates.
- **Tier-1 (score 1)**: No loading states at all, or data fetched in parent and passed down synchronously.

This trap was designed with the awareness that **no current model is likely to use Suspense correctly**. The 2026-03-15 benchmark confirmed this — all five tested models used the useEffect pattern. The trap exists to detect when models eventually catch up to this API.

### Trap 2: Granular Suspense Boundaries

**Requirement 8**: "Each section fetches its data independently. The sections should load progressively — whichever data arrives first should display first."

- **Expert**: Three separate `<Suspense>` boundaries — one for Profile, one for Posts, one for Followers. Each has its own skeleton fallback. When posts take 1000ms and followers take 700ms, followers appear 300ms earlier.
- **Anti-pattern**: A single `<Suspense>` boundary wrapping all three sections. Everything waits for the slowest fetch, defeating progressive loading.

### Trap 3: useTransition for Profile-to-Profile Navigation

**Requirement 15**: "When navigating from one user profile to another, the new user's data loads while the previous profile remains visible — the UI should not flash to a blank/loading state."

- **Expert**: Wraps the navigation state update in `startTransition`, which tells React to keep showing the old UI while the new data loads. Combined with Suspense, the old profile stays visible until the new one is ready.
- **Anti-pattern**: Immediate state update causes the old profile to unmount and show skeletons, creating a jarring flash.

### Trap 4: Error Boundaries Per Section

**Requirement 14**: "If any individual section's API call fails, that section shows an error with a retry button. Other sections should not be affected."

- **Expert**: Each section is wrapped in an error boundary (class component or library). The retry button resets the boundary (via key prop or `resetErrorBoundary`), re-triggering the suspended fetch.
- **Anti-pattern (with Suspense)**: A single top-level error boundary that crashes the entire profile view when one section fails.
- **Anti-pattern (without Suspense)**: `try/catch` in `useEffect` with per-section error state. Functional but verbose and misses the React model.

### Trap 5: User List Caching

**Requirement 13**: "When returning to the user list, the previously loaded user list should still be visible without re-fetching."

- **Expert**: The user list data is stored in a stable location (state in the parent component, or a module-level cache) and not re-fetched on navigation.
- **Anti-pattern**: Re-fetching on every mount, or losing the data when the component unmounts.

## Data Model Design

The simulated API was designed with specific characteristics:

- **Different delay per endpoint**: `fetchUserProfile` (600ms), `fetchUserFollowers` (700ms), `fetchUserPosts` (1000ms). Posts are deliberately slowest so that progressive loading is visually obvious — profile and followers should appear before posts.
- **Random variance (±200ms)**: Ensures the order of resolution isn't always the same, testing that the code handles any order correctly.
- **10% failure rate**: Forces error handling. Not so high that the app is unusable, but high enough that errors are seen in typical testing.
- **20 users with interconnected followers**: Clicking a follower navigates to their profile, testing the transition pattern.

## Why This Spec Matters

Suspense for data fetching represents React's vision for how async UI should work. The `useEffect` + loading state pattern is to Suspense what class components were to hooks — it works, but it's the old paradigm. By 2026, React's documentation strongly recommends Suspense for new code.

This spec will become increasingly useful as models are trained on more recent React documentation and examples. Currently it measures a ceiling that no model reaches; over time, it will differentiate models that have internalized the Suspense mental model from those that haven't.

## Observations from Initial Benchmark

All five models (Sonnet, Opus, Haiku, GPT-4.1, GPT-5.4) used the `useEffect` pattern. No model attempted Suspense. GPT-5.4 scored highest (74) due to superior TypeScript and accessibility, despite also using `useEffect`. This confirms that the spec differentiates on multiple dimensions even when its primary target (Suspense) is universally missed.
