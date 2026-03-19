# Spec 005: Responsive System Status Dashboard — Design Intent

## Purpose

This spec is a focused test of **`useSyncExternalStore`** — React 18's hook for subscribing to external data sources. The dashboard subscribes to five different browser APIs and a custom event bus, each of which is the textbook use case for this hook.

The hook is underused in practice because `useEffect` + `useState` + `addEventListener` "works." This spec measures whether a model understands *why* `useSyncExternalStore` exists (tearing prevention, SSR compatibility, cleaner subscription code) and reaches for it in the right context.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Effect Hygiene | **30%** | Primary focus. Six external subscriptions, each a `useSyncExternalStore` opportunity. |
| State Architecture | 15% | Filtered events and count summary should be derived. |
| Component Design | 15% | Status cards, event feed, filter bar, snapshot log. |
| TypeScript Quality | 10% | Types are straightforward. |
| Performance | 10% | Filtered events benefit from `useMemo`, but dataset is small. |
| Accessibility | 10% | Live-updating status values, filter toggles. |

## Key Traps

### Traps 1-5: Five Browser API Subscriptions

Each status card subscribes to a different browser API. Each is a separate `useSyncExternalStore` opportunity.

| Card | Subscribe to | getSnapshot |
|---|---|---|
| Online Status | `window 'online'/'offline'` events | `navigator.onLine` |
| Viewport Size | `window 'resize'` event | `window.innerWidth` + `window.innerHeight` |
| Color Scheme | `matchMedia('(prefers-color-scheme: dark)')` `.addEventListener('change')` | `.matches` |
| Reduced Motion | `matchMedia('(prefers-reduced-motion: reduce)')` `.addEventListener('change')` | `.matches` |
| Document Visibility | `document 'visibilitychange'` event | `document.visibilityState` |

For each, the pattern is identical:
```ts
function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => { window.addEventListener('online', callback); window.addEventListener('offline', callback); return () => { ... }; },
    () => navigator.onLine,
  );
}
```

- **Expert**: Custom hooks wrapping `useSyncExternalStore`. Recognizes that the Color Scheme and Reduced Motion hooks share the same pattern (both use `matchMedia`) and creates a generic `useMediaQuery(query)` hook.
- **Tier-2**: `useEffect` + `useState` + `addEventListener` for each. This works but:
  - Is prone to **tearing**: the initial `useState(navigator.onLine)` might read a different value than what's true at commit time.
  - Requires manual cleanup that mirrors the subscription exactly.
  - Has no SSR story (no `getServerSnapshot` parameter).
- **Tier-1**: No subscription at all — reads the value once on mount and never updates.

### Trap 6: Event Bus with useSyncExternalStore-Shaped API

The event bus in `data-model.ts` was **deliberately designed** to match the `useSyncExternalStore` API:

```ts
export function subscribeToEventBus(listener: EventBusListener): () => void { ... }
export function getEventBusSnapshot(): BusEvent[] { ... }
```

`subscribe` takes a callback, returns an unsubscribe function. `getSnapshot` returns the current state. This is *exactly* the `(subscribe, getSnapshot)` signature of `useSyncExternalStore`.

- **Expert**: Recognizes the API shape and uses `useSyncExternalStore(subscribeToEventBus, getEventBusSnapshot)` directly.
- **Novice**: Ignores the `getEventBusSnapshot` function entirely and subscribes via `useEffect`, manually accumulating events in `useState`.

This is the most deliberate trap in the spec. The API was hand-shaped to make the expert path obvious to anyone who knows the hook exists.

### Trap 7: Viewport Size Snapshot Stability

A subtle trap for those who do use `useSyncExternalStore` for viewport size. If `getSnapshot` returns `{ width: window.innerWidth, height: window.innerHeight }`, it creates a new object reference on every call. `useSyncExternalStore` compares snapshots with `Object.is`, so a new object every time means infinite re-renders.

- **Expert**: Returns a primitive (e.g., a string `"1280x720"`) or memoizes the object so the reference is stable when values haven't changed.
- **Novice**: Returns a new `{ width, height }` object every call, causing an infinite loop.

## Data Model Design

The event bus API shape was the single most important design decision. By providing `subscribeToEventBus(listener)` (returns unsubscribe) + `getEventBusSnapshot()`, the data model is a direct invitation to use `useSyncExternalStore`. The internal listener that accumulates events into `allEvents` exists solely to support this pattern.

The `startEventBus()` / `stopEventBus()` functions are separate because they control the event *source*, not the subscription. This is a legitimate `useEffect` use (start on mount, stop on unmount) that helps distinguish effect-for-lifecycle from effect-for-subscription.

## Custom Hook Opportunities

This spec has the highest density of custom hook opportunities:

1. `useOnlineStatus()` — wraps online/offline subscription
2. `useViewportSize()` — wraps resize subscription
3. `useMediaQuery(query)` — generic, reusable for both color scheme and reduced motion
4. `useDocumentVisibility()` — wraps visibilitychange subscription
5. `useEventBus()` — wraps the event bus subscription

An expert implementation would have 4-5 custom hooks (collapsing the two `matchMedia` use cases), each ~5-10 lines, all using `useSyncExternalStore` internally.

## Observations from Initial Benchmark

This spec produced the lowest Sonnet score in the entire benchmark (50/100). Sonnet created a monolithic component with zero `useSyncExternalStore` usage and zero component extraction. Opus scored highest (62) with partial usage. No model recognized the event bus API as a `useSyncExternalStore` shape.

The uniformly low scores validate the spec's purpose: `useSyncExternalStore` is a genuine blind spot, even for frontier models.
