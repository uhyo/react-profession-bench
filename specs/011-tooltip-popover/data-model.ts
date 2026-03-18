// --- Types ---

export type Role = "admin" | "editor" | "viewer";
export type Status = "active" | "inactive";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  joinDate: string; // ISO date string (YYYY-MM-DD)
}

export const STATUS_DESCRIPTIONS: Record<Status, string> = {
  active: "User has logged in within the last 30 days.",
  inactive: "User has not logged in for more than 30 days.",
};

// --- User data (30 rows) ---

const firstNames = [
  "Alice", "Bob", "Carol", "David", "Eve", "Frank", "Grace", "Hank",
  "Iris", "Jack", "Karen", "Leo", "Mona", "Nick", "Olivia", "Paul",
  "Quinn", "Rosa", "Sam", "Tina", "Uma", "Vince", "Wendy", "Xander",
  "Yara", "Zach", "Anna", "Brian", "Clara", "Derek",
];

const lastNames = [
  "Johnson", "Smith", "Williams", "Brown", "Davis", "Miller", "Wilson",
  "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris",
  "Martin", "Garcia", "Clark", "Lewis", "Hall", "Allen", "Young", "King",
  "Wright", "Adams", "Nelson", "Baker", "Rivera", "Campbell", "Mitchell", "Carter",
];

export const USERS: User[] = Array.from({ length: 30 }, (_, i) => ({
  id: `user-${i}`,
  name: `${firstNames[i]} ${lastNames[i]}`,
  email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`,
  role: (["admin", "editor", "viewer"] as const)[i % 3],
  status: (i % 5 === 0 ? "inactive" : "active") as Status,
  joinDate: new Date(2024, i % 12, (i % 28) + 1).toISOString().split("T")[0],
}));
