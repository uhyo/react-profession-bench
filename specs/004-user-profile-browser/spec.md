# User Profile Browser

## Overview

A user profile browser that fetches and displays user data from a simulated API. The app shows a list of users, and clicking a user loads their full profile with posts and followers — all fetched asynchronously.

## Requirements

### Functional Requirements

1. The app has two views: a **User List** view and a **User Profile** view.
2. The app starts in the User List view.

### User List View

3. On initial load, the app fetches the list of users from the API. While loading, a **loading skeleton** (placeholder UI) is shown in place of the list — not a blank screen or a spinner replacing the entire page.
4. Once loaded, each user row displays the user's **name** and **role**.
5. Clicking a user row navigates to the User Profile view for that user.
6. If the API call fails, an **error message** is displayed with a **"Retry"** button.

### User Profile View

7. The User Profile view shows three sections: **Profile Info**, **Posts**, and **Followers**.
8. Each section fetches its data independently from the API. The sections should load progressively — whichever data arrives first should display first, without waiting for the other sections.
9. While a section is loading, a **loading skeleton** specific to that section is shown (e.g., placeholder lines for posts, placeholder circles for followers).
10. **Profile Info** displays: name, email, role, bio, and join date.
11. **Posts** displays a list of the user's posts, each showing the title, a preview of the body (first 100 characters), and the date.
12. **Followers** displays a grid of follower avatars (as colored circles with initials) and names.
13. A **"Back to Users"** button returns to the User List view. When returning, the previously loaded user list should still be visible without re-fetching (unless the page is refreshed).
14. If any individual section's API call fails, that section shows an error message with a **"Retry"** button. Other sections should not be affected by one section's failure.
15. When navigating from one user profile to another user's profile (if such navigation is possible from the followers list), the new user's data loads while the previous profile remains visible until the new data is ready — the UI should not flash to a blank/loading state.

### Follower Interaction

16. Each follower in the followers grid is clickable. Clicking a follower navigates to that follower's profile, triggering new data fetches for their Profile Info, Posts, and Followers.

### Data Freshness

17. Profile data should be re-fetched each time a user profile is opened (navigating to a profile always triggers fresh API calls). The user list is only fetched once on first load.

## Simulated API

The data model file (`data-model.ts`) exports a simulated API module with the following async functions:

- `fetchUsers(): Promise<User[]>` — returns after ~800ms
- `fetchUserProfile(userId: string): Promise<UserProfile>` — returns after ~600ms
- `fetchUserPosts(userId: string): Promise<Post[]>` — returns after ~1000ms
- `fetchUserFollowers(userId: string): Promise<Follower[]>` — returns after ~700ms

Each function has a **10% chance of throwing an error** to simulate network failures. The delays are randomized (±200ms) to ensure sections resolve in unpredictable order.

You must use these API functions as-is. Do not modify the simulated API.

## UI Layout

### User List View

```
┌──────────────────────────────────────────┐
│  User Profile Browser                     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Alice Johnson          Admin       │  │
│  │ Bob Smith              Editor      │  │
│  │ Carol Williams         Viewer      │  │
│  │ David Brown            Admin       │  │
│  │ ...                                │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### User Profile View (sections loading progressively)

```
┌──────────────────────────────────────────┐
│  [← Back to Users]                        │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Alice Johnson                      │  │
│  │ alice@example.com · Admin          │  │
│  │ Joined: 2024-01-15                │  │
│  │ Bio: Software engineer who loves...│  │
│  └────────────────────────────────────┘  │
│                                          │
│  Posts                                   │
│  ┌────────────────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░  (loading)   │  │
│  │ ░░░░░░░░░░░░░░░                   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Followers                               │
│  ┌────────────────────────────────────┐  │
│  │ (BS) Bob    (CW) Carol   (DB) Dave│  │
│  │ (EF) Eve    (FG) Frank            │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries (no Redux, Zustand, Jotai, etc.).
- No external data fetching libraries (no TanStack Query, SWR, Apollo, etc.).
- No external routing libraries (no React Router, TanStack Router, etc.).
- No external UI component libraries.
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.
- You must use the simulated API functions from `data-model.ts` without modification.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- Caching or offline support is not required (beyond keeping the user list in memory as described in requirement 13).
- URL-based routing is not required (in-memory navigation state is fine).
- Pagination is not required.
