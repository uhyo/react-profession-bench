// --- Types ---

export interface User {
  id: string;
  name: string;
  role: "admin" | "editor" | "viewer";
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  bio: string;
  joinDate: string; // ISO date string
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  body: string;
  date: string; // ISO date string
}

export interface Follower {
  id: string;
  name: string;
  initials: string;
  color: string; // CSS color for avatar circle
}

// --- Simulated data ---

const USERS: User[] = Array.from({ length: 20 }, (_, i) => ({
  id: `user-${i}`,
  name: [
    "Alice Johnson", "Bob Smith", "Carol Williams", "David Brown",
    "Eve Davis", "Frank Miller", "Grace Wilson", "Hank Moore",
    "Iris Taylor", "Jack Anderson", "Karen Thomas", "Leo Jackson",
    "Mona White", "Nick Harris", "Olivia Martin", "Paul Garcia",
    "Quinn Clark", "Rosa Lewis", "Sam Hall", "Tina Allen",
  ][i],
  role: (["admin", "editor", "viewer"] as const)[i % 3],
}));

const BIOS = [
  "Software engineer who loves building user interfaces and exploring new technologies.",
  "Product designer with a passion for accessible and inclusive design systems.",
  "Data analyst turning complex datasets into actionable insights.",
  "Full-stack developer with 10 years of experience in web applications.",
  "UX researcher focused on understanding user behavior and needs.",
];

const POST_TITLES = [
  "Getting Started with React 19",
  "Understanding Concurrent Rendering",
  "Building Accessible Web Applications",
  "TypeScript Tips for React Developers",
  "State Management Patterns in Modern React",
  "Performance Optimization Techniques",
  "Custom Hooks: A Practical Guide",
  "Testing React Components Effectively",
];

const POST_BODIES = [
  "React 19 introduces several improvements to the developer experience, including better support for async operations and new hooks that simplify common patterns. In this post, we explore the key changes and how to adopt them in your projects.",
  "Concurrent rendering allows React to prepare multiple versions of your UI at the same time. This enables smoother user experiences by keeping the interface responsive during expensive updates.",
  "Accessibility is not just a nice-to-have — it is essential for building inclusive products. Learn how to leverage semantic HTML, ARIA attributes, and keyboard navigation to make your React apps usable by everyone.",
  "TypeScript and React are a powerful combination. From properly typing component props to leveraging discriminated unions for state management, these tips will help you write safer and more maintainable code.",
];

const COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#34495e", "#16a085", "#c0392b",
];

function randomDelay(base: number, variance: number): number {
  return base + (Math.random() * 2 - 1) * variance;
}

function maybeFailWith(errorRate: number): void {
  if (Math.random() < errorRate) {
    throw new Error("Network error: request failed");
  }
}

// --- Simulated API ---

export async function fetchUsers(): Promise<User[]> {
  await new Promise((resolve) =>
    setTimeout(resolve, randomDelay(800, 200))
  );
  maybeFailWith(0.1);
  return [...USERS];
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  await new Promise((resolve) =>
    setTimeout(resolve, randomDelay(600, 200))
  );
  maybeFailWith(0.1);
  const user = USERS.find((u) => u.id === userId);
  if (!user) throw new Error(`User ${userId} not found`);
  return {
    ...user,
    email: `${user.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    bio: BIOS[parseInt(userId.split("-")[1]) % BIOS.length],
    joinDate: new Date(
      2024,
      parseInt(userId.split("-")[1]) % 12,
      (parseInt(userId.split("-")[1]) % 28) + 1
    ).toISOString().split("T")[0],
  };
}

export async function fetchUserPosts(userId: string): Promise<Post[]> {
  await new Promise((resolve) =>
    setTimeout(resolve, randomDelay(1000, 200))
  );
  maybeFailWith(0.1);
  const userIndex = parseInt(userId.split("-")[1]);
  const postCount = 3 + (userIndex % 4);
  return Array.from({ length: postCount }, (_, i) => ({
    id: `post-${userId}-${i}`,
    userId,
    title: POST_TITLES[(userIndex + i) % POST_TITLES.length],
    body: POST_BODIES[(userIndex + i) % POST_BODIES.length],
    date: new Date(
      2025,
      (userIndex + i) % 12,
      ((userIndex + i) % 28) + 1
    ).toISOString().split("T")[0],
  }));
}

export async function fetchUserFollowers(userId: string): Promise<Follower[]> {
  await new Promise((resolve) =>
    setTimeout(resolve, randomDelay(700, 200))
  );
  maybeFailWith(0.1);
  const userIndex = parseInt(userId.split("-")[1]);
  const followerCount = 4 + (userIndex % 6);
  return Array.from({ length: followerCount }, (_, i) => {
    const followerIndex = (userIndex + i + 1) % USERS.length;
    const follower = USERS[followerIndex];
    const nameParts = follower.name.split(" ");
    return {
      id: follower.id,
      name: follower.name,
      initials: nameParts.map((p) => p[0]).join(""),
      color: COLORS[followerIndex % COLORS.length],
    };
  });
}
