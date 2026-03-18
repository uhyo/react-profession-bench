# Multi-Section Survey Form

## Overview

A survey form with multiple question types that submits data to a simulated server. The form uses native HTML form submission behavior and shows real-time submission status.

## Requirements

### Functional Requirements

1. The app displays a single-page survey form with several question sections.
2. The form is wrapped in a single HTML `<form>` element.

### Question Sections

3. **Section 1 — Contact Info**: Fields for **Name** (text, required), **Email** (text, required), and **Company** (text, optional).
4. **Section 2 — Rating**: A **satisfaction rating** from 1 to 5, displayed as a group of radio buttons labeled "Very Unsatisfied" through "Very Satisfied". Required.
5. **Section 3 — Feedback Categories**: Checkboxes for "UI Design", "Performance", "Documentation", "Support", "Pricing". At least one must be selected.
6. **Section 4 — Comments**: A **comments textarea** (optional, max 500 characters). A character count is displayed below (e.g., "123 / 500").
7. **Section 5 — File Upload**: An optional file input that accepts `.pdf` and `.docx` files only. The selected filename is displayed next to the input.

### Form Submission

8. A **"Submit Survey"** button is displayed at the bottom of the form.
9. Pressing **Enter** in any single-line text input (Name, Email, Company) must submit the form. This should work through the form's **native submission mechanism**, not through custom keyboard event handling.
10. When the form is submitted, the data is sent to the simulated API function `submitSurvey()` provided in `data-model.ts`.
11. While the form is being submitted, the submit button must show a **"Submitting..."** label and be **disabled**. All form inputs should also be disabled during submission.
12. The form submission has a **30% chance of failure** (simulated). On failure, an **error message** is displayed above the submit button with the error text. The form remains filled so the user can retry.
13. On success, the form is replaced with a **success message**: "Thank you for your feedback!" with a **"Submit Another"** button that resets the form to its initial state.

### Validation

14. Validation is performed on submission. If validation fails, the submission is **prevented** and error messages are shown below each invalid field.
15. Required fields: Name, Email, Rating, at least one Feedback Category.
16. Email must contain `@` and a `.` after `@`.
17. Validation errors are cleared when the user modifies the corresponding field.

### Submission History

18. A **submission history** panel below the form shows the results of all submission attempts in the current session (both successful and failed).
19. Each history entry shows: the timestamp (`HH:mm:ss`), the status ("Success" or "Failed: {error}"), and the submitted name and email.
20. The history panel displays up to 10 entries, newest first.

## Data Model

The TypeScript types and simulated API are provided in `data-model.ts`. You must use these types and API functions.

## UI Layout

```
┌──────────────────────────────────────────────────────┐
│  Customer Survey                                      │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ Contact Info                                    │  │
│  │ Name:    [___________________]                  │  │
│  │ Email:   [___________________]                  │  │
│  │ Company: [___________________]                  │  │
│  │                                                │  │
│  │ Satisfaction Rating                             │  │
│  │ ○ Very Unsatisfied  ○ Unsatisfied  ○ Neutral   │  │
│  │ ○ Satisfied  ○ Very Satisfied                   │  │
│  │                                                │  │
│  │ Feedback Categories                             │  │
│  │ ☑ UI Design  ☐ Performance  ☑ Documentation    │  │
│  │ ☐ Support    ☐ Pricing                         │  │
│  │                                                │  │
│  │ Comments                                        │  │
│  │ ┌──────────────────────────────────────────┐   │  │
│  │ │ The new dashboard is great...            │   │  │
│  │ └──────────────────────────────────────────┘   │  │
│  │ 42 / 500                                       │  │
│  │                                                │  │
│  │ Attachment: [Choose File] report.pdf            │  │
│  │                                                │  │
│  │ ⚠ Failed to submit. Server error.              │  │
│  │ [ Submit Survey ]                               │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Submission History                                   │
│  ┌────────────────────────────────────────────────┐  │
│  │ 14:32:05  ✗ Failed: Server error               │  │
│  │           Alice — alice@example.com             │  │
│  │ 14:30:12  ✓ Success                            │  │
│  │           Bob — bob@example.com                 │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries.
- No external form libraries (no React Hook Form, Formik, etc.).
- No external UI component libraries.
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.
- You must use the simulated API from `data-model.ts` without modification.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- Actual file upload is not required — just show the selected filename.
- Client-side routing is not required.
- Server-side rendering is not required.
