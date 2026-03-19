# Spec 011: Tooltip and Popover System — Design Intent

## Purpose

This spec tests **platform API awareness** — whether the model knows to use the HTML **Popover API** and **CSS Anchor Positioning** instead of reimplementing overlay behavior in JavaScript. It also tests **reusable component API design** (the tooltip/popover must be generic, not table-specific), **ref-as-prop** (React 19's elimination of `forwardRef`), and **`createPortal`** as the fallback approach.

This is unique among the specs in that the highest-scoring approach involves writing *less* React code, not more.

## Rubric Weights

| Category | Weight | Rationale |
|---|---|---|
| Component Design | **25%** | Co-primary. Reusable Tooltip/Popover components with clean API. |
| Effect Hygiene | **20%** | Co-primary. The Popover API eliminates 3+ effects (click-outside, Escape, scroll/resize). |
| Accessibility | **20%** | `role="tooltip"`, `aria-describedby`, keyboard-navigable popover menu, `aria-sort` on table. |
| TypeScript Quality | 15% | Typed component props for the reusable tooltip/popover API. |
| State Architecture | 10% | Sorted user data, open/close state for overlays. |
| Performance | 10% | `useMemo` for sorted data. |

## Key Traps

### Trap 1: Popover API vs createPortal

**Requirements 9, 14** specify rendering outside the table DOM to avoid clipping. **Requirement 15** specifies click-outside and Escape to close.

- **Expert**: The HTML `popover` attribute on the overlay element. The browser renders it in the top layer (above everything, immune to z-index and overflow). `popover="auto"` provides built-in light dismiss (click outside closes) and Escape handling. Zero JavaScript needed for these behaviors.
- **Tier-1 fallback**: `createPortal` to `document.body` + `useEffect` for document click listener + `useEffect` for Escape keydown listener + `useEffect` for scroll/resize repositioning. This is the traditional React approach — it works correctly but requires ~3 effects and ~50 lines of JS that the Popover API eliminates.
- **Poor**: Inline rendering inside the table. Clipped by overflow.

### Trap 2: CSS Anchor Positioning vs getBoundingClientRect

**Requirements 8, 13** specify positioning relative to the trigger with viewport-aware flipping.

- **Expert**: CSS Anchor Positioning — the trigger has `anchor-name`, the popover uses `position-anchor` + `position-area`. Viewport flipping is handled by `position-try-fallbacks`. All declarative CSS, no JavaScript.
- **Tier-1 fallback**: `getBoundingClientRect()` in an effect or event handler, manual top/left calculation, manual viewport bound checking, and scroll/resize listeners to recalculate. Works but is ~50 lines of JS that CSS replaces with ~5 declarations.

### Trap 3: ref-as-prop (React 19)

**Requirement 18** asks for a reusable tooltip component. If refs are used (for the portal approach), the component needs to measure the trigger element.

- **Expert (if using refs)**: The component declares `ref` in its props interface as a regular prop. In React 19, `ref` is just a prop — no `forwardRef` wrapper.
- **Tier-2**: `React.forwardRef` to pass the ref. Works but is the pre-React 19 pattern.
- **Note**: With the Popover API + CSS Anchor Positioning approach, refs for positioning may not be needed at all (the browser handles positioning via CSS). Refs may still be used for imperative `showPopover()`/`hidePopover()`.

### Trap 4: Hover Delay Timer Cleanup

**Requirement 6** specifies a 300ms hover delay for tooltips.

This is a classic effect cleanup test. The timer must be cleared when the mouse leaves — otherwise the tooltip appears after the user has already moved away. With the Popover API this can be handled via `showPopover()`/`hidePopover()` in mouse event handlers without effects.

## Data Model Design

The user table has 30 rows — enough to require scrolling and test tooltip positioning near viewport edges. The `STATUS_DESCRIPTIONS` record provides tooltip content for the status column. The `Role` and `Status` types are simple string unions.

## Why This Spec Exists

This is the only spec where the best answer is to leverage the **web platform** rather than React. The HTML Popover API (shipped in all major browsers) and CSS Anchor Positioning solve overlay rendering, dismiss behavior, and positioning — problems that React developers have traditionally solved with `createPortal`, `useEffect`, and manual DOM measurement.

Testing platform awareness is important because overuse of React (reimplementing what the browser provides) is a form of anti-pattern. The best React code is often the code you don't write.
