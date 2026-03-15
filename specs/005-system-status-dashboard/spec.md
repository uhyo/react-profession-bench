# Responsive System Status Dashboard

## Overview

A real-time system status dashboard that reactively displays browser and device state: online/offline status, viewport dimensions, color scheme preference, reduced motion preference, document visibility, and events from a custom notification bus.

## Requirements

### Functional Requirements

1. The dashboard shows a grid of **status cards**, each displaying a different piece of system/browser state in real time.

### Status Cards

2. **Online Status** card: Shows "Online" (green) or "Offline" (red) reflecting the browser's current network status. Changes instantly when the user goes online or offline.

3. **Viewport Size** card: Shows the current viewport width and height in pixels (e.g., "1280 × 720"). Updates as the user resizes the browser window.

4. **Color Scheme** card: Shows "Light" or "Dark" reflecting the user's OS-level color scheme preference. Updates instantly when the user toggles their OS dark mode.

5. **Reduced Motion** card: Shows "Enabled" or "Disabled" reflecting the user's `prefers-reduced-motion` media query. Updates instantly when the preference changes.

6. **Document Visibility** card: Shows "Visible" or "Hidden" reflecting whether the page is currently visible or in a background tab. Updates instantly when the user switches tabs.

7. **Language** card: Shows the browser's current language (e.g., "en-US"). This value is read once and does not need to update reactively.

### Notification Feed

8. A **notification feed** is displayed below the status cards. It shows events emitted by a custom event bus provided in `data-model.ts`.

9. The event bus emits events at random intervals (every 2–5 seconds). Each event has a `type` ("info", "warning", "error"), a `message` string, and a `timestamp`.

10. New events appear at the top of the feed. The feed keeps the most recent 50 events and discards older ones.

11. Each event row shows the type (with a colored indicator), the message text, and a relative timestamp (e.g., "3s ago", "1m ago"). The relative timestamps must update live (at least once per second).

12. A **filter bar** above the feed allows filtering events by type using toggle buttons: "Info", "Warning", "Error". All types are enabled by default. Toggling a type on/off shows/hides events of that type.

13. A **count summary** shows: "X total · Y info · Z warning · W error" based on all events (not just filtered ones).

### Snapshot Feature

14. A **"Take Snapshot"** button captures all current status card values and the current event count into a **snapshot log** below the feed.

15. Each snapshot entry shows the timestamp and all captured values. Up to 10 snapshots are kept.

## Data Model

The TypeScript types and the event bus are provided in `data-model.ts`. The event bus starts emitting events when `startEventBus()` is called, and stops when `stopEventBus()` is called. You must use the provided event bus as-is.

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  System Status Dashboard                                      │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Online   │ │ Viewport │ │  Color   │ │ Reduced  │        │
│  │ ● Online │ │ 1280×720 │ │  Dark    │ │ Disabled │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐                                   │
│  │ Visible  │ │ Language │  [Take Snapshot]                  │
│  │ Visible  │ │  en-US   │                                   │
│  └──────────┘ └──────────┘                                   │
│                                                              │
│  Notification Feed                                           │
│  [Info ✓] [Warning ✓] [Error ✓]                             │
│  12 total · 7 info · 3 warning · 2 error                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔴 ERROR   Database connection lost          3s ago    │  │
│  │ 🟡 WARNING Memory usage above 80%           15s ago    │  │
│  │ 🔵 INFO    Deployment completed              1m ago    │  │
│  │ ...                                                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Snapshots                                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 14:32:05 — Online, 1280×720, Dark, Motion: Off, ...   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries (no Redux, Zustand, Jotai, etc.).
- No external UI component libraries.
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.
- You must use the event bus from `data-model.ts` without modification.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- Persistence to localStorage is not required.
- The Battery Status API is not required (it has limited browser support).
