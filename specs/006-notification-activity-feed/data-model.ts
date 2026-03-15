// --- Types ---

export type Severity = "info" | "warning" | "error";

export interface ActivityEvent {
  id: string;
  type: Severity;
  title: string;
  description: string;
  timestamp: number; // Date.now()
}

export type EventListener = (event: ActivityEvent) => void;

// --- Event data ---

const EVENT_DATA: Record<Severity, { title: string; description: string }[]> = {
  info: [
    { title: "Deployment completed", description: "Production deployment v2.4.1 rolled out successfully to all regions" },
    { title: "New user registered", description: "A new user signed up from the marketing campaign landing page" },
    { title: "Cache cleared", description: "Redis cache invalidated for product catalog after scheduled refresh" },
    { title: "Backup completed", description: "Daily database backup finished in 4 minutes and 32 seconds" },
    { title: "Config updated", description: "Feature flag 'new-checkout' enabled for 50% of users" },
    { title: "Health check passed", description: "All 12 service endpoints responding within acceptable latency" },
    { title: "Certificate renewed", description: "SSL certificate for api.example.com auto-renewed, expires in 90 days" },
    { title: "Task completed", description: "Nightly data aggregation job processed 1.2M records" },
  ],
  warning: [
    { title: "Memory usage high", description: "Worker process memory at 82% of allocated limit" },
    { title: "API latency degraded", description: "p99 response time increased to 450ms (threshold: 300ms)" },
    { title: "Disk space low", description: "Log volume at 78% capacity, rotation scheduled in 6 hours" },
    { title: "Rate limit approaching", description: "External API usage at 85% of hourly quota" },
    { title: "Certificate expiring", description: "TLS certificate for cdn.example.com expires in 7 days" },
    { title: "Retry triggered", description: "Payment gateway request failed, attempting retry 2 of 3" },
  ],
  error: [
    { title: "Database connection lost", description: "Primary PostgreSQL connection pool exhausted, failover initiated" },
    { title: "Payment failed", description: "Stripe webhook returned 500 for charge ch_3N2x on order #48291" },
    { title: "Auth service down", description: "OAuth provider returning 503, login flow unavailable" },
    { title: "Unhandled exception", description: "TypeError in background worker: Cannot read property 'id' of undefined" },
    { title: "Storage quota exceeded", description: "S3 bucket 'user-uploads' reached 95% of provisioned capacity" },
  ],
};

// --- Simulated WebSocket connection ---

let eventCounter = 0;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let listener: EventListener | null = null;

function emitRandomEvent(): void {
  const types: Severity[] = ["info", "info", "info", "warning", "warning", "error"];
  const type = types[Math.floor(Math.random() * types.length)];
  const entries = EVENT_DATA[type];
  const entry = entries[Math.floor(Math.random() * entries.length)];

  const event: ActivityEvent = {
    id: `activity-${eventCounter++}`,
    type,
    title: entry.title,
    description: entry.description,
    timestamp: Date.now(),
  };

  if (listener) {
    listener(event);
  }
}

function scheduleNext(): void {
  const delay = 1500 + Math.random() * 3500; // 1.5-5 seconds
  timeoutId = setTimeout(() => {
    emitRandomEvent();
    if (timeoutId !== null) {
      scheduleNext();
    }
  }, delay);
}

/**
 * Connect to the simulated WebSocket.
 * Only one listener can be active at a time — calling connect again
 * replaces the previous listener (like a real WebSocket onmessage).
 *
 * Returns a disconnect function.
 */
export function connect(onEvent: EventListener): () => void {
  listener = onEvent;

  if (timeoutId === null) {
    scheduleNext();
  }

  return () => {
    listener = null;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
}

// --- Notification sound stub ---

/**
 * Plays a notification sound. In this simulation, it logs to the console.
 * In a real app, this would use the Web Audio API.
 */
export function playNotificationSound(): void {
  console.log("[Sound] 🔔 Notification beep");
}
