import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  { id: '1', name: 'Development Sprint', access: ['user1'] },
  { id: '2', name: 'Marketing Campaign', access: ['user1'] },
  { id: '3', name: 'Product Planning', access: ['user1'] },
  { id: '4', name: 'Customer Support', access: ['user1'] },
  { id: '5', name: 'Design Projects', access: ['user1'] },
];

const mockBoardSections = [
  { id: '1-1', name: 'To Do', position: 0, boardId: '1' },
  { id: '1-2', name: 'In Progress', position: 1, boardId: '1' },
  { id: '1-3', name: 'Done', position: 2, boardId: '1' },
];

const mockSession = {
  user: {
    id: 'user1',
    email: 'test@example.com',
    activeCompanyId: 'company1',
  },
};

describe('Complete Search Workflow E2E Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    (useSession as jest.Mock).mockReturnValue({ data: mockSession });

    const { getBoards } = require('@/actions/tasks/get-boards');
    (getBoards as jest.Mock).mockResolvedValue(mockBoards);

    const { getBoardSections } = require('@/actions/tasks/get-board-sections');
    (getBoardSections as jest.Mock).mockResolvedValue(mockBoardSections);

    const { createTask } = require('@/actions/tasks/create-task');
    (createTask as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Search and Selection Workflow', () => {
    it('should complete full search-to-task-creation workflow', async () => {
      render(<QuickCreateForm />);

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Step 1: Open board dropdown
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      // Step 2: Search for board
      const searchInput = screen.getByPlaceholderText('Search boards...');
      await user.type(searchInput, 'Development');

      // Step 3: Verify filtering works
      await waitFor(() => {
        expect(screen.getByText('Development Sprint')).toBeInTheDocument();
        expect(screen.queryByText('Marketing Campaign')).not.toBeInTheDocument();
      });

      // Step 4: Select board
      const developmentBoard = screen.getByText('Development Sprint');
      await user.click(developmentBoard);

      // Step 5: Verify board selection and board sections load
      await waitFor(() => {
        const boardTriggerAfterSelection = screen.getByRole('combobox', { name: /board/i });
        expect(boardTriggerAfterSelection).toHaveTextContent('Development Sprint');
      });

      // Step 6: Select board section
      const sectionTrigger = screen.getByRole('combobox', { name: /board section/i });
      await user.click(sectionTrigger);

      const todoSection = await screen.findByText('To Do');
      await user.click(todoSection);

      // Step 7: Fill out task details
      const titleInput = screen.getByPlaceholderText('Task title');
      await user.type(titleInput, 'Test Task from Search');

      const descriptionInput = screen.getByPlaceholderText('Task description');
      await user.type(descriptionInput, 'Task created via search workflow test');

      // Step 8: Submit form
      const createButton = screen.getByRole('button', { name: /create task/i });
      await user.click(createButton);

      // Step 9: Verify task creation was called
      await waitFor(() => {
        const { createTask } = require('@/actions/tasks/create-task');
        expect(createTask).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Task from Search',
            description: 'Task created via search workflow test',
            status: 'NEW',
            priority: 'MEDIUM',
          }),
          '1-1' // To Do section ID
        );
      });
    });

    it('should handle search refinement and re-selection', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Open dropdown
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      // First search
      const searchInput = screen.getByPlaceholderText('Search boards...');
      await user.type(searchInput, 'Product');

      await waitFor(() => {
        expect(screen.getByText('Product Planning')).toBeInTheDocument();
        expect(screen.queryByText('Development Sprint')).not.toBeInTheDocument();
      });

      // Refine search (backspace and type different)
      await user.clear(searchInput);
      await user.type(searchInput, 'Design');

      await waitFor(() => {
        expect(screen.getByText('Design Projects')).toBeInTheDocument();
        expect(screen.queryByText('Product Planning')).not.toBeInTheDocument();
      });

      // Select refined result
      const designBoard = screen.getByText('Design Projects');
      await user.click(designBoard);

      // Verify selection
      await waitFor(() => {
        const boardTriggerAfterSelection = screen.getByRole('combobox', { name: /board/i });
        expect(boardTriggerAfterSelection).toHaveTextContent('Design Projects');
      });
    });

    it('should handle keyboard navigation in search workflow', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Open dropdown with keyboard
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      boardTrigger.focus();
      await user.keyboard('{Enter}');

      // Search with keyboard
      const searchInput = screen.getByPlaceholderText('Search boards...');
      await user.type(searchInput, 'Marketing');

      await waitFor(() => {
        expect(screen.getByText('Marketing Campaign')).toBeInTheDocument();
      });

      // Navigate and select with keyboard
      await user.keyboard('{Tab}'); // Move to first board item
      await user.keyboard('{Enter}'); // Select it

      // Verify selection
      await waitFor(() => {
        const boardTriggerAfterSelection = screen.getByRole('combobox', { name: /board/i });
        expect(boardTriggerAfterSelection).toHaveTextContent('Marketing Campaign');
      });
    });

    it('should handle escape key to close dropdown', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Open dropdown
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      // Type in search
      const searchInput = screen.getByPlaceholderText('Search boards...');
      await user.type(searchInput, 'Development');

      // Press escape
      await user.keyboard('{Escape}');

      // Verify dropdown closed and search cleared
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search boards...')).not.toBeInTheDocument();
      });

      // Reopen to verify search was cleared
      await user.click(boardTrigger);
      const newSearchInput = screen.getByPlaceholderText('Search boards...');
      expect(newSearchInput).toHaveValue('');
    });
  });

  describe('Search Edge Cases and Error Handling', () => {
    it('should handle no search results gracefully', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');
      await user.type(searchInput, 'NonExistentBoard123');

      await waitFor(() => {
        expect(screen.getByText('No boards found')).toBeInTheDocument();
        expect(searchInput).toHaveValue('NonExistentBoard123');
      });

      // Should still be able to clear search
      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.queryByText('No boards found')).not.toBeInTheDocument();
        expect(screen.getByText('Development Sprint')).toBeInTheDocument();
      });
    });

    it('should handle special characters in search', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Test various special characters
      const specialChars = ['@#$%', '   ', '...', '123', 'àáâãäå'];

      for (const chars of specialChars) {
        await user.clear(searchInput);
        await user.type(searchInput, chars);

        // Should handle gracefully without errors
        expect(searchInput).toHaveValue(chars);

        // Should show no results for non-matching special chars
        if (!mockBoards.some(board => board.name.toLowerCase().includes(chars.toLowerCase()))) {
          await waitFor(() => {
            expect(screen.getByText('No boards found')).toBeInTheDocument();
          });
        }
      }
    });

    it('should handle rapid open/close cycles', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });

      // Rapid open/close cycles
      for (let i = 0; i < 5; i++) {
        await user.click(boardTrigger); // Open

        if (i % 2 === 0) {
          // Sometimes type something
          const searchInput = screen.getByPlaceholderText('Search boards...');
          await user.type(searchInput, 'test');
        }

        await user.keyboard('{Escape}'); // Close

        // Small delay to prevent test flakiness
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Final state should be clean
      expect(screen.queryByPlaceholderText('Search boards...')).not.toBeInTheDocument();
    });
  });

  describe('Focus Management Throughout Workflow', () => {
    it('should maintain proper focus throughout search workflow', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Open dropdown
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      // Focus should move to search input
      const searchInput = screen.getByPlaceholderText('Search boards...');
      searchInput.focus(); // Simulate focus moving to input

      // Type continuously and verify focus is maintained
      const searchText = 'Development Sprint';

      for (let i = 1; i <= searchText.length; i++) {
        const partialText = searchText.substring(0, i);

        // Clear and type incrementally to simulate real typing
        await user.clear(searchInput);
        await user.type(searchInput, partialText);

        // Verify focus is maintained after each character
        expect(document.activeElement).toBe(searchInput);
        expect(searchInput).toHaveValue(partialText);
      }

      // Select board
      const boardOption = screen.getByText('Development Sprint');
      await user.click(boardOption);

      // Focus should return to trigger or move to next form field
      await waitFor(() => {
        // Either the board trigger has focus or the next form element
        const focusedElement = document.activeElement;
        expect([boardTrigger, screen.getByRole('combobox', { name: /board section/i })])
          .toContainEqual(focusedElement);
      });
    });

    it('should handle tab navigation correctly', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Tab through form elements
      await user.tab(); // Should focus on board trigger
      expect(document.activeElement).toBe(screen.getByRole('combobox', { name: /board/i }));

      await user.tab(); // Should focus on board section trigger
      expect(document.activeElement).toBe(screen.getByRole('combobox', { name: /board section/i }));

      await user.tab(); // Should focus on title input
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Task title'));

      await user.tab(); // Should focus on description textarea
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Task description'));
    });
  });
});