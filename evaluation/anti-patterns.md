# Anti-Pattern Catalog

These anti-patterns are detected by the static analyzer (AST-based) and contribute to the static analysis score. Each starts with a base score of 100; deductions are applied per finding.

## Critical (–15 points each)

### AP-01: `useEffect` for Derived State

**What it looks like:**
```tsx
const [items, setItems] = useState([]);
const [count, setCount] = useState(0);
useEffect(() => {
  setCount(items.length);
}, [items]);
```

**Why it's bad:** Creates an unnecessary render cycle. React renders with stale `count`, then the effect fires, updates `count`, and triggers a second render. The value is always computable from `items` — it's not independent state.

**What to do instead:**
```tsx
const [items, setItems] = useState([]);
const count = items.length;
```

**Detection:** A `useEffect` whose body only calls state setters with expressions derived from variables in its dependency array, with no external side effects (no API calls, DOM mutations, localStorage, timers, etc.).

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

**Why it's bad:** Duplicates the source of truth. The component now has two representations of the same data, and they can diverge. This also causes a double render on every prop change.

**What to do instead:** Use the prop directly, or derive from it during render.

**Detection:** A `useEffect` with a prop in its dependency array whose body sets state to a value derived from that prop.

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

**Why it's bad:** The search should be triggered by the user's action (typing, clicking search), not by a state change. This decouples the cause (user interaction) from the effect (searching), making the code harder to reason about and introducing unnecessary render cycles.

**What to do instead:**
```tsx
function handleSearch(newQuery: string) {
  setQuery(newQuery);
  setResults(search(newQuery));
}
```

**Detection:** A `useEffect` watching state variables that sets other state, where the triggering state is set by an event handler elsewhere in the same component. Heuristic: if the dependency is state (not a prop or external value) and the body only calls state setters.

---

### AP-07: Missing Dependency Array

**What it looks like:**
```tsx
useEffect(() => {
  document.title = `Count: ${count}`;
});
```

**Why it's bad:** Runs after every render, which is almost never the intent. Usually indicates the developer forgot the dependency array.

**Detection:** `useEffect` called with exactly one argument (the callback, no dependency array).

---

## Major (–10 points each)

### AP-04: Missing `useEffect` Cleanup

**What it looks like:**
```tsx
useEffect(() => {
  const id = setInterval(() => tick(), 1000);
  // no return () => clearInterval(id)
}, []);
```

**Why it's bad:** Causes memory leaks and stale callbacks. The timer/listener continues running after the component unmounts or the effect re-runs.

**Detection:** `useEffect` body contains `setInterval`, `setTimeout`, `addEventListener`, or subscription calls without a cleanup return function.

---

### AP-08: Index as Key in Dynamic Lists

**What it looks like:**
```tsx
{items.map((item, index) => (
  <ListItem key={index} item={item} />
))}
```

**Why it's bad:** When items are reordered, added, or removed, React cannot correctly associate components with their data. This causes state to "stick" to the wrong items and can lead to subtle bugs.

**Not always wrong:** If the list is static (never reordered/filtered/mutated), index-as-key is acceptable. The analyzer flags it; the LLM judge determines severity in context.

**Detection:** `.map()` callback returning JSX where `key` is set to the second parameter of the map callback (conventionally `index` or `i`).

---

## Minor (–5 points each)

### AP-05: State Duplication

**What it looks like:**
```tsx
const [user, setUser] = useState({ name: "Alice", age: 30 });
const [userName, setUserName] = useState("Alice");
```

**Why it's bad:** Two pieces of state representing the same data will inevitably diverge, creating bugs.

**Detection:** Heuristic — multiple `useState` calls whose initial values are derived from the same source or represent overlapping data. This is difficult to detect automatically with high confidence; the LLM judge is better suited for this check.

---

### AP-06: Unstable References in Dependency Arrays

**What it looks like:**
```tsx
useEffect(() => {
  fetchData(options);
}, [options]); // where options = { limit: 10 } created during render
```

**Why it's bad:** Object/array literals created during render are new references on every render, causing the effect to run every time even though the values haven't changed.

**Detection:** Dependency array contains a variable that is assigned an object/array literal in the render body (not from `useState`, `useRef`, `useMemo`, or a stable source).

---

## Best Practice Checks (Positive Signals)

These contribute positively to the static score (+3 points each, up to a cap).

| ID | Practice | Detection |
|---|---|---|
| BP-01 | Custom hooks for reusable logic | Functions named `use*` defined in the codebase |
| BP-02 | No `any` types | Zero occurrences of `: any`, `as any`, `<any>` |
| BP-03 | Typed component props | Components have props typed with `interface` or `type` |
| BP-04 | Named event handlers | Functions handling events are prefixed `handle*` or passed as `on*` props |
| BP-05 | Semantic HTML elements | Uses `<form>`, `<button>`, `<label>`, `<select>`, `<fieldset>` — not `<div onClick>` |
| BP-06 | Labels associated with inputs | `<label htmlFor="...">` matches `<input id="...">`, or `<label>` wraps `<input>` |
| BP-07 | Buttons have explicit type | `<button type="button">` or `<button type="submit">` |
| BP-08 | Controlled form inputs | `<input>` elements have both `value` and `onChange` props |

## Structural Metrics (Informational)

These are reported but do not directly affect the score. They provide context for the LLM judge.

| Metric | Healthy Range | Red Flag |
|---|---|---|
| Component count | 5–15 | < 3 or > 20 |
| `useEffect` count | 1–3 | > 5 |
| Custom hook count | 1–4 | 0 |
| `any` type count | 0 | > 0 |
| Average component lines | 30–80 | > 150 |
| Max component lines | < 150 | > 300 |
