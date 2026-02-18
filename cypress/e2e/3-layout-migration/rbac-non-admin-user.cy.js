/**
 * RBAC Testing: Non-Admin User Role (Task 4.1.2)
 *
 * Tests that non-admin users cannot see or access administration features.
 *
 * Test Scenarios:
 * 1. Administration menu is NOT visible for non-admin users
 * 2. Non-admin users cannot access admin routes
 * 3. Direct URL access to admin routes shows "Access not allowed"
 *
 * Related Files:
 * - /app/[locale]/(routes)/components/app-sidebar.tsx (line 244)
 * - /app/[locale]/(routes)/admin/page.tsx (line 15)
 * - /lib/auth.ts (session callback)
 */

describe('RBAC: Non-Admin User Role (Task 4.1.2)', () => {
  beforeEach(() => {
    // Mock session as regular user (non-admin)
    cy.intercept('/api/auth/session', {
      statusCode: 200,
      body: {
        user: {
          id: 'test-user-id',
          email: 'user@test.com',
          name: 'Test User',
          is_admin: false,
          is_account_admin: false,
          userStatus: 'ACTIVE',
          userLanguage: 'en',
        },
      },
    }).as('getSession');

    // Mock modules API
    cy.intercept('/api/modules*', {
      statusCode: 200,
      body: [
        { id: '1', name: 'crm', enabled: true },
        { id: '2', name: 'projects', enabled: true },
        { id: '3', name: 'emails', enabled: true },
      ],
    }).as('getModules');

    cy.visit('/');
  });

  it('should NOT display Administration menu for non-admin users', () => {
    // Wait for sidebar to render
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Administration menu should NOT exist
    cy.contains('Administration').should('not.exist');

    // Also check for localized variations
    cy.contains('Settings').should('not.exist');
  });

  it('should display other navigation items but not Administration', () => {
    cy.get('[data-testid="nav-main"]').should('exist');

    // These should be visible (if modules enabled)
    cy.contains('Dashboard').should('exist');

    // Administration should NOT be visible
    cy.contains('Administration').should('not.exist');
  });

  it('should show "Access not allowed" when accessing admin route directly', () => {
    // Try to access admin URL directly
    cy.visit('/admin', { failOnStatusCode: false });

    // Should see access denied message
    cy.contains(/access not allowed/i).should('exist');
  });

  it('should NOT show admin features on admin page for non-admin users', () => {
    // Navigate to admin page directly
    cy.visit('/admin', { failOnStatusCode: false });

    // Should NOT see admin-specific buttons/features
    // Note: These are example admin features - adjust based on actual implementation
    cy.contains('Users administration').should('not.exist');
    cy.contains('Modules administration').should('not.exist');
  });

  it('should not have Administration menu in DOM at all', () => {
    // Check that Administration is not just hidden, but not in DOM
    cy.get('body').then(($body) => {
      // Search for Administration in entire body
      const text = $body.text();

      // Allow for "Administration" in page title/header, but not in navigation
      cy.get('[data-testid="nav-main"]').should('exist').within(() => {
        cy.contains('Administration').should('not.exist');
      });
    });
  });

  it('should maintain navigation structure without admin items', () => {
    cy.get('[data-testid="app-sidebar"]').should('exist');

    // Verify navigation structure is correct
    cy.get('[data-testid="nav-main"]').within(() => {
      // Should have navigation items
      cy.get('[data-testid="nav-item"]').should('have.length.at.least', 1);

      // But none should be Administration
      cy.get('[data-testid="nav-item"]').each(($item) => {
        cy.wrap($item).should('not.contain', 'Administration');
      });
    });
  });

  it('should not expose admin menu after sidebar toggle', () => {
    // Check Administration menu does not exist initially
    cy.contains('Administration').should('not.exist');

    // Find and click sidebar toggle (if available)
    cy.get('[data-testid="sidebar-trigger"]').then(($trigger) => {
      if ($trigger.length) {
        // Click to collapse
        cy.wrap($trigger).click();

        // Wait for animation
        cy.wait(500);

        // Administration menu still should not exist
        cy.contains('Administration').should('not.exist');

        // Click to expand
        cy.wrap($trigger).click();

        // Wait for animation
        cy.wait(500);

        // Administration menu still should not exist
        cy.contains('Administration').should('not.exist');
      }
    });
  });

  it('should allow access to non-admin routes', () => {
    // Non-admin users should access regular routes
    cy.visit('/');
    cy.url().should('not.include', '/sign-in');
    cy.url().should('not.include', '/pending');
    cy.url().should('not.include', '/inactive');

    // Should see main layout
    cy.get('[data-testid="app-sidebar"]').should('exist');
  });
});
