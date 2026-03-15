# Notification-Enabled Activity Feed

## Overview

An activity feed that receives real-time events from a simulated WebSocket connection, with configurable notification behavior (sound, toast popups, filtering). Users can adjust notification settings without interrupting the event stream.

## Requirements

### Functional Requirements

1. The app has three sections: a **settings panel** (left), the **activity feed** (center), and a **toast area** (top-right corner, overlaying the page).

### Activity Feed

2. A simulated WebSocket connection (provided in `data-model.ts`) delivers events at random intervals.
3. Events appear in the feed in real time, newest at the top. The feed shows up to 100 events.
4. Each event displays: the event **type** (with a colored badge), a **title**, a **description**, and a **timestamp** formatted as `HH:mm:ss`.
5. The feed can be **paused** via a "Pause" toggle button. While paused, incoming events are buffered but not displayed. When resumed, all buffered events appear at once.
6. A **count badge** on the "Pause" button shows the number of buffered events while paused (e.g., "Resume (5)").

### Notification Settings

7. The settings panel has the following controls:
   - **Sound notifications**: on/off toggle. When on, a short beep is played for each incoming event (use the provided `playNotificationSound()` function from `data-model.ts`).
   - **Toast notifications**: on/off toggle. When on, a toast popup appears for each incoming event.
   - **Toast duration**: a slider (1–10 seconds) controlling how long each toast stays visible. Default: 3 seconds.
   - **Keyword filter**: a text input. When non-empty, sound and toast notifications are only triggered for events whose title or description contains the keyword (case-insensitive). Events still appear in the feed regardless of the keyword filter.
   - **Minimum severity**: a dropdown ("All", "Warning & Error", "Error only"). Sound and toast notifications are only triggered for events at or above the selected severity. Events still appear in the feed regardless of severity filter.

8. **Changing notification settings must not cause the event subscription to be re-established.** The event listener should always use the latest settings without disconnecting and reconnecting. This is a critical requirement for real-time feeds — reconnecting would cause missed events.

### Toast Notifications

9. Toast popups appear in the top-right corner, stacked vertically. Each toast shows the event type, title, and a "Dismiss" button.
10. Toasts automatically disappear after the configured duration.
11. A maximum of 5 toasts are shown at once. If more arrive, the oldest toast is removed.
12. Toasts can be manually dismissed by clicking the "Dismiss" button.

### Auto-Save Draft Notes

13. A **notes textarea** at the bottom of the settings panel allows the user to write freeform notes.
14. The notes are automatically saved to `localStorage` at a configurable interval. The interval is controlled by an **"Auto-save interval"** dropdown in settings: 5s, 10s, 30s, 60s. Default: 10s.
15. When the auto-save fires, it must save the **latest** content of the notes — not a stale version captured when the timer was started.
16. Changing the auto-save interval resets the timer but must not lose the current notes content.
17. A small "Last saved: HH:mm:ss" indicator is shown below the textarea.

## Data Model

The TypeScript types, simulated WebSocket, and sound function are provided in `data-model.ts`. You must use them as-is.

## UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│                                               ┌──────────────┐  │
│                                               │ 🔵 Deploy    │  │
│  ┌──────────────────┐  ┌──────────────────┐  │ completed     │  │
│  │ Settings         │  │ Activity Feed    │  │ [Dismiss]    │  │
│  │                  │  │                  │  └──────────────┘  │
│  │ Sound: [ON/OFF]  │  │ [Pause/Resume]   │  ┌──────────────┐  │
│  │ Toast: [ON/OFF]  │  │                  │  │ 🟡 Memory    │  │
│  │ Duration: [===3] │  │ 🔴 ERROR 14:32  │  │ warning      │  │
│  │ Keyword: [     ] │  │ DB conn lost     │  │ [Dismiss]    │  │
│  │ Severity: [All▾] │  │                  │  └──────────────┘  │
│  │                  │  │ 🔵 INFO  14:31  │                     │
│  │ Notes            │  │ Deploy completed │                     │
│  │ ┌──────────────┐ │  │                  │                     │
│  │ │              │ │  │ 🟡 WARN  14:30  │                     │
│  │ │              │ │  │ Memory > 80%     │                     │
│  │ └──────────────┘ │  │                  │                     │
│  │ Auto-save: [10s▾]│  │ ...              │                     │
│  │ Last saved: 14:32│  │                  │                     │
│  └──────────────────┘  └──────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries (no Redux, Zustand, Jotai, etc.).
- No external UI component libraries.
- No external notification or toast libraries.
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.
- You must use the simulated WebSocket and sound function from `data-model.ts` without modification.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required (toasts may simply appear/disappear).
- Actual audio playback is not required — the provided `playNotificationSound()` is a no-op stub that logs to the console.
- Actual WebSocket is not required — the simulated connection in `data-model.ts` is used.
