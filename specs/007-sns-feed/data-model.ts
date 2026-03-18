// --- Types ---

export interface Author {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export interface Post {
  id: string;
  author: Author;
  body: string;
  timestamp: number; // Date.now()
  likeCount: number;
  likedByCurrentUser: boolean;
}

// --- Simulated data ---

const AUTHORS: Author[] = [
  { id: "user-0", name: "Alice Johnson", initials: "AJ", avatarColor: "#e74c3c" },
  { id: "user-1", name: "Bob Smith", initials: "BS", avatarColor: "#3498db" },
  { id: "user-2", name: "Carol Williams", initials: "CW", avatarColor: "#2ecc71" },
  { id: "user-3", name: "David Brown", initials: "DB", avatarColor: "#f39c12" },
  { id: "user-4", name: "Eve Davis", initials: "ED", avatarColor: "#9b59b6" },
  { id: "user-5", name: "Frank Miller", initials: "FM", avatarColor: "#1abc9c" },
  { id: "user-6", name: "Grace Wilson", initials: "GW", avatarColor: "#e67e22" },
  { id: "user-7", name: "Hank Moore", initials: "HM", avatarColor: "#34495e" },
];

const POST_BODIES = [
  "Just shipped the new feature! 🚀 Thanks @bob for the code review. #react #webdev",
  "Great talk at the conference today! Learned a lot about #performance optimization.",
  "Working on a new open source project. Stay tuned! #opensource #typescript",
  "Had an amazing pair programming session with @carol today. #teamwork",
  "Just published a blog post about React patterns. Check it out! #react #blog",
  "Debugging a tricky race condition... wish me luck 🤞 #debugging",
  "The new #react 19 features are incredible. @alice wrote a great guide on them.",
  "Friday deploy went smoothly! 🎉 Thanks to the whole team. #cicd #devops",
  "Learning about #accessibility best practices. Every developer should care about a11y.",
  "Refactored the entire auth module today. Much cleaner now! #refactoring @david",
  "Excited to announce our startup just got funded! 🚀 #startup #announcement",
  "Anyone else using #typescript strict mode? It catches so many bugs! @frank agrees.",
  "Just finished reading a great book on system design. Highly recommend! #learning",
  "The sunset from the office today was beautiful. Sometimes you need to look up. 🌅",
  "New personal record at the gym today! 💪 Balance is key. #fitness #wellness",
  "Mentoring junior developers is so rewarding. Seeing them grow is the best. #mentoring",
  "Hot take: tabs > spaces. Fight me. 😄 #coding #unpopularopinion",
  "Just migrated our app from webpack to vite. Build times went from 30s to 2s! #vite #dx",
  "Writing tests is an investment, not a cost. #testing @eve knows what I'm talking about.",
  "Coffee + code = productive morning ☕ #morningroutine",
];

const ALL_POSTS: Post[] = Array.from({ length: 50 }, (_, i) => {
  const author = AUTHORS[i % AUTHORS.length];
  const hoursAgo = i * 2 + Math.floor(i / 3);
  return {
    id: `post-${i}`,
    author,
    body: POST_BODIES[i % POST_BODIES.length],
    timestamp: Date.now() - hoursAgo * 60 * 60 * 1000,
    likeCount: Math.floor(Math.random() * 50) + 1,
    likedByCurrentUser: i % 5 === 0,
  };
});

// --- Simulated API ---

function randomDelay(base: number, variance: number): number {
  return base + (Math.random() * 2 - 1) * variance;
}

/**
 * Fetches a page of posts.
 * @param page 0-indexed page number
 * @param pageSize Number of posts per page (default 10)
 * @returns Array of posts (empty if no more posts)
 */
export async function fetchPosts(page: number, pageSize = 10): Promise<Post[]> {
  await new Promise((r) => setTimeout(r, randomDelay(600, 200)));
  const start = page * pageSize;
  return ALL_POSTS.slice(start, start + pageSize).map((p) => ({ ...p }));
}

/**
 * Toggles the like state for a post.
 * Returns the updated like state.
 * Has a 15% chance of failure.
 */
export async function toggleLike(
  postId: string,
  currentlyLiked: boolean,
): Promise<{ liked: boolean; likeCount: number }> {
  await new Promise((r) => setTimeout(r, randomDelay(800, 300)));

  if (Math.random() < 0.15) {
    throw new Error("Failed to update like status. Please try again.");
  }

  const post = ALL_POSTS.find((p) => p.id === postId);
  if (!post) throw new Error(`Post ${postId} not found`);

  const newLiked = !currentlyLiked;
  const newCount = post.likeCount + (newLiked ? 1 : -1);

  return { liked: newLiked, likeCount: newCount };
}
