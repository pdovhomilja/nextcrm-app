/**
 * Session & Authentication Testing - Session Data Propagation
 * Task Group 4.3.5
 *
 * Tests for session data propagation:
 * - User data available in nav-user
 * - Session data throughout layout
 * - Session refresh scenarios
 */

describe('Session & Auth: Data Propagation (4.3.5)', () => {
  beforeEach(() => {
    // Clear session before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  /**
   * Helper: Login as ACTIVE user
   */
  const loginAsActiveUser = () => {
    cy.visit('/sign-in');
    cy.get('[data-testid="email-input"]').type('test-active@example.com');
    cy.get('[data-testid="password-input"]').type('testPassword123');
    cy.get('[data-testid="sign-in-button"]').click();
  };

  it('should propagate user data to nav-user component', () => {
    loginAsActiveUser();

    // Wait for layout and nav-user
    cy.get('[data-testid="nav-user"]', { timeout: 10000 }).should('exist');

    // Expand sidebar if collapsed
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      if ($sidebar.attr('data-state') !== 'expanded') {
        cy.get('[data-testid="sidebar-trigger"]').click();
      }
    });

    // Verify user data displays
    cy.get('[data-testid="user-name"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('not.be.empty');

    cy.get('[data-testid="user-email"]').should('be.visible');
    cy.get('[data-testid="user-email"]').should('contain', '@');

    cy.get('[data-testid="user-avatar"]').should('exist');
  });

  it('should have session data available throughout layout', () => {
    loginAsActiveUser();

    // Wait for layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Session data should be used for:

    // 1. Module filtering (sidebar shows only enabled modules)
    cy.get('[data-testid="nav-main"]').should('exist');
    cy.get('[data-testid="nav-item-dashboard"]').should('exist');

    // 2. User language (affects UI translations)
    // Verify some translated text exists (implementation-specific)
    cy.get('[data-testid="app-sidebar"]').should('contain', /.+/);

    // 3. Role-based visibility (admin menu visibility)
    // This will vary based on test user role
    // If test user is not admin, Administration should not appear
    // We'll test this in a separate test
  });

  it('should use user language preference for UI', () => {
    loginAsActiveUser();

    // Wait for layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Header should have language selector
    cy.get('[data-testid="set-language"]').should('exist');

    // UI should display in user's language
    // (This test is basic - full i18n testing would be more comprehensive)
    cy.get('[data-testid="nav-item-dashboard"]').should('exist');
  });

  it('should pass session data to header components', () => {
    loginAsActiveUser();

    // Wait for header
    cy.get('[data-testid="app-header"]', { timeout: 10000 }).should('exist');

    // Header receives user id and language from session
    // Verify header renders with user-specific data

    // SetLanguage component should be present (uses session.user.userLanguage)
    cy.get('[data-testid="set-language"]').should('exist');

    // Theme toggle should respect user preferences
    cy.get('[data-testid="theme-toggle"]').should('exist');
  });

  it('should refresh session data on navigation', () => {
    loginAsActiveUser();

    // Wait for initial page load
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Get initial user name
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      if ($sidebar.attr('data-state') !== 'expanded') {
        cy.get('[data-testid="sidebar-trigger"]').click();
      }
    });

    cy.get('[data-testid="user-name"]').should('be.visible');

    // Navigate to different route
    cy.visit('/crm/dashboard');

    // Session data should still be available
    cy.get('[data-testid="nav-user"]').should('exist');
    cy.get('[data-testid="user-name"]').should('be.visible');

    // Navigate to another route
    cy.visit('/projects');

    // Session data should still be available
    cy.get('[data-testid="nav-user"]').should('exist');
    cy.get('[data-testid="user-name"]').should('be.visible');
  });

  it('should maintain session across page refresh', () => {
    loginAsActiveUser();

    // Wait for layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Expand sidebar to see user info
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      if ($sidebar.attr('data-state') !== 'expanded') {
        cy.get('[data-testid="sidebar-trigger"]').click();
      }
    });

    // Get user name before refresh
    let userName;
    cy.get('[data-testid="user-name"]').then($name => {
      userName = $name.text();
    });

    // Refresh page
    cy.reload();

    // Wait for layout to render again
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Expand sidebar again if needed
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      if ($sidebar.attr('data-state') !== 'expanded') {
        cy.get('[data-testid="sidebar-trigger"]').click();
      }
    });

    // User name should be the same
    cy.get('[data-testid="user-name"]').should('be.visible');
    cy.get('[data-testid="user-name"]').then($name => {
      expect($name.text()).to.equal(userName);
    });
  });

  it('should propagate role data for admin visibility', () => {
    // This test requires an admin user
    // Skip if test user is not admin

    cy.visit('/sign-in');
    cy.get('[data-testid="email-input"]').type('test-admin@example.com');
    cy.get('[data-testid="password-input"]').type('testPassword123');
    cy.get('[data-testid="sign-in-button"]').click();

    // Wait for layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // For admin user, Administration menu should be visible
    cy.get('[data-testid="nav-item-administration"]').should('exist');

    // Verify admin can access admin route
    cy.visit('/admin');
    cy.url().should('include', '/admin');

    // Should not redirect to /inactive or /pending
    cy.url().should('not.include', '/pending');
    cy.url().should('not.include', '/inactive');
  });

  it('should use session data for module filtering', () => {
    loginAsActiveUser();

    // Wait for layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Modules are fetched server-side and filtered
    // Only enabled modules should appear in navigation

    // Dashboard is always visible (no module filtering)
    cy.get('[data-testid="nav-item-dashboard"]').should('exist');

    // Check if at least one module is visible
    // (This assumes at least one module is enabled in the database)
    cy.get('[data-testid="nav-main"]').children().should('have.length.greaterThan', 1);
  });

  it('should propagate build version to sidebar footer', () => {
    loginAsActiveUser();

    // Wait for sidebar
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Expand sidebar to see build version
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      if ($sidebar.attr('data-state') !== 'expanded') {
        cy.get('[data-testid="sidebar-trigger"]').click();
      }
    });

    // Build version should be visible
    cy.get('[data-testid="build-version"]').should('be.visible');
    cy.get('[data-testid="build-version"]').should('match', /build:.*\d+/);
  });

  it('should have consistent session data across multiple tabs', () => {
    loginAsActiveUser();

    // Wait for layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Get user info from first tab
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      if ($sidebar.attr('data-state') !== 'expanded') {
        cy.get('[data-testid="sidebar-trigger"]').click();
      }
    });

    let userEmail;
    cy.get('[data-testid="user-email"]').then($email => {
      userEmail = $email.text();
    });

    // Navigate to different route (simulating new tab)
    cy.visit('/crm/accounts');

    // Wait for layout
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Expand sidebar
    cy.get('[data-testid="app-sidebar"]').then($sidebar => {
      if ($sidebar.attr('data-state') !== 'expanded') {
        cy.get('[data-testid="sidebar-trigger"]').click();
      }
    });

    // User email should be the same
    cy.get('[data-testid="user-email"]').should('be.visible');
    cy.get('[data-testid="user-email"]').then($email => {
      expect($email.text()).to.equal(userEmail);
    });
  });
});

/**
 * NOTE FOR TEST EXECUTION:
 *
 * These tests require test users with the following properties:
 *
 * 1. Regular Active User:
 *    - email: test-active@example.com
 *    - password: testPassword123
 *    - userStatus: "ACTIVE"
 *    - is_admin: false
 *
 * 2. Admin User:
 *    - email: test-admin@example.com
 *    - password: testPassword123
 *    - userStatus: "ACTIVE"
 *    - is_admin: true
 *
 * Create these users in your test database via Prisma Studio.
 */
