# Event Registration Form

## Overview

A multi-step event registration form with a live preview sidebar, field validation, and draft auto-save to localStorage.

## Requirements

### Functional Requirements

1. The form has three steps: **Personal Info**, **Event Preferences**, and **Confirmation**.
2. The user navigates between steps using "Next" and "Back" buttons displayed below the form. The "Next" button is disabled when the current step has validation errors. There is no "Back" button on the first step and no "Next" button on the last step.
3. A **step indicator** is displayed above the form, showing all three step names with the current step visually highlighted.
4. A **live preview sidebar** is displayed to the right of the form, showing a formatted summary of all data entered so far across all steps. The preview updates as the user types.

### Step 1: Personal Info

5. Fields: **Full Name** (text), **Email** (text), **Phone Number** (text), **Bio** (textarea).
6. Full Name is required and must be at least 2 characters.
7. Email is required and must match a basic email format (contains `@` and a `.` after `@`).
8. Phone Number is optional. When provided, it is automatically formatted as the user types: digits are grouped as `(XXX) XXX-XXXX`. Non-digit characters typed by the user are ignored. If fewer than 10 digits have been entered, the raw digits are displayed without formatting.
9. Bio is optional, with a maximum of 200 words. A **word count** is displayed below the textarea, showing the current count and the maximum (e.g., "42 / 200 words").

### Step 2: Event Preferences

10. Fields: **Event Date** (date input), **Session** (select: "Morning", "Afternoon", "Evening"), **Dietary Restrictions** (checkboxes: "Vegetarian", "Vegan", "Gluten-Free", "None"), **Special Requests** (textarea).
11. Event Date is required and must not be in the past.
12. Session is required.
13. At least one Dietary Restriction must be selected. If "None" is selected, all other options are deselected. If any other option is selected, "None" is deselected.

### Step 3: Confirmation

14. This step displays a read-only summary of all data from Steps 1 and 2 in a formatted layout (not a raw data dump).
15. A "Submit" button is displayed. It is disabled if any validation errors exist across any step.
16. When the user clicks "Submit", a **confirmation modal** appears with the text "Are you sure you want to submit your registration?" and two buttons: "Cancel" and "Confirm".
17. Clicking "Confirm" clears the form data (including the localStorage draft) and shows a success message in place of the form. Clicking "Cancel" closes the modal.

### Draft Persistence

18. The form data is saved to localStorage as the user types, so that closing and reopening the page restores the draft. The save does not need to happen on every keystroke — a short delay is acceptable.
19. When the page loads, if a draft exists in localStorage, the form is populated with the saved data.

### Validation Behavior

20. Validation errors are displayed below each invalid field.
21. Validation is triggered when a field loses focus (blur), not on every keystroke. Once a field has been validated and has an error, subsequent changes to that field re-validate on change to provide immediate feedback.

## Data Model

The TypeScript types for the form data are provided in `data-model.ts`. You must use these types.

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────┐     │
│  │ 1. Personal │  │ 2. Preferences  │  │ 3. Confirm   │     │
│  │    Info ●    │  │                 │  │              │     │
│  └─────────────┘  └─────────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────┐  │
│  │                          │  │       Live Preview       │  │
│  │       Form Fields        │  │                          │  │
│  │       (current step)     │  │  Full Name: John Doe     │  │
│  │                          │  │  Email: john@example.com │  │
│  │                          │  │  Phone: (555) 123-4567   │  │
│  │                          │  │  Bio: ...                │  │
│  │                          │  │                          │  │
│  │  ┌────────┐ ┌────────┐  │  │  Event Date: 2026-04-01  │  │
│  │  │  Back  │ │  Next  │  │  │  Session: Morning        │  │
│  │  └────────┘ └────────┘  │  │  ...                     │  │
│  └──────────────────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries (no Redux, Zustand, Jotai, etc.).
- No external form libraries (no React Hook Form, Formik, etc.).
- No external UI component libraries (no Material UI, Chakra, Ant Design, etc.).
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- Backend integration is not required — the form does not actually submit anywhere.
- Dark mode is not required.
- Internationalization is not required.
