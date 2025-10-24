# shadcn Select Component Analysis

## Architecture Overview

The shadcn Select component is built on **Radix UI primitives**:
- `@radix-ui/react-select` - Base select functionality
- Uses `SelectPrimitive.Portal` for dropdown rendering
- Uses `SelectPrimitive.Content` with animations and positioning

## Key Findings

### 1. Portal Rendering Behavior
```tsx
// Lines 60-85 in select.tsx
<SelectPrimitive.Portal>
  <SelectPrimitive.Content>
    <SelectPrimitive.Viewport>
      {children} // Our Input component lives here
    </SelectPrimitive.Viewport>
  </SelectPrimitive.Content>
</SelectPrimitive.Portal>
```

**Issue**: The `Portal` creates the dropdown content in a different DOM tree. When React re-renders due to state changes, the entire portal content gets re-rendered.

### 2. Viewport and Content Re-rendering
The `SelectPrimitive.Viewport` (lines 73-81) contains our search Input. Every time `boardSearchQuery` state changes:

1. Parent QuickCreateForm re-renders
2. SelectContent children get re-rendered
3. Viewport re-renders
4. Input element gets replaced/updated
5. **Focus is lost during the virtual DOM reconciliation**

### 3. Focus Management Gap
**Missing**: Radix Select doesn't provide built-in focus management for custom inputs inside the dropdown content. It's designed for standard select items, not search inputs.

### 4. Animation and State Management
```tsx
// Line 64-68: Animation classes
className={cn(
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ...",
)}
```

The animations and state management could be interfering with focus during transitions.

## Root Cause Analysis

### Primary Issue: React Reconciliation + Portal Rendering
1. **State Update**: `setBoardSearchQuery` triggers re-render
2. **Portal Re-render**: Entire SelectContent portal re-renders
3. **Input Replacement**: Virtual DOM reconciliation replaces Input element
4. **Focus Loss**: New Input element doesn't have focus (React doesn't preserve it automatically)

### Secondary Issues:
1. **No Focus Preservation**: No `useRef` or focus management strategy
2. **Aggressive Re-rendering**: Every keystroke causes full component tree re-render
3. **Portal Boundary**: Focus management across portal boundaries is complex

## Radix UI Select Limitations

### What Radix Provides:
- Keyboard navigation for SelectItems
- ARIA accessibility for standard select behavior
- Focus management for trigger and items

### What Radix DOESN'T Provide:
- Focus management for custom input elements
- Search input handling inside dropdown
- Focus preservation during re-renders

## Solutions Identified

### 1. Focus Restoration Pattern
```tsx
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
}, [boardSearchQuery]);
```

### 2. Prevent Re-render During Typing
```tsx
const [searchQuery, setSearchQuery] = useState("");
const deferredQuery = useDeferredValue(searchQuery); // React 18+
```

### 3. Custom Dropdown (Alternative)
Replace Radix Select with custom dropdown that's designed for search scenarios.

### 4. Focus Trap Pattern
```tsx
const handleInputChange = (e) => {
  const input = e.target;
  const value = e.target.value;
  setSearchQuery(value);

  // Restore focus after state update
  requestAnimationFrame(() => {
    input.focus();
  });
};
```

## Next Steps for Investigation
1. Test focus restoration patterns
2. Analyze performance impact of solutions
3. Test cross-browser compatibility
4. Verify accessibility requirements