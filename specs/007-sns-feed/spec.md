# SNS Post Feed

## Overview

A social media post feed where users can browse posts, like/unlike them, and load more posts. Liking a post should feel instant, and off-screen posts should not degrade the performance of visible content.

## Requirements

### Functional Requirements

1. The app displays a scrollable feed of posts.
2. On initial load, the first 10 posts are fetched from the API. While loading, a skeleton placeholder is shown.

### Post Display

3. Each post displays the author's **avatar** (a colored circle with initials), **author name**, **post body**, **timestamp** (formatted as relative time, e.g., "5m ago", "2h ago", "3d ago"), and a **like section**.
4. Each post is an independent content unit in the feed.
5. The like section shows: a **like button** (heart icon or "♥" text), the **current like count**, and whether the current user has liked the post (visually distinguished, e.g., filled vs outlined heart).

### Like/Unlike Behavior

6. Clicking the like button toggles the like state for that post.
7. When the user clicks the like button, the **UI must update immediately** — the heart fills/unfills and the count increments/decrements **before** the API call completes. The user should never see a delay.
8. If the API call fails, the UI **reverts** to the previous state and an error toast is shown briefly (auto-dismiss after 3 seconds).
9. While a like/unlike API call is in flight, the like button should remain interactive (the user can rapidly like/unlike and only the final state is sent).

### Infinite Scroll

10. When the user scrolls near the bottom of the feed (within 200px), the next page of 10 posts is fetched automatically.
11. While more posts are loading, a loading indicator is shown at the bottom of the feed.
12. When all posts have been loaded (the API returns an empty array), the text "No more posts" is shown instead of the loading indicator.

### Post Visibility and Performance

13. The feed may contain many posts (50+). Posts that are not currently visible in the viewport should not compete with visible posts for rendering priority. Visible posts should always render and update promptly.
14. When the user scrolls back up to previously loaded posts, those posts should still be available without re-fetching.

### Post Composition

15. Some posts contain **mentions** (text matching `@username`). Mentions should be rendered as bold text.
16. Some posts contain **hashtags** (text matching `#tag`). Hashtags should be rendered as colored text (any color distinct from the body text).
17. Mention and hashtag parsing should not be re-computed unnecessarily when unrelated state changes (e.g., a like on a different post should not re-parse all posts' text).

## Data Model

The TypeScript types and simulated API are provided in `data-model.ts`. You must use these types and API functions.

## UI Layout

```
┌──────────────────────────────────────────────┐
│  Social Feed                                  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ (AJ) Alice Johnson            5m ago  │  │
│  │                                        │  │
│  │ Just shipped the new feature! 🚀       │  │
│  │ Thanks @bob for the review.            │  │
│  │ #react #webdev                         │  │
│  │                                        │  │
│  │ ♥ 12                                   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ (BS) Bob Smith                 2h ago  │  │
│  │                                        │  │
│  │ Great talk at the conference today!    │  │
│  │                                        │  │
│  │ ♡ 5                                    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Loading more...                             │
└──────────────────────────────────────────────┘
```

## Constraints

- The app must be a single-page React application using the provided scaffold (Vite + React 19 + TypeScript).
- No external state management libraries.
- No external UI component libraries.
- No external infinite scroll or virtualization libraries.
- Standard CSS (plain `.css` files or inline styles) for styling. No CSS-in-JS libraries.
- All components must be function components.
- You must use the simulated API from `data-model.ts` without modification.

## Non-Requirements

- Responsive design is not required.
- Animations and transitions are not required.
- User authentication is not required — the current user is hardcoded.
- Posting new content is not required.
- Comments are not required.
