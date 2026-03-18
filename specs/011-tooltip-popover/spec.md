# Tooltip and Popover System

## Overview

A data table with contextual tooltips and popovers. Hovering over a cell shows a tooltip, and clicking a row action button opens a popover menu positioned relative to the button.

## Requirements

### Functional Requirements

1. The app displays a **data table** of users and a **detail popover** system.

### Data Table

2. The table displays rows of user data with columns: **Name**, **Email**, **Role**, **Status**, and **Actions**.
3. The table data is provided by `data-model.ts` (30 rows).
4. Each column header can be clicked to **sort** the table by that column (ascending/descending toggle).
5. The currently sorted column and direction are visually indicated (e.g., "▲" or "▼" next to the header).

### Tooltips

6. Hovering over a **Name** cell shows a tooltip with the user's full profile: name, email, role, and join date. The tooltip appears after a **300ms delay** and disappears when the mouse leaves.
7. Hovering over a **Status** cell shows a tooltip explaining the status (e.g., "Active: User has logged in within the last 30 days").
8. Tooltips are positioned **above** the hovered element, centered horizontally. If the tooltip would overflow the top of the viewport, it should appear **below** instead.
9. Tooltips must render **outside the table's DOM hierarchy** to avoid clipping by overflow or z-index issues.
10. Only one tooltip is visible at a time.

### Action Popovers

11. Each row has an **"Actions"** button (labeled "⋮" or "...").
12. Clicking the Actions button opens a **popover menu** with three options: "View Details", "Edit Role", and "Deactivate" (or "Activate" if the user is inactive).
13. The popover is positioned **below** the button, aligned to the right edge. If it would overflow the bottom of the viewport, it appears **above** instead.
14. The popover must render **outside the table's DOM hierarchy** (same as tooltips).
15. Clicking outside the popover or pressing **Escape** closes it.
16. Only one popover is visible at a time. Opening a new popover closes any previously open one.
17. Clicking "View Details" opens a **detail panel** below the table showing the user's full information. Clicking "Edit Role" cycles the role (admin → editor → viewer → admin). Clicking "Deactivate"/"Activate" toggles the user's status.

### Tooltip Component API

18. The tooltip/popover system must be implemented as a **reusable component** — not hardcoded for this specific table. The component should accept a trigger element and content, and handle positioning and portal rendering internally.

## Data Model

The TypeScript types and user data are provided in `data-model.ts`. You must use these types.

## UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  User Management                                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Name ▲      │ Email           │ Role    │ Status  │ Actions│  │
│  │─────────────┼─────────────────┼─────────┼─────────┼────────│  │
│  │ Alice Jo... │ alice@test.com  │ Admin   │ Active  │  ⋮     │  │
│  │ Bob Smith   │ bob@test.com    │ Editor  │ Active  │  ⋮     │  │
│  │ Carol Wi... │ carol@test.com  │ Viewer  │ Inactive│  ⋮     │  │
│  │             │                 │         │         │┌──────┐│  │
│  │             │                 │         │         ││View  ││  │
│  │             │                 │         │         ││Edit  ││  │
│  │             │                 │         │         ││Deact.││  │
│  │             │                 │         │         │└──────┘│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Detail: Alice Johnson                                           │
│  Email: alice@test.com  Role: Admin  Status: Active              │
│  Joined: 2024-01-15                                              │
└──────────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries.
- No external UI component libraries.
- No external tooltip/popover libraries (no Floating UI, Tippy, Popper, etc.).
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- Pagination is not required.
- Inline cell editing is not required (only via the action menu).
