// --- Types ---

export type EventType = "info" | "warning" | "error";

export interface BusEvent {
  id: string;
  type: EventType;
  message: string;
  timestamp: number; // Date.now()
}

export type EventBusListener = (event: BusEvent) => void;

// --- Event Bus ---

const EVENT_MESSAGES: Record<EventType, string[]> = {
  info: [
    "Deployment completed successfully",
    "New user registered",
    "Cache cleared",
    "Backup completed",
    "Configuration updated",
    "Service health check passed",
    "SSL certificate renewed",
    "Scheduled task completed",
  ],
  warning: [
    "Memory usage above 80%",
    "API response time degraded",
    "Disk space below 20%",
    "Rate limit approaching threshold",
    "Certificate expiring in 7 days",
    "Retry attempt on failed request",
  ],
  error: [
    "Database connection lost",
    "Payment processing failed",
    "Authentication service unavailable",
    "Unhandled exception in worker",
    "Storage quota exceeded",
  ],
};

let eventCounter = 0;
let intervalId: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<EventBusListener>();

function emitRandomEvent(): void {
  const types: EventType[] = ["info", "info", "info", "warning", "warning", "error"];
  const type = types[Math.floor(Math.random() * types.length)];
  const messages = EVENT_MESSAGES[type];
  const message = messages[Math.floor(Math.random() * messages.length)];

  const event: BusEvent = {
    id: `event-${eventCounter++}`,
    type,
    message,
    timestamp: Date.now(),
  };

  for (const listener of listeners) {
    listener(event);
  }
}

function scheduleNext(): void {
  const delay = 2000 + Math.random() * 3000; // 2-5 seconds
  intervalId = setTimeout(() => {
    emitRandomEvent();
    scheduleNext();
  }, delay);
}

/**
 * Start the event bus. Events will be emitted at random intervals (2-5s).
 * Call stopEventBus() to stop.
 */
export function startEventBus(): void {
  if (intervalId !== null) return;
  scheduleNext();
}

/**
 * Stop the event bus.
 */
export function stopEventBus(): void {
  if (intervalId !== null) {
    clearTimeout(intervalId);
    intervalId = null;
  }
}

/**
 * Subscribe to events. Returns an unsubscribe function.
 */
export function subscribeToEventBus(listener: EventBusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get the current snapshot of all events received so far.
 * Returns a new array each time (not a reference to internal state).
 */
let allEvents: BusEvent[] = [];

// Internal listener to accumulate events
subscribeToEventBus((event) => {
  allEvents = [event, ...allEvents].slice(0, 50);
});

/**
 * Returns the current list of events (most recent first, max 50).
 */
export function getEventBusSnapshot(): BusEvent[] {
  return allEvents;
}
