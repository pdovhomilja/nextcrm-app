import { useRef, useState, useCallback } from 'react';

/**
 * Custom hook for managing search input focus in dropdown scenarios.
 *
 * This hook addresses the common issue where search inputs inside Select dropdowns
 * lose focus after each keystroke due to React re-rendering and virtual DOM reconciliation.
 *
 * Key features:
 * - Maintains input focus across React re-renders
 * - Preserves cursor position at the end of input
 * - Uses requestAnimationFrame for optimal timing
 * - Provides stable callback reference for performance
 *
 * @returns Object containing:
 *   - inputRef: RefObject to attach to the input element
 *   - searchQuery: Current search query string
 *   - handleInputChange: Stable callback for onChange events
 *
 * @example
 * ```tsx
 * const { inputRef, searchQuery, handleInputChange } = useSearchInputFocus();
 *
 * return (
 *   <Input
 *     ref={inputRef}
 *     value={searchQuery}
 *     onChange={handleInputChange}
 *     placeholder="Search..."
 *   />
 * );
 * ```
 */
export const useSearchInputFocus = () => {
  // Ref to maintain direct access to the input DOM element
  const inputRef = useRef<HTMLInputElement>(null);

  // State to track the current search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  /**
   * Handles input change events with automatic focus restoration.
   *
   * This function:
   * 1. Updates the search query state
   * 2. Schedules focus restoration using requestAnimationFrame
   * 3. Preserves cursor position at the end of the input
   *
   * The requestAnimationFrame ensures focus restoration happens after
   * React's reconciliation process completes, preventing timing issues.
   */
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    // Update search query state (triggers React re-render)
    setSearchQuery(value);

    // Schedule focus restoration after React reconciliation
    requestAnimationFrame(() => {
      const inputElement = inputRef.current;

      if (inputElement) {
        // Restore focus to the input element
        inputElement.focus();

        // Set cursor position to the end of the input
        // This ensures a natural typing experience
        const length = value.length;
        inputElement.setSelectionRange(length, length);
      }
    });
  }, []); // Empty dependency array for stable callback reference

  /**
   * Clears the search query and maintains focus if the input is available.
   * Useful for resetting the search when dropdown closes or selection is made.
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');

    // Maintain focus after clearing if input is available
    requestAnimationFrame(() => {
      const inputElement = inputRef.current;
      if (inputElement) {
        inputElement.focus();
      }
    });
  }, []);

  return {
    inputRef,
    searchQuery,
    handleInputChange,
    clearSearch,
  };
};