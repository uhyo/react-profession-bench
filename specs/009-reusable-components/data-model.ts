// --- Types ---

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  "todo": "To Do",
  "in-progress": "In Progress",
  "done": "Done",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// --- Simulated data ---

let nextId = 10;

const INITIAL_TASKS: Task[] = [
  { id: "task-1", title: "Fix login page bug", status: "todo", priority: "high" },
  { id: "task-2", title: "Update user documentation", status: "in-progress", priority: "low" },
  { id: "task-3", title: "Deploy v2.0 to production", status: "done", priority: "medium" },
  { id: "task-4", title: "Add dark mode support", status: "todo", priority: "medium" },
  { id: "task-5", title: "Refactor auth module", status: "in-progress", priority: "high" },
  { id: "task-6", title: "Write unit tests for API", status: "todo", priority: "low" },
  { id: "task-7", title: "Optimize database queries", status: "done", priority: "high" },
  { id: "task-8", title: "Design new landing page", status: "todo", priority: "medium" },
];

// --- Simulated API ---

function randomDelay(): Promise<void> {
  return new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
}

function maybeFailWith(errorRate: number): void {
  if (Math.random() < errorRate) {
    throw new Error("Server error. Please try again.");
  }
}

/**
 * Fetches all tasks. Called once on initial load.
 */
export async function fetchTasks(): Promise<Task[]> {
  await randomDelay();
  return INITIAL_TASKS.map((t) => ({ ...t }));
}

/**
 * Creates a new task. Returns the created task with a server-assigned ID.
 * 10% chance of failure.
 */
export async function createTask(
  title: string,
  priority: TaskPriority,
): Promise<Task> {
  await randomDelay();
  maybeFailWith(0.1);
  const task: Task = {
    id: `task-${nextId++}`,
    title,
    status: "todo",
    priority,
  };
  return task;
}

/**
 * Updates a task's status. Returns the updated task.
 * 10% chance of failure.
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
): Promise<Task> {
  await randomDelay();
  maybeFailWith(0.1);
  const original = INITIAL_TASKS.find((t) => t.id === taskId);
  if (!original) throw new Error(`Task ${taskId} not found`);
  return { ...original, status: newStatus };
}

/**
 * Deletes a task. Returns the deleted task's ID.
 * 10% chance of failure.
 */
export async function deleteTask(taskId: string): Promise<string> {
  await randomDelay();
  maybeFailWith(0.1);
  return taskId;
}
