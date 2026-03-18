# Multi-Tab Document Editor

## Overview

A tabbed document editor supporting multiple document types. Each editor type is loaded on demand when first opened. Switching between tabs preserves the document state without re-loading.

## Requirements

### Functional Requirements

1. The app has a **tab bar** at the top and an **editor area** below.

### Document Types

2. Three document types are supported: **Plain Text**, **Markdown**, and **JSON**.
3. Each document type has its own editor component with type-specific behavior:
   - **Plain Text**: A simple textarea. Shows a **word count** and **line count** below the editor.
   - **Markdown**: A textarea on the left and a **live HTML preview** on the right (split view). The preview renders basic Markdown (headings with `#`, bold with `**`, italic with `*`, lists with `-`, code blocks with triple backticks). A full Markdown parser is not required — basic patterns are sufficient.
   - **JSON**: A textarea with a **validation indicator**. When the content is valid JSON, show "✓ Valid JSON" in green. When invalid, show "✗ Invalid JSON: {error message}" in red. A **"Format"** button auto-formats the JSON (pretty-print with 2-space indent).

### Tab Management

4. A **"New Document"** button opens a dropdown to select the document type. Selecting a type adds a new tab.
5. Each tab shows the document **title** (editable by double-clicking the tab) and a **close button** ("×").
6. Clicking a tab switches to that document.
7. The editor component for a document type is **loaded on demand** — it is not downloaded until the first time a document of that type is opened. The tab area should show a loading indicator while the editor loads.
8. When switching between tabs, the document content and cursor position are **preserved**. The editor for the previously active tab is not destroyed.
9. Closing a tab removes the document. If the active tab is closed, the previous tab becomes active (or the next tab if no previous tab exists).
10. If all tabs are closed, a placeholder "Open a new document to get started" is shown.

### Starter Documents

11. On initial load, one Plain Text document is pre-opened with sample content.

## Data Model

The TypeScript types are provided in `data-model.ts`. You must use these types.

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  [+ New Document]  │
│  │ Notes  × │ │ README × │ │config.json×│                   │
│  └──────────┘ └──────────┘ └──────────┘                      │
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────────┐  │
│  │ # My README            │  │ <h1>My README</h1>         │  │
│  │                        │  │                            │  │
│  │ This is a **bold**     │  │ This is a <b>bold</b>      │  │
│  │ text with *italic*.    │  │ text with <i>italic</i>.   │  │
│  │                        │  │                            │  │
│  │ - Item 1               │  │ <ul><li>Item 1</li>        │  │
│  │ - Item 2               │  │ <li>Item 2</li></ul>       │  │
│  └────────────────────────┘  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries.
- No external UI component libraries.
- No external Markdown parsing libraries (implement basic patterns manually).
- No external code editor libraries (use plain `<textarea>`).
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- File saving/loading is not required.
- Syntax highlighting is not required.
- Full Markdown spec compliance is not required (basic patterns only).
