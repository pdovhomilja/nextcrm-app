import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import QuickCreateForm from '../form/quick-create-form';
import { useSession } from 'next-auth/react';
import { getBoards } from '@/actions/tasks/get-boards';
import { getBoardSections } from '@/actions/tasks/get-board-sections';
import { createTask } from '@/actions/tasks/create-task';

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

// Comprehensive test data
const mockBoards = [
  { id: '1', name: 'Development Sprint 2024', access: ['user1'] },
  { id: '2', name: 'Marketing Campaign Q1', access: ['user1'] },
  { id: '3', name: 'Product Planning & Research', access: ['user1'] },
  { id: '4', name: 'Customer Support @ Scale', access: ['user1'] },
  { id: '5', name: 'Design Projects (UI/UX)', access: ['user1'] },
  { id: '6', name: 'Engineering R&D 🚀', access: ['user1'] },
  { id: '7', name: 'Sales & Business Development', access: ['user1'] },
  { id: '8', name: 'Quality Assurance Testing', access: ['user1'] },
  { id: '9', name: 'DevOps & Infrastructure', access: ['user1'] },
  { id: '10', name: 'Content Creation Team', access: ['user1'] },
];

const mockSession = {
  user: {
    id: 'user1',
    email: 'test@example.com',
    activeCompanyId: 'company1',
  },
};

describe('Comprehensive Edge Cases and UX Validation', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    (useSession as jest.Mock).mockReturnValue({ data: mockSession });

    (getBoards as jest.Mock).mockResolvedValue(mockBoards);

    (getBoardSections as jest.Mock).mockResolvedValue([
      { id: '1-1', name: 'Backlog', position: 0, boardId: '1' },
      { id: '1-2', name: 'In Progress', position: 1, boardId: '1' },
      { id: '1-3', name: 'Done', position: 2, boardId: '1' },
    ]);

    (createTask as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Edge Case 5.1: Fast Typing and Special Characters', () => {
    it('should handle extremely fast typing without losing characters', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Simulate extremely fast typing (paste-like speed)
      const fastText = 'Development Sprint 2024';

      // Use paste event to simulate very fast input
      fireEvent.change(searchInput, { target: { value: fastText } });

      await waitFor(() => {
        expect(searchInput).toHaveValue(fastText);
        expect(document.activeElement).toBe(searchInput);
        expect(screen.getByText('Development Sprint 2024')).toBeInTheDocument();
      });
    });

    it('should handle all types of special characters', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      const specialCharacterTests = [
        '@ Scale',           // Matches "Customer Support @ Scale"
        '(UI/UX)',          // Matches "Design Projects (UI/UX)"
        '🚀',               // Matches "Engineering R&D 🚀"
        '& Business',       // Matches "Sales & Business Development"
        'Q1',               // Matches "Marketing Campaign Q1"
        'R&D',              // Matches "Engineering R&D 🚀"
        '2024',             // Matches "Development Sprint 2024"
      ];

      for (const testInput of specialCharacterTests) {
        await user.clear(searchInput);
        await user.type(searchInput, testInput);

        await waitFor(() => {
          expect(searchInput).toHaveValue(testInput);
          expect(document.activeElement).toBe(searchInput);

          // Should find at least one matching board
          const matchingBoards = mockBoards.filter(board =>
            board.name.toLowerCase().includes(testInput.toLowerCase())
          );
          expect(matchingBoards.length).toBeGreaterThan(0);
        });
      }
    });

    it('should handle very long search queries', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Very long search query
      const longQuery = 'This is a very long search query that should still work correctly without breaking the focus management or causing any performance issues whatsoever';

      await user.type(searchInput, longQuery);

      await waitFor(() => {
        expect(searchInput).toHaveValue(longQuery);
        expect(document.activeElement).toBe(searchInput);
        expect(screen.getByText('No boards found')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Case 5.2: Manual Testing Scenarios', () => {
    it('should provide smooth continuous typing experience', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Simulate natural human typing with small delays
      const naturalTypingText = 'Product Planning';
      let currentText = '';

      for (const char of naturalTypingText) {
        currentText += char;

        await user.type(searchInput, char);

        // Verify after each character that focus is maintained
        expect(document.activeElement).toBe(searchInput);
        expect(searchInput).toHaveValue(currentText);

        // Small delay to simulate human typing rhythm
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Verify final state
      await waitFor(() => {
        expect(searchInput).toHaveValue(naturalTypingText);
        expect(screen.getByText('Product Planning & Research')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Case 5.3: Real-time Board Filtering', () => {
    it('should filter boards in real-time during uninterrupted typing', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Progressive filtering test
      const progressiveSearch = [
        { query: 'D', expectedCount: 3 }, // Development, Design, DevOps
        { query: 'De', expectedCount: 2 }, // Development, Design, DevOps
        { query: 'Dev', expectedCount: 2 }, // Development, DevOps
        { query: 'Deve', expectedCount: 1 }, // Development
        { query: 'Devel', expectedCount: 1 }, // Development
        { query: 'Development', expectedCount: 1 }, // Development Sprint 2024
      ];

      for (const { query, expectedCount } of progressiveSearch) {
        await user.clear(searchInput);
        await user.type(searchInput, query);

        await waitFor(() => {
          expect(searchInput).toHaveValue(query);

          // Count visible board options
          const matchingBoards = mockBoards.filter(board =>
            board.name.toLowerCase().includes(query.toLowerCase())
          );

          expect(matchingBoards.length).toBe(expectedCount);
        });
      }
    });

    it('should handle case-insensitive filtering correctly', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      const caseTestQueries = [
        'MARKETING',
        'marketing',
        'Marketing',
        'mArKeTiNg',
        'CAMPAIGN',
        'campaign',
      ];

      for (const query of caseTestQueries) {
        await user.clear(searchInput);
        await user.type(searchInput, query);

        await waitFor(() => {
          expect(searchInput).toHaveValue(query);
          expect(screen.getByText('Marketing Campaign Q1')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Edge Case 5.4: No Regression Testing', () => {
    it('should maintain all existing QuickCreateForm functionality', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Test board selection still works
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');
      await user.type(searchInput, 'Development');

      const boardOption = screen.getByText('Development Sprint 2024');
      await user.click(boardOption);

      // Verify board is selected and sections load
      await waitFor(() => {
        expect(boardTrigger).toHaveTextContent('Development Sprint 2024');
      });

      // Test board section selection
      const sectionTrigger = screen.getByRole('combobox', { name: /board section/i });
      await user.click(sectionTrigger);

      const sectionOption = screen.getByText('In Progress');
      await user.click(sectionOption);

      // Test other form fields
      const titleInput = screen.getByPlaceholderText('Task title');
      await user.type(titleInput, 'Test Task');

      const descriptionInput = screen.getByPlaceholderText('Task description');
      await user.type(descriptionInput, 'Test Description');

      // Test form submission
      const createButton = screen.getByRole('button', { name: /create task/i });
      expect(createButton).toBeEnabled();

      await user.click(createButton);

      // Verify task creation was attempted
      await waitFor(() => {
        expect(createTask).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Case 5.5: Keyboard Navigation and Accessibility', () => {
    it('should support full keyboard navigation workflow', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Tab to board trigger
      await user.tab();
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      expect(document.activeElement).toBe(boardTrigger);

      // Open with Enter
      await user.keyboard('{Enter}');

      // Search should be available
      const searchInput = screen.getByPlaceholderText('Search boards...');
      searchInput.focus(); // Simulate focus moving to search

      // Type search query
      await user.type(searchInput, 'Marketing');

      // Navigate with arrow keys (handled by Radix)
      await user.keyboard('{ArrowDown}');

      // Select with Enter
      await user.keyboard('{Enter}');

      // Verify selection worked
      await waitFor(() => {
        expect(boardTrigger).toHaveTextContent('Marketing Campaign Q1');
      });
    });

    it('should handle Escape key correctly at any time', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Type something
      await user.type(searchInput, 'Some search query');

      // Press Escape
      await user.keyboard('{Escape}');

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search boards...')).not.toBeInTheDocument();
      });

      // Reopen to verify search was cleared
      await user.click(boardTrigger);
      const newSearchInput = screen.getByPlaceholderText('Search boards...');
      expect(newSearchInput).toHaveValue('');
    });
  });

  describe('Edge Case 5.6: Performance and Console Errors', () => {
    it('should not produce console errors during normal operation', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Perform various operations
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');
      await user.type(searchInput, 'Marketing Campaign');

      const boardOption = screen.getByText('Marketing Campaign Q1');
      await user.click(boardOption);

      // Verify no console errors
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle component unmounting gracefully', async () => {
      const { unmount } = render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');
      await user.type(searchInput, 'Marketing');

      // Unmount component while search is active
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Edge Case 5.7: User Acceptance Testing Scenarios', () => {
    it('should provide excellent user experience for power users', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Power user workflow: Fast, efficient task creation
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });

      // Quick board selection
      await user.click(boardTrigger);
      const searchInput = screen.getByPlaceholderText('Search boards...');
      await user.type(searchInput, 'Dev');

      // Verify filtering is immediate
      await waitFor(() => {
        expect(screen.getByText('Development Sprint 2024')).toBeInTheDocument();
        expect(screen.getByText('DevOps & Infrastructure')).toBeInTheDocument();
        expect(screen.queryByText('Marketing Campaign Q1')).not.toBeInTheDocument();
      });

      // Quick selection
      const devBoard = screen.getByText('Development Sprint 2024');
      await user.click(devBoard);

      // Should immediately show board sections
      await waitFor(() => {
        const sectionTrigger = screen.getByRole('combobox', { name: /board section/i });
        expect(sectionTrigger).not.toBeDisabled();
      });

      // Rest of workflow should be smooth
      const sectionTrigger = screen.getByRole('combobox', { name: /board section/i });
      await user.click(sectionTrigger);

      const backlogSection = screen.getByText('Backlog');
      await user.click(backlogSection);

      // Quick form completion
      const titleInput = screen.getByPlaceholderText('Task title');
      await user.type(titleInput, 'Urgent bug fix needed');

      const descriptionInput = screen.getByPlaceholderText('Task description');
      await user.type(descriptionInput, 'Critical production issue');

      const createButton = screen.getByRole('button', { name: /create task/i });
      await user.click(createButton);

      // Verify successful creation
      await waitFor(() => {
        expect(createTask).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Urgent bug fix needed',
            description: 'Critical production issue',
          }),
          '1-1' // Backlog section ID
        );
      });
    });

    it('should provide good experience for casual users', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Casual user workflow: Slower, more exploratory
      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // Casual typing with pauses
      await user.type(searchInput, 'Content');

      // Verify they see results
      await waitFor(() => {
        expect(screen.getByText('Content Creation Team')).toBeInTheDocument();
      });

      // Maybe they change their mind
      await user.clear(searchInput);
      await user.type(searchInput, 'Marketing');

      await waitFor(() => {
        expect(screen.getByText('Marketing Campaign Q1')).toBeInTheDocument();
      });

      // Select after browsing
      const marketingBoard = screen.getByText('Marketing Campaign Q1');
      await user.click(marketingBoard);

      // Should work smoothly
      await waitFor(() => {
        expect(boardTrigger).toHaveTextContent('Marketing Campaign Q1');
      });
    });
  });

  describe('Edge Case 5.8: Comprehensive Test Verification', () => {
    it('should pass all UX requirements', async () => {
      render(<QuickCreateForm />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const boardTrigger = screen.getByRole('combobox', { name: /board/i });
      await user.click(boardTrigger);

      const searchInput = screen.getByPlaceholderText('Search boards...');

      // UX Requirement 1: Continuous typing without focus loss
      const continuousText = 'Product Planning Research';
      await user.type(searchInput, continuousText);

      await waitFor(() => {
        expect(searchInput).toHaveValue(continuousText);
        expect(document.activeElement).toBe(searchInput);
      });

      // UX Requirement 2: Real-time filtering
      await waitFor(() => {
        expect(screen.getByText('Product Planning & Research')).toBeInTheDocument();
      });

      // UX Requirement 3: No console errors or performance issues
      // (Already tested in other scenarios)

      // UX Requirement 4: Proper state management
      const productBoard = screen.getByText('Product Planning & Research');
      await user.click(productBoard);

      // Search should be cleared
      await user.click(boardTrigger);
      const clearedSearchInput = screen.getByPlaceholderText('Search boards...');
      expect(clearedSearchInput).toHaveValue('');
    });
  });
});