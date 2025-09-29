# React Focus Management Best Practices

## Core Principles

### 1. Use useRef for DOM Element References
```tsx
const inputRef = useRef<HTMLInputElement>(null);

// Good: Direct DOM manipulation when needed
useEffect(() => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
}, [dependency]);
```

### 2. Focus Management with useEffect
```tsx
// Pattern: Focus restoration after state updates
useEffect(() => {
  if (inputRef.current && shouldFocus) {
    inputRef.current.focus();
  }
}, [searchQuery]); // Focus after search query changes
```

### 3. requestAnimationFrame for Timing
```tsx
const restoreFocus = () => {
  requestAnimationFrame(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  });
};
```

## Advanced Patterns

### 4. Focus Trap Hook
```tsx
const useFocusTrap = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);

  return containerRef;
};
```

### 5. Search Input Focus Management
```tsx
const useSearchFocus = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Maintain focus after state update
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const length = value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    });
  }, []);

  return { inputRef, searchQuery, handleInputChange };
};
```

## Portal-Specific Patterns

### 6. Portal Focus Management
```tsx
const usePortalFocus = (isOpen: boolean) => {
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && portalRef.current) {
      const firstFocusable = portalRef.current.querySelector(
        'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;

      if (firstFocusable) {
        requestAnimationFrame(() => {
          firstFocusable.focus();
        });
      }
    }
  }, [isOpen]);

  return portalRef;
};
```

### 7. Focus Return Pattern
```tsx
const useFocusReturn = () => {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const storeFocus = useCallback(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
  }, []);

  const returnFocus = useCallback(() => {
    if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, []);

  return { storeFocus, returnFocus };
};
```

## Performance Optimizations

### 8. Debounced Focus Management
```tsx
const useDebouncedFocus = (delay = 100) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedFocus = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { inputRef, debouncedFocus };
};
```

### 9. Conditional Focus with State Guards
```tsx
const useConditionalFocus = (condition: boolean) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldFocusRef = useRef(false);

  useEffect(() => {
    if (condition && shouldFocusRef.current && inputRef.current) {
      inputRef.current.focus();
      shouldFocusRef.current = false;
    }
  }, [condition]);

  const triggerFocus = useCallback(() => {
    shouldFocusRef.current = true;
  }, []);

  return { inputRef, triggerFocus };
};
```

## Accessibility Considerations

### 10. ARIA and Focus Management
```tsx
const useAccessibleFocus = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusWithAnnouncement = useCallback((message?: string) => {
    if (inputRef.current) {
      inputRef.current.focus();

      if (message) {
        // Create temporary element for screen reader announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
      }
    }
  }, []);

  return { inputRef, focusWithAnnouncement };
};
```

## React 18 Specific Patterns

### 11. useDeferredValue for Focus
```tsx
const useDeferredFocus = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  // Focus management with deferred value
  useEffect(() => {
    if (inputRef.current && searchQuery !== deferredQuery) {
      inputRef.current.focus();
    }
  }, [searchQuery, deferredQuery]);

  return { inputRef, searchQuery, setSearchQuery, deferredQuery };
};
```

### 12. useTransition for Non-Urgent Updates
```tsx
const useTransitionFocus = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSearchChange = useCallback((value: string) => {
    // Urgent: Update input value immediately
    setSearchQuery(value);

    // Non-urgent: Update filtered results
    startTransition(() => {
      // Filter logic here
    });

    // Maintain focus
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });
  }, []);

  return { inputRef, searchQuery, handleSearchChange, isPending };
};
```

## Common Anti-Patterns to Avoid

### ❌ Don't: Force focus on every render
```tsx
// BAD - causes focus issues
useEffect(() => {
  inputRef.current?.focus(); // Runs on every render
});
```

### ❌ Don't: Use setTimeout without cleanup
```tsx
// BAD - memory leaks and race conditions
setTimeout(() => {
  inputRef.current?.focus();
}, 100); // No cleanup
```

### ❌ Don't: Mix controlled and uncontrolled components
```tsx
// BAD - unpredictable behavior
<input
  ref={inputRef}
  defaultValue="something" // uncontrolled
  value={searchQuery} // controlled
/>
```

### ✅ Do: Use proper dependency arrays
```tsx
// GOOD - predictable focus behavior
useEffect(() => {
  if (inputRef.current && isVisible) {
    inputRef.current.focus();
  }
}, [isVisible]); // Clear dependencies
```