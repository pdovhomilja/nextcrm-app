# React Re-rendering Analysis for Quick Create Focus Issue

## Current Component State Management

### State Variables in QuickCreateForm:
1. `isLoading` - Controls loading states
2. `isSubmitting` - Controls form submission state
3. `boards` - Array of available boards
4. `boardSections` - Array of sections for selected board
5. `month` - Calendar month state
6. `isDuePopoverOpen` - Due date popover state
7. `boardSearchQuery` - Search input value (THIS IS THE PROBLEMATIC STATE)

### Form State (React Hook Form):
- `form` - React Hook Form instance with multiple fields
- `selectedBoardId` - Watched value from form.watch("boardId")

## Re-rendering Triggers Analysis

### Primary Suspect: `setBoardSearchQuery` calls

```tsx
// Line 256 in quick-create-form.tsx
onChange={(e) => setBoardSearchQuery(e.target.value)}
```

**Issue Identified**: Every keystroke triggers:
1. `setBoardSearchQuery(e.target.value)`
2. Component re-render
3. `useMemo` for `filteredBoards` recalculates
4. Select component re-renders
5. Input loses focus during re-render

### Secondary Suspects:

1. **Form.watch() side effects**:
   ```tsx
   const selectedBoardId = form.watch("boardId"); // Line 84
   ```

2. **useEffect dependencies**:
   ```tsx
   // Lines 94-115: Boards loading effect
   useEffect(() => {
     // ... getBoards call
   }, [user?.id, user?.activeCompanyId, form]);

   // Lines 117-138: Board sections loading effect
   useEffect(() => {
     // ... getBoardSections call
   }, [selectedBoardId]);
   ```

3. **useMemo dependency array**:
   ```tsx
   // Lines 87-92: Filtered boards calculation
   const filteredBoards = useMemo(() => {
     if (!boardSearchQuery.trim()) return boards;
     return boards.filter((board) =>
       board.name.toLowerCase().includes(boardSearchQuery.toLowerCase())
     );
   }, [boards, boardSearchQuery]); // Re-runs on every boardSearchQuery change
   ```

## React DevTools Investigation Plan

### Render Timing Analysis:
1. Add render counters to track frequency
2. Add console timestamps for performance
3. Monitor component tree changes
4. Track state update batching

### Focus Management Investigation:
1. Document focus events timing
2. Analyze focus restoration attempts
3. Check if focus is lost during virtual DOM updates
4. Verify input element identity persistence

## Hypothesis

**Root Cause Theory**:
The `setBoardSearchQuery` state update triggers a React re-render which causes the entire SelectContent to re-render, including the Input component. During this re-render, the Input element loses focus because:

1. React reconciliation process replaces/updates the Input element
2. Focus is not preserved during the virtual DOM update
3. No explicit focus restoration is implemented after state updates

**Supporting Evidence**:
- Issue occurs after first character (first state update)
- Problem is consistent with React re-rendering behavior
- Input element is nested inside complex Select component structure
- No useRef or focus management patterns are implemented

## Next Steps for Investigation:
1. Add render performance profiling
2. Test focus preservation strategies
3. Analyze shadcn Select component internals
4. Document exact timing of focus loss events