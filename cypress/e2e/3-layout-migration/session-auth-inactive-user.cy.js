/**
 * Session & Authentication Testing - INACTIVE User Status
 * Task Group 4.3.3
 *
 * Tests for INACTIVE user status behavior:
 * - Redirect to inactive page
 * - No layout rendering
 * - Cannot access protected routes
 */

describe('Session & Auth: INACTIVE User Status (4.3.3)', () => {
  beforeEach(() => {
    // Clear session before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  /**
   * Helper: Login as INACTIVE user
   * Note: Requires test user with userStatus: "INACTIVE" in database
   */
  const loginAsInactiveUser = () => {
    cy.visit('/sign-in');

    // Use credentials for INACTIVE test user
    // Update these credentials based on your test database
    cy.get('[data-testid="email-input"]').type('test-inactive@example.com');
    cy.get('[data-testid="password-input"]').type('testPassword123');
    cy.get('[data-testid="sign-in-button"]').click();
  };

  it('should redirect INACTIVE user to inactive page after login', () => {
    loginAsInactiveUser();

    // Should redirect to inactive page
    cy.url().should('include', '/inactive');

    // Should see inactive status message
    cy.contains(/inactive/i).should('exist');
    cy.contains(/deactivated|disabled/i).should('exist');
  });

  it('should not render layout for INACTIVE user', () => {
    loginAsInactiveUser();

    // Should be on inactive page
    cy.url().should('include', '/inactive');

    // Sidebar should not exist
    cy.get('[data-testid="app-sidebar"]').should('not.exist');

    // Header should not exist (layout header)
    cy.get('[data-testid="app-header"]').should('not.exist');

    // Footer should not exist (layout footer)
    cy.get('[data-testid="app-footer"]').should('not.exist');
  });

  it('should prevent INACTIVE user from accessing protected routes directly', () => {
    loginAsInactiveUser();

    // Wait for redirect to inactive
    cy.url().should('include', '/inactive');

    // Attempt to navigate directly to protected route
    cy.visit('/crm/accounts');

    // Should redirect back to inactive
    cy.url().should('include', '/inactive');
  });

  it('should prevent INACTIVE user from accessing multiple protected routes', () => {
    loginAsInactiveUser();

    const protectedRoutes = [
      '/crm/dashboard',
      '/projects',
      '/documents',
      '/reports',
      '/invoice'
    ];

    protectedRoutes.forEach(route => {
      cy.visit(route);

      // Should always redirect to inactive
      cy.url().should('include', '/inactive');

      // Layout should not render
      cy.get('[data-testid="app-sidebar"]').should('not.exist');
    });
  });

  it('should show appropriate inactive status message', () => {
    loginAsInactiveUser();

    cy.url().should('include', '/inactive');

    // Check for inactive status elements
    cy.get('[data-testid="inactive-status-page"]').should('exist');

    // Should have descriptive message
    cy.contains(/account.*deactivated|disabled/i).should('exist');
  });

  it('should maintain INACTIVE status across page refreshes', () => {
    loginAsInactiveUser();

    cy.url().should('include', '/inactive');

    // Refresh the page
    cy.reload();

    // Should still be on inactive page
    cy.url().should('include', '/inactive');

    // Attempt to navigate away
    cy.visit('/crm/opportunities');

    // Should redirect back to inactive
    cy.url().should('include', '/inactive');
  });

  it('should not allow INACTIVE user to access admin routes', () => {
    loginAsInactiveUser();

    // Attempt to access admin route
    cy.visit('/admin');

    // Should redirect to inactive (not to admin or 403 page)
    cy.url().should('include', '/inactive');

    // Admin panel should not render
    cy.contains(/administration/i).should('not.exist');
  });

  it('should have valid session but restricted access for INACTIVE user', () => {
    loginAsInactiveUser();

    // User has valid session (authenticated)
    // But is restricted to inactive page only

    cy.url().should('include', '/inactive');

    // Session exists (can verify via cookie if needed)
    cy.getCookie('next-auth.session-token').should('exist');

    // But layout does not render
    cy.get('[data-testid="app-sidebar"]').should('not.exist');
  });

  it('should block INACTIVE user from all module routes', () => {
    loginAsInactiveUser();

    // Test various module routes
    const moduleRoutes = [
      '/crm/contacts',
      '/crm/leads',
      '/projects/boards/123',
      '/emails',
      '/employees',
      '/databox'
    ];

    moduleRoutes.forEach(route => {
      cy.visit(route);

      // Should redirect to inactive
      cy.url().should('include', '/inactive');
    });
  });
});

/**
 * NOTE FOR TEST EXECUTION:
 *
 * These tests require a test user with the following properties:
 * - email: test-inactive@example.com
 * - password: testPassword123 (hashed)
 * - userStatus: "INACTIVE"
 *
 * Create this user in your test database before running tests.
 *
 * You can create this user via Prisma Studio:
 * 1. Run: pnpm prisma studio
 * 2. Navigate to Users table
 * 3. Create new user with above properties
 * 4. Set password hash (or use your auth system to set password)
 */
