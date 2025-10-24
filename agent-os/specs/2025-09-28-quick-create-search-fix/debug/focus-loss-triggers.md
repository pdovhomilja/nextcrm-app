# Specific Triggers Causing Focus Loss

## Primary Trigger: State Update Chain Reaction

### Trigger 1: `setBoardSearchQuery` State Update
**Location**: `quick-create-form.tsx:256`
```tsx
onChange={(e) => setBoardSearchQuery(e.target.value)}
```
**Impact**: Every keystroke triggers full component re-render

### Trigger 2: `useMemo` Recalculation
**Location**: `quick-create-form.tsx:87-92`
```tsx
const filteredBoards = useMemo(() => {
  if (!boardSearchQuery.trim()) return boards;
  return boards.filter((board) =>
    board.name.toLowerCase().includes(boardSearchQuery.toLowerCase())
  );
}, [boards, boardSearchQuery]); // ← Recalculates on every boardSearchQuery change
```
**Impact**: Forces re-render of SelectContent children

### Trigger 3: React Reconciliation Process
**Location**: Virtual DOM diffing during re-render
**Impact**: Input element gets replaced/updated, losing focus

## Secondary Triggers: Component Re-render Cascade

### Trigger 4: Form State Dependencies
**Location**: `quick-create-form.tsx:94-115`
```tsx
useEffect(() => {
  // Board loading logic
}, [user?.id, user?.activeCompanyId, form]); // ← form dependency
```
**Impact**: Form object changes can trigger additional re-renders

### Trigger 5: Radix Portal Re-rendering
**Location**: Radix UI SelectContent Portal
**Impact**: Portal content gets completely re-rendered on state changes

## Timing-Based Triggers

### Trigger 6: React 18 Concurrent Rendering
**Impact**: State updates may be batched or interrupted, affecting focus timing

### Trigger 7: Browser Event Loop
**Sequence**:
1. User keystroke (synchronous)
2. onChange handler (synchronous)
3. setState call (asynchronous)
4. React render scheduling (asynchronous)
5. DOM reconciliation (asynchronous)
6. Focus loss occurs during step 5

## Event-Based Triggers

### Trigger 8: Missing Focus Event Handling
**Missing Pattern**:
```tsx
// This is NOT implemented in current code
onBlur={(e) => {
  // Prevent unwanted blur during re-render
  if (document.activeElement === e.target) return;
}}
```

### Trigger 9: Portal Event Boundaries
**Issue**: Events inside Radix Portal may not behave as expected with stopPropagation

## Solution Mapping by Trigger

### For Trigger 1 (State Update):
```tsx
// Solution: Debounced state or useRef + useEffect pattern
const searchInputRef = useRef<HTMLInputElement>(null);
const [searchQuery, setSearchQuery] = useState("");

const handleInputChange = (e) => {
  const value = e.target.value;
  setSearchQuery(value);

  // Immediate focus restoration
  requestAnimationFrame(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  });
};
```

### For Trigger 2 (useMemo):
```tsx
// Solution: useDeferredValue (React 18+) or debounced filtering
const deferredSearchQuery = useDeferredValue(boardSearchQuery);
const filteredBoards = useMemo(() => {
  if (!deferredSearchQuery.trim()) return boards;
  return boards.filter((board) =>
    board.name.toLowerCase().includes(deferredSearchQuery.toLowerCase())
  );
}, [boards, deferredSearchQuery]);
```

### For Trigger 3 (Reconciliation):
```tsx
// Solution: Focus management hook
const useFocusManagement = (searchQuery: string) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && searchQuery) {
      inputRef.current.focus();
      // Maintain cursor position
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [searchQuery]);

  return inputRef;
};
```

### For Trigger 4 (Form Dependencies):
```tsx
// Solution: Stabilize form reference
const form = useForm({
  // config
});

// Use stable reference
const stableForm = useRef(form);
```

### For Trigger 5 (Portal Re-rendering):
```tsx
// Solution: Memoize SelectContent
const MemoizedSelectContent = memo(({ children, ...props }) => (
  <SelectContent {...props}>{children}</SelectContent>
));
```

## Critical Path Analysis

### High-Impact Triggers (Must Fix):
1. **Trigger 1**: `setBoardSearchQuery` - Direct cause
2. **Trigger 3**: React reconciliation - Core issue
3. **Trigger 2**: `useMemo` recalculation - Performance impact

### Medium-Impact Triggers (Should Fix):
4. **Trigger 5**: Portal re-rendering - Architectural issue
5. **Trigger 8**: Missing focus handling - UX improvement

### Low-Impact Triggers (Nice to Have):
6. **Trigger 4**: Form dependencies - Edge case
7. **Trigger 6**: Concurrent rendering - Already optimized by React
8. **Trigger 7**: Event loop - System behavior

## Test Validation Strategy

### Trigger Isolation Tests:
1. Test with state updates disabled
2. Test with memoization disabled
3. Test with manual focus restoration
4. Test with portal alternatives
5. Test with event handler modifications

### Performance Impact Tests:
- Measure re-render frequency
- Measure focus restoration time
- Test with large board lists
- Test on slower devices