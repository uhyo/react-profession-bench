# Anti-Pattern Catalog (v2)

A reference catalog of React anti-patterns and positive signals. The LLM judge
applies this catalog itself while reading the submission — there is no separate
static-analysis pass, and nothing in this file carries point values. Its two uses:

1. **Recognition aid** while verdicting checkpoints (many checkpoints list specific
   anti-patterns as "missed" criteria).
2. Source vocabulary for the judge's `anti_patterns_observed` output list, which is
   reported alongside the score but does not change it.

Severity labels (Critical / Major / Minor) describe how strongly a finding should
color nearby checkpoint verdicts and the summary — they are qualitative, not points.

## Critical

### AP-01: `useEffect` for Derived State

**What it looks like:**
```tsx
const [items, setItems] = useState([]);
const [count, setCount] = useState(0);
useEffect(() => {
  setCount(items.length);
}, [items]);
```

**Why it's bad:** Creates an unnecessary render cycle. React renders with stale
`count`, then the effect fires, updates `count`, and triggers a second render. The
value is always computable from `items` — it's not independent state.

**What to do instead:**
```tsx
const [items, setItems] = useState([]);
const count = items.length;
```

**How to recognize:** A `useEffect` whose body only calls state setters with
expressions derived from variables in its dependency array, with no external side
effects (no API calls, DOM mutations, localStorage, timers, etc.).

---

### AP-02: `useEffect` to Sync Props to State

**What it looks like:**
```tsx
function UserCard({ user }) {
  const [name, setName] = useState(user.name);
  useEffect(() => {
    setName(user.name);
  }, [user.name]);
}
```

**Why it's bad:** Duplicates the source of truth. The component now has two
representations of the same data, and they can diverge. This also causes a double
render on every prop change.

**What to do instead:** Use the prop directly, or derive from it during render.
When the component genuinely needs to *reset or adjust* its own state in response
to a prop change, use conditional **render-phase state adjustment** (BP-09), not an
effect:

```tsx
const [prevItems, setPrevItems] = useState(items);
if (items !== prevItems) {
  setPrevItems(items);
  setSelection(null);
}
```

React re-renders immediately with no commit in between — strictly cheaper than the
effect-based sync. (Gated by a previous-render comparison and setting only the
component's own state, this is valid and does **not** trip the Rules of React
gate; see the rubric.)

**How to recognize:** A `useEffect` with a prop in its dependency array whose body
sets state to a value derived from that prop.

---

### AP-03: `useEffect` for Event Handling

**What it looks like:**
```tsx
const [query, setQuery] = useState("");
const [results, setResults] = useState([]);
useEffect(() => {
  if (query) {
    setResults(search(query));
  }
}, [query]);
```

**Why it's bad:** The search should be triggered by the user's action (typing,
clicking search), not by a state change. This decouples the cause (user interaction)
from the effect (searching), making the code harder to reason about and introducing
unnecessary render cycles.

**What to do instead:**
```tsx
function handleSearch(newQuery: string) {
  setQuery(newQuery);
  setResults(search(newQuery));
}
```

**How to recognize:** A `useEffect` watching state variables that sets other state,
where the triggering state is set by an event handler elsewhere in the same
component.

---

### AP-07: Missing Dependency Array

**What it looks like:**
```tsx
useEffect(() => {
  document.title = `Count: ${count}`;
});
```

**Why it's bad:** Runs after every render, which is almost never the intent. Usually
indicates the developer forgot the dependency array.

**How to recognize:** `useEffect` called with exactly one argument (the callback, no
dependency array).

---

## Major

### AP-04: Missing `useEffect` Cleanup

**What it looks like:**
```tsx
useEffect(() => {
  const id = setInterval(() => tick(), 1000);
  // no return () => clearInterval(id)
}, []);
```

**Why it's bad:** Causes memory leaks and stale callbacks. The timer/listener
continues running after the component unmounts or the effect re-runs. Under
StrictMode's double-invocation the leak doubles immediately.

**How to recognize:** `useEffect` body contains `setInterval`, `setTimeout`,
`addEventListener`, or subscription calls without a cleanup return function.

---

### AP-08: Index as Key in Dynamic Lists

**What it looks like:**
```tsx
{items.map((item, index) => (
  <ListItem key={index} item={item} />
))}
```

**Why it's bad:** When items are reordered, added, or removed, React cannot
correctly associate components with their data. This causes state to "stick" to the
wrong items and can lead to subtle bugs.

**Not always wrong:** If the list is static (never reordered/filtered/mutated),
index-as-key is acceptable. Judge severity in context.

**How to recognize:** `.map()` callback returning JSX where `key` is set to the
second parameter of the map callback.

---

### AP-09: Reflexive Memoization *(new in v2)*

**What it looks like:**
```tsx
const label = useMemo(() => `${first} ${last}`, [first, last]);
const handleClose = useCallback(() => setOpen(false), []);
// ...every value memoized, every handler wrapped, no memoized consumers anywhere
```

**Why it's bad:** The v2 scaffold has **React Compiler enabled** (see
`scaffold-v2/vite.config.ts`), which memoizes components and values automatically.
Manual `useMemo`/`useCallback`/`React.memo` is therefore redundant by default: it
adds indirection and dependency-array maintenance burden for zero rendering
benefit, and signals the author didn't read the build setup they were given. Even
without a compiler, blanket wrapping of cheap values and handlers with no memoized
consumer was already dead weight; with the compiler, near-zero manual memoization
is the expected professional baseline. A rare justified exception must have a
concrete need the compiler cannot cover.

**How to recognize:** Any significant use of `useMemo`/`useCallback`/`React.memo`
in v2 submissions — especially the blanket style where most values and callbacks
are wrapped. (v1 reports measured 60–69% wrap rates in weaker submissions vs ~19%
in the strongest, with zero being the compiler-aware ideal.)

---

### AP-10: State-Driven Transient Animation *(new in v2)*

**What it looks like:**
```tsx
const [flash, setFlash] = useState(false);
useEffect(() => {
  if (!flash) return;
  const id = setTimeout(() => setFlash(false), 300);
  return () => clearTimeout(id);
}, [flash]);
// <li className={flash ? "row flash" : "row"}>
```

**Why it's bad:** Transient visual effects (attention flashes, enter/exit
transitions, FLIP reorders) do not belong in React state: every animation frame or
phase change becomes a render, timers must be managed by hand, and rapid updates
race the timeouts. The platform already owns this: `element.animate(...)` (Web
Animations API) driven from a ref runs off the render path, is interruptible/
cancelable, and needs no state at all.

**What to do instead:**
```tsx
const ref = useRef<HTMLLIElement>(null);
function highlight() {
  ref.current?.animate(
    [{ backgroundColor: "var(--flash)" }, { backgroundColor: "transparent" }],
    { duration: 300 },
  );
}
```

**How to recognize:** `useState` + `setTimeout`-cleared flags whose only consumers
are `className`/`style`, or effect chains sequencing animation phases, where nothing
but visuals depends on the state.

---

## Minor

### AP-05: State Duplication

**What it looks like:**
```tsx
const [user, setUser] = useState({ name: "Alice", age: 30 });
const [userName, setUserName] = useState("Alice");
```

**Why it's bad:** Two pieces of state representing the same data will inevitably
diverge, creating bugs.

**How to recognize:** Multiple `useState` calls whose initial values are derived
from the same source or represent overlapping data.

---

### AP-06: Unstable References in Dependency Arrays

**What it looks like:**
```tsx
useEffect(() => {
  fetchData(options);
}, [options]); // where options = { limit: 10 } created during render
```

**Why it's bad:** Object/array literals created during render are new references on
every render, causing the effect to run every time even though the values haven't
changed.

**How to recognize:** Dependency array contains a variable that is assigned an
object/array literal in the render body (not from `useState`, `useRef`, `useMemo`,
or a stable source).

---

## Positive Signals

Report these in `strengths` when observed; they carry no points but calibrate the
summary.

| ID | Practice |
|---|---|
| BP-01 | Custom hooks extracting genuinely reusable logic |
| BP-02 | Zero `any` (including `as any` and suppressions) |
| BP-03 | Component props typed with named `interface`/`type` |
| BP-04 | Named event handlers (`handle*` / `on*` props) |
| BP-05 | Semantic HTML elements — never `<div onClick>` |
| BP-06 | Labels associated with inputs (`htmlFor`/wrapping) |
| BP-07 | Buttons with explicit `type` |
| BP-08 | Controlled form inputs (`value` + `onChange`) where controlled is the right choice |
| BP-09 | Conditional render-phase state adjustment (previous-render comparison gating a setState of own state) instead of effect-based prop→state sync |

## Structural Context (Informational)

Rough shape expectations for a 500–800-line app; deviations are context for the
judge, not findings by themselves.

| Metric | Healthy Range | Red Flag |
|---|---|---|
| Component count | 5–15 | < 3 or > 20 |
| `useEffect` count | 1–4 | > 6 |
| Custom hook count | 1–4 | 0 |
| `any` type count | 0 | > 0 |
| Average component lines | 30–80 | > 150 |
| Max component lines | < 150 | > 300 |
