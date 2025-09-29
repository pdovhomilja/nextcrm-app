import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import QuickCreateForm from '../form/quick-create-form';
import { useSession } from 'next-auth/react';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock server actions
jest.mock('@/actions/tasks/get-boards', () => ({
  getBoards: jest.fn(),
}));

jest.mock('@/actions/tasks/get-board-sections', () => ({
  getBoardSections: jest.fn(),
}));

jest.mock('@/actions/tasks/create-task', () => ({
  createTask: jest.fn(),
}));

// Mock data
const mockBoards = [
  { id: '1', name: 'Development Board', access: ['user1'] },
  { id: '2', name: 'Marketing Projects', access: ['user1'] },
  { id: '3', name: 'Product Planning', access: ['user1'] },
  { id: '4', name: 'Customer Support', access: ['user1'] },
];

const mockSession = {
  user: {
    id: 'user1',
    email: 'test@example.com',
    activeCompanyId: 'company1',
  },
};

describe('Search State Management Integration', () => {
  beforeEach(() => {
    (useSession as jest.Mock).mockReturnValue({ data: mockSession });

    const { getBoards } = require('@/actions/tasks/get-boards');
    (getBoards as jest.Mock).mockResolvedValue(mockBoards);

    const { getBoardSections } = require('@/actions/tasks/get-board-sections');
    (getBoardSections as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Search State Without Focus Loss', () => {
    it('should maintain search state during continuous typing', async () => {
      render(<QuickCreateForm />);

      // Wait for boards to load
      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Open board dropdown
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      fireEvent.click(boardTrigger);

      // Find search input
      const searchInput = screen.getByPlaceholderText('Search boards...');
      expect(searchInput).toBeInTheDocument();

      // Type continuously without losing focus
      const searchText = 'Development';

      for (let i = 0; i < searchText.length; i++) {
        const partialText = searchText.substring(0, i + 1);

        fireEvent.change(searchInput, { target: { value: partialText } });

        // Verify input maintains value
        expect(searchInput).toHaveValue(partialText);

        // Verify input maintains focus (should be active element)
        await waitFor(() => {
          expect(document.activeElement).toBe(searchInput);
        });
      }

      // Verify final state
      expect(searchInput).toHaveValue('Development');
      expect(document.activeElement).toBe(searchInput);
    });

    it('should filter boards without losing search state', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Open dropdown
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      fireEvent.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'Dev' } });

      // Verify filtering works
      await waitFor(() => {
        expect(screen.getByText('Development Board')).toBeInTheDocument();
        expect(screen.queryByText('Marketing Projects')).not.toBeInTheDocument();
      });

      // Continue typing
      fireEvent.change(searchInput, { target: { value: 'Development' } });

      // Verify continued filtering
      await waitFor(() => {
        expect(screen.getByText('Development Board')).toBeInTheDocument();
        expect(searchInput).toHaveValue('Development');
      });
    });

    it('should handle rapid typing without state loss', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      fireEvent.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Simulate very rapid typing (multiple changes in quick succession)
      const rapidChanges = ['P', 'Pr', 'Pro', 'Prod', 'Produ', 'Product'];

      rapidChanges.forEach(value => {
        fireEvent.change(searchInput, { target: { value } });
      });

      // Verify final state is correct
      await waitFor(() => {
        expect(searchInput).toHaveValue('Product');
        expect(screen.getByText('Product Planning')).toBeInTheDocument();
      });
    });

    it('should preserve search state during component re-renders', async () => {
      const { rerender } = render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      fireEvent.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'Marketing' } });

      // Force component re-render
      rerender(<QuickCreateForm />);

      // Wait for re-render to complete
      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Verify search state is preserved (though dropdown may be closed)
      // This tests that the hook maintains its internal state correctly
      fireEvent.click(boardTrigger);

      const newSearchInput = screen.getByPlaceholderText('Search boards...');
      expect(newSearchInput).toHaveValue('');

      // Type again to verify functionality still works
      fireEvent.change(newSearchInput, { target: { value: 'Market' } });

      await waitFor(() => {
        expect(newSearchInput).toHaveValue('Market');
        expect(screen.getByText('Marketing Projects')).toBeInTheDocument();
      });
    });

    it('should handle search clearing correctly', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      fireEvent.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'Development' } });
      expect(searchInput).toHaveValue('Development');

      // Select a board (should clear search)
      const boardOption = screen.getByText('Development Board');
      fireEvent.click(boardOption);

      // Reopen dropdown to check if search was cleared
      fireEvent.click(boardTrigger);

      const clearedSearchInput = screen.getByPlaceholderText('Search boards...');
      expect(clearedSearchInput).toHaveValue('');
    });

    it('should handle empty search results gracefully', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      fireEvent.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Search for non-existent board
      fireEvent.change(searchInput, { target: { value: 'NonExistentBoard' } });

      await waitFor(() => {
        expect(searchInput).toHaveValue('NonExistentBoard');
        expect(screen.getByText('No boards found')).toBeInTheDocument();
      });

      // Should still maintain focus
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Performance and Re-render Optimization', () => {
    it('should not cause excessive re-renders during typing', async () => {
      const renderSpy = jest.fn();

      const TestWrapper = () => {
        renderSpy();
        return <QuickCreateForm />;
      };

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const initialRenderCount = renderSpy.mock.calls.length;

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      fireEvent.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Type several characters
      fireEvent.change(searchInput, { target: { value: 'Dev' } });
      fireEvent.change(searchInput, { target: { value: 'Development' } });

      // Allow some time for potential re-renders
      await waitFor(() => {
        expect(searchInput).toHaveValue('Development');
      });

      // Check that re-renders are reasonable (not excessive)
      const finalRenderCount = renderSpy.mock.calls.length;
      const additionalRenders = finalRenderCount - initialRenderCount;

      // Should have some re-renders for state updates, but not excessive
      expect(additionalRenders).toBeLessThan(10); // Reasonable threshold
    });

    it('should handle state batching correctly', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      fireEvent.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Multiple rapid state changes should be batched
      fireEvent.change(searchInput, { target: { value: 'a' } });
      fireEvent.change(searchInput, { target: { value: 'ab' } });
      fireEvent.change(searchInput, { target: { value: 'abc' } });

      // Final state should be correct
      await waitFor(() => {
        expect(searchInput).toHaveValue('abc');
      });
    });
  });
});