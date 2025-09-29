import { renderHook, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useSearchInputFocus } from '../use-search-input-focus';

// Mock requestAnimationFrame
const mockRequestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  setTimeout(callback, 16); // ~60fps
  return 1;
});

// Mock HTMLInputElement methods
const mockFocus = jest.fn();
const mockSetSelectionRange = jest.fn();

beforeAll(() => {
  global.requestAnimationFrame = mockRequestAnimationFrame;

  // Mock HTMLInputElement prototype methods
  Object.defineProperty(HTMLInputElement.prototype, 'focus', {
    value: mockFocus,
    writable: true,
  });

  Object.defineProperty(HTMLInputElement.prototype, 'setSelectionRange', {
    value: mockSetSelectionRange,
    writable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSearchInputFocus', () => {
  describe('Basic Hook Functionality', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useSearchInputFocus());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.inputRef.current).toBeNull();
      expect(typeof result.current.handleInputChange).toBe('function');
    });

    it('should update searchQuery when handleInputChange is called', () => {
      const { result } = renderHook(() => useSearchInputFocus());

      // Create a mock input element
      const mockInput = document.createElement('input');
      mockInput.value = 'test query';

      act(() => {
        // Set the ref to our mock input
        (result.current.inputRef as any).current = mockInput;
      });

      act(() => {
        result.current.handleInputChange({
          target: mockInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.searchQuery).toBe('test query');
    });
  });

  describe('Focus Management', () => {
    it('should call focus on input after state change', async () => {
      const { result } = renderHook(() => useSearchInputFocus());

      // Create and attach mock input
      const mockInput = document.createElement('input');
      mockInput.focus = mockFocus;
      mockInput.setSelectionRange = mockSetSelectionRange;
      mockInput.value = 'test';

      act(() => {
        (result.current.inputRef as any).current = mockInput;
      });

      act(() => {
        result.current.handleInputChange({
          target: mockInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Wait for requestAnimationFrame to execute
      await waitFor(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockFocus).toHaveBeenCalled();
      });
    });

    it('should set cursor position to end of input after focus', async () => {
      const { result } = renderHook(() => useSearchInputFocus());

      const mockInput = document.createElement('input');
      mockInput.value = 'hello';
      mockInput.focus = mockFocus;
      mockInput.setSelectionRange = mockSetSelectionRange;

      act(() => {
        (result.current.inputRef as any).current = mockInput;
      });

      act(() => {
        result.current.handleInputChange({
          target: mockInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      await waitFor(() => {
        expect(mockSetSelectionRange).toHaveBeenCalledWith(5, 5); // Length of 'hello'
      });
    });

    it('should handle empty input value correctly', async () => {
      const { result } = renderHook(() => useSearchInputFocus());

      const mockInput = document.createElement('input');
      mockInput.value = '';
      mockInput.focus = mockFocus;
      mockInput.setSelectionRange = mockSetSelectionRange;

      act(() => {
        (result.current.inputRef as any).current = mockInput;
      });

      act(() => {
        result.current.handleInputChange({
          target: mockInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      await waitFor(() => {
        expect(mockSetSelectionRange).toHaveBeenCalledWith(0, 0);
      });
    });

    it('should not throw error if inputRef is null', async () => {
      const { result } = renderHook(() => useSearchInputFocus());

      expect(() => {
        act(() => {
          result.current.handleInputChange({
            target: { value: 'test' },
          } as React.ChangeEvent<HTMLInputElement>);
        });
      }).not.toThrow();

      // Should still update searchQuery even if ref is null
      expect(result.current.searchQuery).toBe('test');
    });
  });

  describe('Performance and Memory', () => {
    it('should use stable handleInputChange callback', () => {
      const { result, rerender } = renderHook(() => useSearchInputFocus());

      const firstCallback = result.current.handleInputChange;

      rerender();

      const secondCallback = result.current.handleInputChange;

      expect(firstCallback).toBe(secondCallback);
    });

    it('should handle rapid input changes without issues', async () => {
      const { result } = renderHook(() => useSearchInputFocus());

      const mockInput = document.createElement('input');
      mockInput.focus = mockFocus;
      mockInput.setSelectionRange = mockSetSelectionRange;

      act(() => {
        (result.current.inputRef as any).current = mockInput;
      });

      // Simulate rapid typing
      const values = ['a', 'ab', 'abc', 'abcd'];

      for (const value of values) {
        mockInput.value = value;
        act(() => {
          result.current.handleInputChange({
            target: mockInput,
          } as React.ChangeEvent<HTMLInputElement>);
        });
      }

      expect(result.current.searchQuery).toBe('abcd');

      // Focus should be called for each change
      await waitFor(() => {
        expect(mockFocus).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in input', async () => {
      const { result } = renderHook(() => useSearchInputFocus());

      const mockInput = document.createElement('input');
      mockInput.value = '!@#$%^&*()';
      mockInput.focus = mockFocus;
      mockInput.setSelectionRange = mockSetSelectionRange;

      act(() => {
        (result.current.inputRef as any).current = mockInput;
      });

      act(() => {
        result.current.handleInputChange({
          target: mockInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.searchQuery).toBe('!@#$%^&*()');

      await waitFor(() => {
        expect(mockSetSelectionRange).toHaveBeenCalledWith(10, 10);
      });
    });

    it('should handle unicode characters correctly', async () => {
      const { result } = renderHook(() => useSearchInputFocus());

      const mockInput = document.createElement('input');
      const unicodeText = '你好世界🌍';
      mockInput.value = unicodeText;
      mockInput.focus = mockFocus;
      mockInput.setSelectionRange = mockSetSelectionRange;

      act(() => {
        (result.current.inputRef as any).current = mockInput;
      });

      act(() => {
        result.current.handleInputChange({
          target: mockInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.searchQuery).toBe(unicodeText);

      await waitFor(() => {
        expect(mockSetSelectionRange).toHaveBeenCalledWith(unicodeText.length, unicodeText.length);
      });
    });

    it('should handle input with only whitespace', async () => {
      const { result } = renderHook(() => useSearchInputFocus());

      const mockInput = document.createElement('input');
      mockInput.value = '   ';
      mockInput.focus = mockFocus;
      mockInput.setSelectionRange = mockSetSelectionRange;

      act(() => {
        (result.current.inputRef as any).current = mockInput;
      });

      act(() => {
        result.current.handleInputChange({
          target: mockInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.searchQuery).toBe('   ');

      await waitFor(() => {
        expect(mockSetSelectionRange).toHaveBeenCalledWith(3, 3);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should work correctly when input loses focus externally', async () => {
      const { result } = renderHook(() => useSearchInputFocus());

      const mockInput = document.createElement('input');
      mockInput.focus = mockFocus;
      mockInput.setSelectionRange = mockSetSelectionRange;

      act(() => {
        (result.current.inputRef as any).current = mockInput;
      });

      // Simulate external blur
      fireEvent.blur(mockInput);

      // Then user types again
      mockInput.value = 'after blur';
      act(() => {
        result.current.handleInputChange({
          target: mockInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      await waitFor(() => {
        expect(mockFocus).toHaveBeenCalled();
      });
    });

    it('should maintain focus through multiple re-renders', async () => {
      const { result, rerender } = renderHook(() => useSearchInputFocus());

      const mockInput = document.createElement('input');
      mockInput.focus = mockFocus;
      mockInput.setSelectionRange = mockSetSelectionRange;

      act(() => {
        (result.current.inputRef as any).current = mockInput;
      });

      // Type and cause re-renders
      for (let i = 0; i < 5; i++) {
        mockInput.value = `search${i}`;

        act(() => {
          result.current.handleInputChange({
            target: mockInput,
          } as React.ChangeEvent<HTMLInputElement>);
        });

        rerender(); // Force component re-render
      }

      expect(result.current.searchQuery).toBe('search4');

      await waitFor(() => {
        expect(mockFocus).toHaveBeenCalledTimes(5);
      });
    });
  });
});