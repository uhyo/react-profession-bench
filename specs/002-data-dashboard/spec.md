# Multi-Panel Data Dashboard

## Overview

A three-panel data dashboard displaying contacts and their messages. Users can search, sort, and drill down from contacts to messages to message details.

## Requirements

### Functional Requirements

1. The app displays three panels side by side: **Contacts** (left), **Messages** (center), and **Detail** (right).

### Contacts Panel

2. The Contacts panel shows a scrollable list of all contacts.
3. Each contact row displays the contact's **name**, **email**, and the **date of their most recent message** (formatted as `YYYY-MM-DD`).
4. A **search input** at the top of the panel filters contacts by name or email. The filter is case-insensitive and matches partial strings. The list updates as the user types. The search input must remain responsive at all times — the user should never experience typing lag even if the list takes time to update.
5. A **sort dropdown** allows sorting contacts by "Name (A-Z)", "Name (Z-A)", "Most Recent Message", or "Oldest Message".
6. Clicking a contact row selects it (visually highlighted). Only one contact can be selected at a time.
7. A **"Clear Selection"** button is shown when a contact is selected. Clicking it deselects the contact.
8. A **count label** below the list shows: "Showing X of Y contacts".

### Messages Panel

9. When no contact is selected, the Messages panel shows **all messages** across all contacts.
10. When a contact is selected, the Messages panel shows only that contact's messages.
11. Each message row displays the **sender name**, a **truncated preview** of the content (first 50 characters, followed by "..." if longer), the **message type** icon/label ("Text", "Image", or "File"), and the **date** (formatted as `YYYY-MM-DD HH:mm`).
12. A **search input** at the top filters messages by content text. The filter is case-insensitive and matches partial strings. As with the contacts search, the input must remain responsive regardless of how long filtering takes.
13. A **sort dropdown** allows sorting messages by "Newest First" or "Oldest First".
14. Clicking a message row selects it (visually highlighted).
15. A **"Clear Selection"** button is shown when a message is selected. Clicking it deselects the message.
16. A **count label** below the list shows: "Showing X of Y messages".

### Detail Panel

17. When no message is selected, the Detail panel shows a placeholder: "Select a message to view details".
18. When a message is selected, the Detail panel shows the full message content, varying by type:
    - **Text message**: Sender name, full content text, and date.
    - **Image message**: Sender name, a placeholder box showing the image dimensions (e.g., "Image: 800×600"), the alt text, and date.
    - **File message**: Sender name, the filename, file size formatted as human-readable (e.g., "2.4 MB"), and date.

### Filtering Responsiveness

19. When the user types in a search input, the text input must update immediately with no perceptible lag. The list may update with a slight delay if needed, but the input must never feel sluggish.
20. While a list is being updated after a search input change, the list should appear visually dimmed (e.g., reduced opacity) to indicate that the displayed results are stale and an update is in progress.

### Status Bar

21. A **status bar** at the bottom of the app shows: the total number of contacts, the number currently displayed (after filtering), the selected contact name (or "None"), the total number of messages, and the number currently displayed.

## Data Model

The TypeScript types and static data are provided in `data-model.ts`. The file exports the types and two data arrays: `CONTACTS` (200 items) and `MESSAGES` (500 items). You must use these types and data.

## UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ ┌───────────────────┐ ┌───────────────────┐ ┌────────────────────┐  │
│ │ [Search........] │ │ [Search.........] │ │                    │  │
│ │ [Sort: Name A-Z▾] │ │ [Sort: Newest ▾]  │ │   Message Detail   │  │
│ │                   │ │                   │ │                    │  │
│ │ > Alice Smith     │ │ Hey, are you...   │ │ From: Alice Smith  │  │
│ │   alice@test.com  │ │ Text · 2026-03-10 │ │ Date: 2026-03-10   │  │
│ │   2026-03-10      │ │                   │ │                    │  │
│ │                   │ │ Check out this... │ │ Hey, are you coming│  │
│ │   Bob Jones       │ │ Image · 2026-03-09│ │ to the meeting     │  │
│ │   bob@test.com    │ │                   │ │ tomorrow?          │  │
│ │   2026-03-08      │ │ Report Q1.pdf     │ │                    │  │
│ │                   │ │ File · 2026-03-08 │ │                    │  │
│ │ [Clear Selection] │ │ [Clear Selection] │ │                    │  │
│ │ Showing 2 of 200  │ │ Showing 3 of 500  │ │                    │  │
│ └───────────────────┘ └───────────────────┘ └────────────────────┘  │
│                                                                      │
│ Contacts: 200 (showing 2) · Selected: Alice Smith                    │
│ Messages: 500 (showing 3)                                            │
└──────────────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries (no Redux, Zustand, Jotai, etc.).
- No external UI component libraries (no Material UI, Chakra, Ant Design, etc.).
- No external data/utility libraries (no lodash, Ramda, etc.).
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.
- The data is static (imported from the data model). There is no data fetching.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- Virtual scrolling or windowing is not required (but efficient rendering is expected).
- Drag-and-drop is not required.
- Pagination is not required — all items are rendered in the scrollable lists.
