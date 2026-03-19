# Spec 010: Tree View File Explorer — Design Intent

## Purpose

This spec tests one of the most complex ARIA widget patterns: **`aria-tree`** with full keyboard navigation (arrow keys, Home/End, Enter/Space). It also tests **recursive component rendering** (a tree node that renders itself for child directories) and **discriminated union narrowing** (FileNode vs DirectoryNode).

Tree views are common in IDEs, file managers, and admin panels, making this a practical test of advanced accessibility and component design skills.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Accessibility | **30%** | Primary focus. aria-tree is one of the hardest ARIA patterns to implement correctly. |
| Component Design | **20%** | Co-primary. Recursive component design, separation of navigation logic. |
| TypeScript Quality | 15% | Discriminated union narrowing for FileNode vs DirectoryNode. |
| Performance | 15% | React.memo on tree nodes, memoized search filtering. |
| State Architecture | 15% | Expanded state, focused item, selected file — multiple coordinated states. |
| Effect Hygiene | 5% | Minimal effects needed (just focus management). |

## Key Traps

### Trap 1: `aria-tree` / `aria-treeitem` Pattern

**Requirements 7–8** describe full keyboard navigation with focus management.

- **Expert**: The tree container has `role="tree"`. Each item has `role="treeitem"`. Directories have `aria-expanded`. Nested item lists have `role="group"`. Only the focused item has `tabindex="0"` (roving tabindex); all others have `tabindex="-1"`. Arrow keys move focus by updating which item has `tabindex="0"` and calling `.focus()`.
- **Tier-2**: Partial ARIA — `role="tree"` on the container but missing `aria-expanded`, `role="group"`, or roving tabindex. Keyboard works via onKeyDown but the structure isn't communicated to assistive technology.
- **Tier-3**: No ARIA roles. Click-only interaction with no keyboard support.

The roving tabindex pattern is particularly important: if all items have `tabindex="0"`, the user must Tab through every item to leave the tree. With roving tabindex, a single Tab exits the tree.

### Trap 2: Recursive TreeNode Component

- **Expert**: A single `TreeNode` component that checks `node.type` and, for directories, renders its children as a list of `TreeNode` components. The recursion is natural and type-safe.
- **Novice**: Flattening the tree into a list and using indentation level to simulate nesting. This loses the semantic tree structure and makes `role="group"` impossible.

### Trap 3: Discriminated Union Narrowing

The `TreeNode = FileNode | DirectoryNode` union requires narrowing to access `children` (directories only) or `content`/`size` (files only).

- **Expert**: `if (node.type === "directory")` narrows to `DirectoryNode`, enabling safe access to `node.children`.
- **Novice**: Optional chaining everywhere (`node.children?.map(...)`) without narrowing — loses type safety.

### Trap 4: Search with Auto-Expand

**Requirement 11** specifies that search results show matching files with ancestor directories auto-expanded. **Requirement 12** says clearing the search restores the previous expanded state.

- **Expert**: The search produces a filtered tree (via `useMemo`) with all ancestor directories of matching files marked as expanded. The "previous expanded state" is stored separately and restored on search clear.
- **Novice**: Mutating the expanded state during search (losing the previous state), or using `useEffect` to sync the expanded state with the search term.

## Data Model Design

The `FILE_TREE` is a realistic project structure (src/, components/, hooks/, public/) with enough depth (3 levels) to test recursion and enough files (14) to test search filtering. File contents are real code snippets so the preview panel has meaningful content to display.

The `FileNode` and `DirectoryNode` discriminated union is the core TypeScript test — the `type` field is the discriminant.

## Why This Spec Exists

The `aria-tree` pattern is arguably the most complex ARIA widget pattern in common use. It requires:
- Correct role hierarchy (`tree` → `treeitem` with `group` for nesting)
- State management (`aria-expanded`, `aria-selected`)
- Focus management (roving tabindex with 7+ keyboard bindings)
- Recursive rendering that maintains semantic structure

This makes it a strong differentiator for accessibility proficiency. The recursive component design is also a React-specific skill that's conceptually different from the flat component hierarchies in most other specs.
