# Spec 006: Notification-Enabled Activity Feed — Design Intent

## Purpose

This spec tests **`useEffectEvent`** (React 19.2) — the hook for reading the latest values inside effects without adding them as dependencies and without re-triggering the effect. The activity feed with configurable notifications and auto-save creates two independent scenarios where this hook is the correct solution.

`useEffectEvent` is the newest API in the benchmark and the one least likely to be in any model's training data. This spec serves as both a current blind-spot detector and a future differentiator as models are trained on more recent React releases.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Effect Hygiene | **30%** | Primary focus. Two `useEffectEvent` opportunities, plus the critical requirement 8. |
| State Architecture | 15% | Buffered events, toast management, settings state. |
| Component Design | 15% | Settings panel, feed, toast area are natural boundaries. |
| TypeScript Quality | 15% | Event types, settings interface. |
| Performance | 5% | Small-scale; not performance-focused. |
| Accessibility | 10% | Toast announcements, toggle buttons. |

## Key Traps

### Trap 1: Event Subscription with Changing Settings (The Core Trap)

**Requirement 8** is the spec's most important requirement: *"Changing notification settings must not cause the event subscription to be re-established."*

The app subscribes to a WebSocket-like event stream and, for each incoming event, decides whether to play a sound and/or show a toast based on the current notification settings. The trap is in how the callback reads those settings.

- **Expert**: Uses `useEffectEvent` to define the event handler. The effect subscribes once (`useEffect(() => connect(onEvent), [])`) and the `onEvent` callback, being an effect event, always reads the latest settings without being listed as a dependency.

  ```tsx
  const onEvent = useEffectEvent((event: ActivityEvent) => {
    if (matchesFilters(event, settings)) {
      if (settings.soundEnabled) playNotificationSound();
      if (settings.toastEnabled) showToast(event);
    }
    addEventToFeed(event);
  });

  useEffect(() => {
    return connect(onEvent);
  }, []);
  ```

- **Tier-2 anti-pattern**: Ref-based workaround. The model creates a `settingsRef` and syncs it via `useEffect(() => { settingsRef.current = settings }, [settings])`, then reads `settingsRef.current` inside the subscription callback. This works and was the standard approach before `useEffectEvent`, but:
  - It requires a separate sync effect for every value the callback needs to read.
  - Forgetting to add a value to the ref sync is a silent bug.
  - It's exactly the manual pattern that `useEffectEvent` automates.

- **Tier-1 anti-pattern**: Including `settings` in the effect's dependency array. This disconnects and reconnects the WebSocket on every settings change, potentially missing events during the reconnection gap.

- **Tier-3 anti-pattern**: ESLint disable comment (`// eslint-disable-next-line react-hooks/exhaustive-deps`) to suppress the missing dependency warning. This hides the problem and risks stale closures.

### Trap 2: Auto-Save with Configurable Interval

**Requirements 14-16** describe auto-saving notes to localStorage at a configurable interval. The interval is a dropdown (5s, 10s, 30s, 60s). The save must always capture the **latest** notes content, and changing the interval should restart the timer but **not** lose the current content.

- **Expert**: The effect depends on `interval` (to restart the timer when it changes). The save logic is a `useEffectEvent` that reads the latest `notes` content.

  ```tsx
  const saveNotes = useEffectEvent(() => {
    localStorage.setItem('notes', notes);
    setLastSaved(new Date());
  });

  useEffect(() => {
    const id = setInterval(saveNotes, interval);
    return () => clearInterval(id);
  }, [interval]);
  ```

- **Tier-2**: Ref-based workaround for notes (`notesRef.current = notes`).
- **Tier-1**: Including `notes` in the dependency array, which restarts the timer on every keystroke — saving every 10 seconds becomes saving immediately after every character, defeating the purpose.

### Trap 3: Pause/Resume Without Disconnecting

**Requirements 5-6**: The feed can be paused. While paused, events are buffered. Resuming shows all buffered events.

- **Expert**: The subscription stays connected. The `paused` state controls whether events are added to the visible feed or a buffer. Since `paused` is read inside the event handler, it's another value that should be accessed via `useEffectEvent`.
- **Anti-pattern**: Disconnecting the WebSocket when pausing and reconnecting when resuming. This loses events during the disconnect.

## Data Model Design

The simulated WebSocket (`connect(onEvent)`) was designed to mimic a real WebSocket's `onmessage` pattern:
- `connect()` takes a single listener function and returns a disconnect function.
- Only one listener at a time (like `ws.onmessage = ...`).
- Events arrive at random intervals (1.5-5s).

This design means reconnecting (disconnecting + connecting with a new listener) creates a gap where events can be lost, making the "don't reconnect" requirement practically important.

The `playNotificationSound()` function is a no-op stub that logs to console. This avoids audio playback issues in automated testing while still being callable and auditable in the code.

## The Two-Trap Structure

This spec is notable for having two independent `useEffectEvent` use cases:

1. **Event subscription** + notification settings (the WebSocket handler)
2. **Auto-save timer** + notes content (the interval handler)

This redundancy is deliberate. If a model knows `useEffectEvent`, it should use it in both places. If it uses the ref workaround, it should use it consistently. A model that uses `useEffectEvent` for one but refs for the other would suggest incomplete understanding.

## Observations from Initial Benchmark

All five models used the ref-based workaround (tier-2). No model attempted `useEffectEvent`. Opus scored highest (61) with clean ref usage and consistent `useCallback`. GPT-5.4 scored lowest (48) with 5 effects including 3 dedicated ref-sync effects — the most verbose version of the workaround.

Notably, the spec still differentiated models despite universal `useEffectEvent` absence: Sonnet (58) vs Opus (61) vs Haiku (51) reflects differences in how cleanly the ref workaround is implemented and how well other aspects (component design, TypeScript) are handled.
