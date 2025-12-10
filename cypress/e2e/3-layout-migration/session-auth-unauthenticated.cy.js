/**
 * Session & Authentication Testing - Unauthenticated Access
 * Task Group 4.3.1
 *
 * Tests for unauthenticated user access behavior:
 * - Redirect to sign-in page
 * - No sidebar rendering
 * - No layout components in DOM
 */

describe('Session & Auth: Unauthenticated Access (4.3.1)', () => {
  beforeEach(() => {
    // Clear all cookies and session data before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should redirect unauthenticated user to sign-in page', () => {
    // Attempt to access protected route without authentication
    cy.visit('/crm/dashboard');

    // Should redirect to sign-in page
    cy.url().should('include', '/sign-in');

    // Should see sign-in page elements
    cy.get('[data-testid="sign-in-form"]').should('exist');
  });

  it('should not render sidebar for unauthenticated user', () => {
    // Visit sign-in page directly (no auth)
    cy.visit('/sign-in');

    // Sidebar should not exist in DOM
    cy.get('[data-testid="app-sidebar"]').should('not.exist');

    // App layout components should not exist
    cy.get('[data-testid="sidebar-provider"]').should('not.exist');
    cy.get('[data-testid="app-header"]').should('not.exist');
  });

  it('should redirect from any protected route to sign-in', () => {
    const protectedRoutes = [
      '/crm/dashboard',
      '/crm/accounts',
      '/projects',
      '/admin',
      '/documents'
    ];

    protectedRoutes.forEach(route => {
      cy.clearCookies();
      cy.visit(route);

      // Each route should redirect to sign-in
      cy.url().should('include', '/sign-in');
    });
  });

  it('should not make authenticated API calls without session', () => {
    // Intercept API calls
    cy.intercept('/api/**').as('apiCalls');

    // Attempt to visit protected route
    cy.visit('/crm/dashboard');

    // Should redirect before making module/user API calls
    cy.url().should('include', '/sign-in');

    // Wait briefly to check no authenticated API calls made
    cy.wait(500);

    // Verify no module fetch API calls
    cy.get('@apiCalls.all').then((calls) => {
      const moduleCall = calls.find(call =>
        call.request.url.includes('/api/modules') ||
        call.request.url.includes('/api/user')
      );
      expect(moduleCall).to.be.undefined;
    });
  });

  it('should handle expired session cookie gracefully', () => {
    // Set an expired/invalid session cookie
    cy.setCookie('next-auth.session-token', 'invalid-expired-token');

    // Attempt to access protected route
    cy.visit('/crm/dashboard');

    // Should redirect to sign-in (expired session treated as no session)
    cy.url().should('include', '/sign-in');

    // Sidebar should not render
    cy.get('[data-testid="app-sidebar"]').should('not.exist');
  });

  it('should prevent direct access to layout routes without auth', () => {
    // Directly visit layout root
    cy.visit('/');

    // Should redirect to sign-in
    cy.url().should('include', '/sign-in');

    // No layout components should render
    cy.get('[data-testid="sidebar-provider"]').should('not.exist');
  });
});
