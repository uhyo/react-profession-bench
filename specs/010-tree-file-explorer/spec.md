# Tree View File Explorer

## Overview

A file explorer with an expandable/collapsible tree view, keyboard navigation, and a file preview panel.

## Requirements

### Functional Requirements

1. The app displays a **tree view** of files and directories on the left, and a **preview panel** on the right.

### Tree View

2. The tree data is provided by `data-model.ts`. The tree has directories (which can contain files and other directories) and files.
3. Directories can be **expanded** or **collapsed** by clicking on them. They start collapsed by default.
4. Each tree item displays an **icon** ("📁" for collapsed directories, "📂" for expanded directories, "📄" for files) followed by the **name**.
5. Clicking a **file** selects it and shows its content in the preview panel. The selected file is visually highlighted.
6. Clicking a **directory** toggles its expanded state but does not affect the file selection.

### Keyboard Navigation

7. The tree view is fully keyboard-navigable:
   - **Arrow Down**: Move focus to the next visible item.
   - **Arrow Up**: Move focus to the previous visible item.
   - **Arrow Right**: If on a collapsed directory, expand it. If on an expanded directory or a file, move focus to the first child (or do nothing for files).
   - **Arrow Left**: If on an expanded directory, collapse it. If on a collapsed directory or a file, move focus to the parent directory.
   - **Enter** or **Space**: Select a file (show preview) or toggle a directory.
   - **Home**: Move focus to the first item in the tree.
   - **End**: Move focus to the last visible item in the tree.
8. Only one item in the tree has focus at a time. Focus is visually indicated.

### Preview Panel

9. When no file is selected, the preview panel shows "Select a file to preview".
10. When a file is selected, the preview panel shows the file **name**, **size** (formatted as human-readable, e.g., "2.4 KB"), **type**, and **content** (a text preview).

### Search

11. A **search input** above the tree filters the tree to show only items whose name matches the search text (case-insensitive partial match). Matching files are shown, and their ancestor directories are automatically expanded to make them visible.
12. When the search is cleared, the tree returns to its previous expanded/collapsed state.

## Data Model

The TypeScript types and tree data are provided in `data-model.ts`. You must use these types.

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  File Explorer                                                │
│                                                              │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  │
│  │ [Search...............]  │  │ Preview                   │  │
│  │                         │  │                           │  │
│  │ 📂 src                  │  │ Name: App.tsx             │  │
│  │   📂 components         │  │ Size: 1.2 KB             │  │
│  │     📄 Header.tsx  ←    │  │ Type: tsx                 │  │
│  │     📄 Footer.tsx       │  │                           │  │
│  │   📄 App.tsx            │  │ function App() {          │  │
│  │   📄 main.tsx           │  │   return <div>...</div>;  │  │
│  │ 📁 public               │  │ }                         │  │
│  │ 📄 package.json         │  │                           │  │
│  └─────────────────────────┘  └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries.
- No external UI component libraries.
- No external tree view libraries.
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- File editing is not required.
- Drag-and-drop is not required.
- Creating/deleting files is not required.
