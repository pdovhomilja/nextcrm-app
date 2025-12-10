/**
 * Session & Authentication Testing - ACTIVE User Status
 * Task Group 4.3.4
 *
 * Tests for ACTIVE user status behavior:
 * - Full layout renders
 * - Sidebar visible with navigation
 * - User data in nav-user
 * - Module filtering works
 */

describe('Session & Auth: ACTIVE User Status (4.3.4)', () => {
  beforeEach(() => {
    // Clear session before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  /**
   * Helper: Login as ACTIVE user
   * Note: Requires test user with userStatus: "ACTIVE" in database
   */
  const loginAsActiveUser = () => {
    cy.visit('/sign-in');

    // Use credentials for ACTIVE test user
    // Update these credentials based on your test database
    cy.get('[data-testid="email-input"]').type('test-active@example.com');
    cy.get('[data-testid="password-input"]').type('testPassword123');
    cy.get('[data-testid="sign-in-button"]').click();
  };

  it('should render full layout for ACTIVE user', () => {
    loginAsActiveUser();

    // Should NOT redirect to pending/inactive
    cy.url().should('not.include', '/pending');
    cy.url().should('not.include', '/inactive');

    // Should render layout components
    cy.get('[data-testid="sidebar-provider"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="app-sidebar"]').should('exist');
    cy.get('[data-testid="app-header"]').should('exist');
  });

  it('should display sidebar with navigation for ACTIVE user', () => {
    loginAsActiveUser();

    // Sidebar should be visible
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('be.visible');

    // Sidebar should have navigation items
    cy.get('[data-testid="nav-main"]').should('exist');

    // Should have at least Dashboard navigation
    cy.get('[data-testid="nav-item-dashboard"]').should('exist');
  });

  it('should display user info in nav-user section', () => {
    loginAsActiveUser();

    // Wait for sidebar to render
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Nav-user section should exist
    cy.get('[data-testid="nav-user"]').should('exist');

    // User avatar should be visible
    cy.get('[data-testid="user-avatar"]').should('exist');

    // When sidebar expanded, user name should be visible
    // Note: May need to expand sidebar first if collapsed
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      if ($sidebar.attr('data-state') !== 'expanded') {
        // Click to expand sidebar if collapsed
        cy.get('[data-testid="sidebar-trigger"]').click();
      }
    });

    cy.get('[data-testid="user-name"]').should('be.visible');
    cy.get('[data-testid="user-email"]').should('be.visible');
  });

  it('should display build version in sidebar footer when expanded', () => {
    loginAsActiveUser();

    // Wait for sidebar
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Ensure sidebar is expanded
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      if ($sidebar.attr('data-state') !== 'expanded') {
        cy.get('[data-testid="sidebar-trigger"]').click();
      }
    });

    // Build version should be visible
    cy.get('[data-testid="build-version"]').should('be.visible');
    cy.get('[data-testid="build-version"]').should('contain', 'build:');
  });

  it('should allow ACTIVE user to navigate to different routes', () => {
    loginAsActiveUser();

    // Wait for layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Navigate to different routes
    const routes = [
      { route: '/crm/dashboard', navItem: 'nav-item-crm' },
      { route: '/projects', navItem: 'nav-item-projects' }
    ];

    routes.forEach(({ route, navItem }) => {
      // Click navigation item
      cy.get(`[data-testid="${navItem}"]`).click();

      // Should navigate to route
      cy.url().should('include', route);

      // Layout should remain visible
      cy.get('[data-testid="app-sidebar"]').should('exist');
    });
  });

  it('should show user dropdown actions in nav-user', () => {
    loginAsActiveUser();

    // Wait for sidebar
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Click on user profile to open dropdown
    cy.get('[data-testid="nav-user"]').click();

    // Dropdown should open with actions
    cy.get('[data-testid="user-dropdown"]').should('be.visible');

    // Should have profile action
    cy.get('[data-testid="user-action-profile"]').should('exist');

    // Should have settings action
    cy.get('[data-testid="user-action-settings"]').should('exist');

    // Should have logout action
    cy.get('[data-testid="user-action-logout"]').should('exist');
  });

  it('should display enabled modules in navigation', () => {
    loginAsActiveUser();

    // Wait for sidebar
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Dashboard should always be visible (not module-filtered)
    cy.get('[data-testid="nav-item-dashboard"]').should('exist');

    // At least one enabled module should be visible
    // This test assumes CRM module is enabled
    cy.get('[data-testid="nav-item-crm"]').should('exist');
  });

  it('should render header with utilities for ACTIVE user', () => {
    loginAsActiveUser();

    // Wait for header
    cy.get('[data-testid="app-header"]', { timeout: 10000 }).should('exist');

    // Header should have sidebar trigger (mobile)
    cy.get('[data-testid="sidebar-trigger"]').should('exist');

    // Header should have theme toggle
    cy.get('[data-testid="theme-toggle"]').should('exist');

    // Header should have search (if implemented)
    // cy.get('[data-testid="fulltext-search"]').should('exist');
  });

  it('should render footer in content area for ACTIVE user', () => {
    loginAsActiveUser();

    // Wait for layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Scroll to bottom of page
    cy.scrollTo('bottom');

    // Footer should exist
    cy.get('[data-testid="app-footer"]').should('exist');
  });

  it('should maintain layout across page navigation', () => {
    loginAsActiveUser();

    // Wait for initial layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Navigate to different page
    cy.visit('/crm/accounts');

    // Layout should still be visible
    cy.get('[data-testid="app-sidebar"]').should('exist');
    cy.get('[data-testid="app-header"]').should('exist');

    // Navigate to another page
    cy.visit('/projects');

    // Layout should still be visible
    cy.get('[data-testid="app-sidebar"]').should('exist');
    cy.get('[data-testid="app-header"]').should('exist');
  });

  it('should support sidebar collapse and expand for ACTIVE user', () => {
    loginAsActiveUser();

    // Wait for sidebar
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Get initial state
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      const initialState = $sidebar.attr('data-state');

      // Toggle sidebar
      cy.get('[data-testid="sidebar-toggle"]').click();

      // State should change
      cy.get('[data-testid="app-sidebar"]').should($newSidebar => {
        const newState = $newSidebar.attr('data-state');
        expect(newState).to.not.equal(initialState);
      });
    });
  });
});

/**
 * NOTE FOR TEST EXECUTION:
 *
 * These tests require a test user with the following properties:
 * - email: test-active@example.com
 * - password: testPassword123 (hashed)
 * - userStatus: "ACTIVE"
 * - is_admin: false (or true for admin tests)
 *
 * Ensure at least one module is enabled (e.g., CRM module) for navigation tests.
 *
 * Create this user via Prisma Studio:
 * 1. Run: pnpm prisma studio
 * 2. Navigate to Users table
 * 3. Create new user with above properties
 * 4. Set password hash (or use your auth system to set password)
 */
