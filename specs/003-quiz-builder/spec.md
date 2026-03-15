# Accessible Interactive Quiz Builder

## Overview

A quiz builder where the user creates multiple-choice questions, reorders them, previews the quiz live, and can take the quiz in an interactive preview mode.

## Requirements

### Functional Requirements

1. The app has two modes: **Edit** and **Preview**, toggled via tabs at the top of the page.

### Edit Mode

2. In Edit mode, the screen is split into two panels: the **editor** (left) and the **live preview** (right).
3. The editor displays a list of questions, each editable inline.
4. Each question shows: a **question number** (auto-numbered starting from 1), a **question text input**, a **type selector** (dropdown: "Single Choice", "Multiple Choice", "True/False"), the **answer options** (editable), and a **correct answer indicator**.
5. For **Single Choice** and **Multiple Choice** questions, the answer options are editable text inputs. Each option has a "Remove" button. An "Add Option" button below the options adds a new empty option.
6. For **Single Choice** questions, the correct answer is selected via radio buttons next to each option.
7. For **Multiple Choice** questions, the correct answers are selected via checkboxes next to each option.
8. For **True/False** questions, two fixed options ("True" and "False") are displayed. The correct answer is selected via radio buttons. The options are not editable.
9. When the question type is changed, the answer options are reset: Single Choice and Multiple Choice default to 2 empty options; True/False shows the fixed options with no correct answer selected.
10. Each question has **"Move Up"**, **"Move Down"**, and **"Delete"** buttons.
11. The "Move Up" button is hidden on the first question. The "Move Down" button is hidden on the last question.
12. Deleting a question shows a **confirmation dialog** with the text "Delete question {number}: '{title}'?" (where title is the first 30 characters of the question text, or "Untitled" if empty). The dialog has "Cancel" and "Delete" buttons.
13. An **"Add Question"** button is displayed below the question list. Clicking it adds a new Single Choice question with 2 empty options at the end of the list.
14. The **live preview** panel (right side) shows the quiz as a student would see it: question numbers, question text, and answer options displayed as disabled radio buttons or checkboxes. The preview updates as the user edits.

### Preview Mode

15. In Preview mode, the full screen shows the quiz in an interactive student view: the user can select answers for each question.
16. A **"Submit Quiz"** button is displayed at the bottom. It is disabled until the user has answered all questions.
17. After submitting, each question is highlighted: **green** for correct, **red** for incorrect. The selected answer is marked, and the correct answer is indicated. A **score** is displayed at the top: "You scored X out of Y".
18. A **"Retake Quiz"** button appears after submission, which clears all answers and score.

### Data Constraints

19. A question must have at least 2 answer options (for Single Choice and Multiple Choice). The "Remove" button is hidden when there are only 2 options.
20. The quiz must have at least 1 question to be previewable. If there are no questions in Preview mode, show "No questions yet. Switch to Edit mode to add questions."

## Data Model

The TypeScript types for the quiz data are provided in `data-model.ts`. You must use these types.

## UI Layout

### Edit Mode

```
┌──────────────────────────────────────────────────────────────────┐
│  [ Edit ]  [ Preview ]                                           │
│                                                                  │
│  ┌─────────────────────────────┐  ┌───────────────────────────┐  │
│  │ Question 1                  │  │     Live Preview          │  │
│  │ [What is 2+2?           ]  │  │                           │  │
│  │ Type: [Single Choice ▾]    │  │  1. What is 2+2?          │  │
│  │ ○ [3        ]  ✕           │  │     ○ 3                   │  │
│  │ ● [4        ]  ✕           │  │     ○ 4                   │  │
│  │ ○ [5        ]  ✕           │  │     ○ 5                   │  │
│  │ [+ Add Option]             │  │                           │  │
│  │ [▲ Up] [▼ Down] [🗑 Del]   │  │  2. Is the sky blue?      │  │
│  │                            │  │     ○ True                │  │
│  │ Question 2                 │  │     ○ False               │  │
│  │ [Is the sky blue?      ]  │  │                           │  │
│  │ Type: [True/False ▾]      │  │                           │  │
│  │ ● True                     │  │                           │  │
│  │ ○ False                    │  │                           │  │
│  │ [▲ Up] [▼ Down] [🗑 Del]   │  │                           │  │
│  │                            │  │                           │  │
│  │ [+ Add Question]           │  │                           │  │
│  └─────────────────────────────┘  └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Preview Mode (after submission)

```
┌──────────────────────────────────────────────────────────────────┐
│  [ Edit ]  [ Preview ]                                           │
│                                                                  │
│  You scored 1 out of 2                                           │
│                                                                  │
│  1. What is 2+2?                                    ✓ Correct    │
│     ○ 3                                                          │
│     ● 4  ← your answer ✓                                        │
│     ○ 5                                                          │
│                                                                  │
│  2. Is the sky blue?                                ✗ Incorrect  │
│     ○ True   ← correct answer                                   │
│     ● False  ← your answer ✗                                    │
│                                                                  │
│  [Retake Quiz]                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries (no Redux, Zustand, Jotai, etc.).
- No external UI component libraries (no Material UI, Chakra, Ant Design, etc.).
- No external drag-and-drop libraries.
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- Drag-and-drop reordering is not required (use Move Up/Move Down buttons).
- Saving/loading quizzes to localStorage is not required.
- Rich text editing is not required.
