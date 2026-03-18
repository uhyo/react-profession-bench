# Settings Dashboard with Undo/Redo

## Overview

A settings dashboard with grouped controls where every change is undoable. Settings are distributed to preview components that reflect the current configuration in real time.

## Requirements

### Functional Requirements

1. The app has a **toolbar** at the top (undo/redo/reset), a **settings panel** on the left, and a **live preview** on the right that reflects the current settings.

### Settings Groups

2. **Appearance** group:
   - **Theme**: radio buttons — "Light", "Dark", "System". Default: "Light".
   - **Accent Color**: a select dropdown with 6 color options ("Blue", "Green", "Red", "Purple", "Orange", "Teal"). Default: "Blue".
   - **Font Size**: a range slider from 12 to 24 (px). Default: 16. The current value is displayed next to the slider.
   - **Font Family**: a select dropdown ("Sans-serif", "Serif", "Monospace"). Default: "Sans-serif".

3. **Layout** group:
   - **Sidebar Position**: radio buttons — "Left", "Right". Default: "Left".
   - **Show Header**: checkbox. Default: checked.
   - **Show Footer**: checkbox. Default: checked.
   - **Content Width**: radio buttons — "Narrow", "Medium", "Wide". Default: "Medium".

4. **Notifications** group:
   - **Email Notifications**: checkbox. Default: checked.
   - **Push Notifications**: checkbox. Default: unchecked.
   - **Notification Frequency**: select dropdown — "Immediate", "Hourly", "Daily". Default: "Immediate". This dropdown is **disabled** when both Email and Push notifications are unchecked.

### Undo/Redo

5. Every individual setting change is recorded as an action in the undo history.
6. An **"Undo"** button reverts the most recent change. A **"Redo"** button re-applies the most recently undone change.
7. Undo is disabled when there is no history. Redo is disabled when there are no undone actions.
8. Making a new change after undoing clears the redo history (standard undo/redo behavior).
9. **Keyboard shortcuts**: **Ctrl+Z** triggers Undo, **Ctrl+Y** (or **Ctrl+Shift+Z**) triggers Redo. These work regardless of which element has focus.
10. A **"Reset to Defaults"** button resets all settings to their default values. This is recorded as a single action in the undo history (undoing it restores all previous values at once).

### Live Preview

11. The preview panel shows a mock page layout that reflects the current settings:
    - Theme changes the background/text colors.
    - Accent color is used for headings and links in the preview.
    - Font size and family affect the preview text.
    - Sidebar position determines the layout direction.
    - Show Header/Footer toggles visibility of mock header/footer sections.
    - Content width adjusts the preview's max-width.
12. The preview updates immediately as settings change.

### Settings Distribution

13. The settings values must be accessible to all preview sub-components **without prop drilling through intermediate components**. There are at least 3 levels of nesting between the settings source and the deepest preview component that reads a setting.

### History Display

14. Below the toolbar, a small **history indicator** shows: "Change X of Y" (where X is the current position and Y is the total number of changes). If no changes have been made, show "No changes".

## Data Model

The TypeScript types are provided in `data-model.ts`. You must use these types.

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [← Undo] [Redo →] [Reset to Defaults]   Change 3 of 5     │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────────────────┐  │
│  │ Appearance         │  │         Live Preview           │  │
│  │ Theme: ○L ●D ○S    │  │  ┌──────────────────────────┐ │  │
│  │ Accent: [Blue ▾]   │  │  │ Mock Header              │ │  │
│  │ Font: [===16===]   │  │  ├────────┬─────────────────┤ │  │
│  │ Family: [Sans ▾]   │  │  │Sidebar │ Content area    │ │  │
│  │                    │  │  │        │ with settings   │ │  │
│  │ Layout             │  │  │        │ applied...      │ │  │
│  │ Sidebar: ●L ○R     │  │  ├────────┴─────────────────┤ │  │
│  │ Header: ☑          │  │  │ Mock Footer              │ │  │
│  │ Footer: ☑          │  │  └──────────────────────────┘ │  │
│  │ Width: ○N ●M ○W    │  │                               │  │
│  │                    │  └────────────────────────────────┘  │
│  │ Notifications      │                                      │
│  │ Email: ☑           │                                      │
│  │ Push:  ☐           │                                      │
│  │ Freq:  [Immediate▾]│                                      │
│  └────────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries (no Redux, Zustand, Jotai, etc.).
- No external UI component libraries.
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- Persistence to localStorage is not required.
- Actual settings application (affecting the real page) is not required — the preview is a mock.
