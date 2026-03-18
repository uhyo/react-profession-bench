# Task Board with Reusable Components

## Overview

A task management board with multiple async actions. Each action button automatically shows a pending state while the operation is in progress. The app uses several reusable components that are not specific to the task domain.

## Requirements

### Functional Requirements

1. The app displays a **task list**, a **task creation form**, and a **filter bar**.

### Task List

2. Each task displays: a **title**, a **status badge** ("To Do", "In Progress", "Done"), a **priority badge** ("Low", "Medium", "High"), and **action buttons**.
3. Action buttons per task:
   - **"Start"** (visible when status is "To Do") — changes status to "In Progress".
   - **"Complete"** (visible when status is "In Progress") — changes status to "Done".
   - **"Reopen"** (visible when status is "Done") — changes status to "To Do".
   - **"Delete"** — removes the task after confirmation.
4. All action buttons call async API functions provided in `data-model.ts`. Each API call takes ~1 second.
5. While an API call is in flight, the button that triggered it must show a **pending state**: its label changes (e.g., "Starting..."), it appears visually disabled, and it does **not** prevent interaction with other buttons on the same or different tasks. Multiple actions across different tasks can be in flight simultaneously, each showing their own independent pending state.
6. If an API call fails (10% chance), the error is shown as a brief notification and the task state is not changed.

### Task Creation

7. A form at the top allows creating a new task with a **title** (text input, required) and **priority** (select: "Low", "Medium", "High").
8. The form has a **"Create Task"** button. While the creation API call is in flight, the button shows a pending state ("Creating...") and is disabled.
9. On successful creation, the form resets and the new task appears in the list.
10. Pressing **Enter** in the title input submits the form.

### Filter Bar

11. A **status filter** allows showing: "All", "To Do", "In Progress", "Done". Implemented as a group of toggle buttons where exactly one is selected at a time.
12. A **priority filter** allows showing: "All", "Low", "Medium", "High". Same toggle button group pattern.
13. Both filters default to "All".
14. Filters are applied simultaneously. A task is shown only if it matches both filters (or the filter is "All").

### Delete Confirmation

15. Clicking "Delete" opens a **confirmation dialog** with the message "Delete task '{title}'?" and two buttons: "Cancel" and "Delete".
16. The confirmation dialog appears as a modal overlay. Clicking outside the dialog or pressing **Escape** closes it without deleting.
17. The "Delete" button in the dialog also shows a pending state while the API call is in flight.

### Empty State

18. When no tasks match the current filters, show "No tasks match the current filters."
19. When there are no tasks at all, show "No tasks yet. Create one above!"

### Reusable Component Requirements

20. The pending-state button behavior (requirements 5, 8, 17) must be implemented as a **single reusable component** used across all action buttons and the create button. It should not be duplicated.
21. The toggle button group (requirements 11-12) must be implemented as a **single reusable component** used for both filters. It should accept any set of options.
22. The confirmation dialog (requirements 15-17) must be a **reusable component** not specific to task deletion.

## Data Model

The TypeScript types and simulated API are provided in `data-model.ts`. You must use these types and API functions.

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Task Board                                                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [New task title...........] [Priority ▾] [Create Task] │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Status: [All] [To Do] [In Progress] [Done]                  │
│  Priority: [All] [Low] [Medium] [High]                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Fix login bug                    High · To Do          │  │
│  │                         [Start]  [Delete]              │  │
│  │────────────────────────────────────────────────────────│  │
│  │ Update documentation             Low · In Progress     │  │
│  │                         [Complete]  [Delete]           │  │
│  │────────────────────────────────────────────────────────│  │
│  │ Deploy v2.0                      Medium · Done         │  │
│  │                         [Reopen]  [Delete]             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries.
- No external UI component libraries.
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.
- You must use the simulated API from `data-model.ts` without modification.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- Drag-and-drop reordering is not required.
- Persistence to localStorage is not required.
- Due dates or task descriptions are not required.
