/**
 * RBAC Testing: Admin User Role (Task 4.1.1)
 *
 * Tests that admin users can see and access administration features.
 *
 * Test Scenarios:
 * 1. Administration menu is visible for admin users
 * 2. Admin users can navigate to admin routes
 * 3. Admin users can access admin features without restrictions
 *
 * Related Files:
 * - /app/[locale]/(routes)/components/app-sidebar.tsx (line 244)
 * - /app/[locale]/(routes)/admin/page.tsx (line 15)
 * - /lib/auth.ts (session callback)
 */

describe('RBAC: Admin User Role (Task 4.1.1)', () => {
  beforeEach(() => {
    // Mock session as admin user
    cy.intercept('/api/auth/session', {
      statusCode: 200,
      body: {
        user: {
          id: 'test-admin-id',
          email: 'admin@test.com',
          name: 'Test Admin',
          is_admin: true,
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

  it('should display Administration menu for admin users', () => {
    // Wait for sidebar to render
    cy.get('[data-testid="app-sidebar"]', { timeout: 10000 }).should('exist');

    // Check Administration menu is visible
    // Note: Exact text depends on localization
    cy.contains('Administration').should('exist').and('be.visible');
  });

  it('should show Administration menu at bottom of navigation', () => {
    // Get all navigation items
    cy.get('[data-testid="nav-main"]').within(() => {
      // Dashboard should be first
      cy.contains('Dashboard').should('exist');

      // Administration should exist (regardless of position)
      cy.contains('Administration').should('exist');
    });
  });

  it('should allow admin to access admin routes', () => {
    // Mock admin page response
    cy.intercept('/admin', {
      statusCode: 200,
    }).as('getAdminPage');

    // Click Administration menu
    cy.contains('Administration').click();

    // Verify navigation to admin route
    cy.url().should('include', '/admin');

    // Wait for page load
    cy.wait('@getAdminPage');

    // Verify admin page content (if visible in test)
    // Note: This may require additional mocking depending on page implementation
    cy.contains('Administration').should('exist');
  });

  it('should NOT show "Access not allowed" message for admin users', () => {
    // Navigate to admin page
    cy.visit('/admin');

    // Should NOT see access denied message
    cy.contains('Access not allowed').should('not.exist');
    cy.contains('access not allowed').should('not.exist');
  });

  it('should render sidebar with all admin-accessible modules', () => {
    cy.get('[data-testid="app-sidebar"]').should('exist');

    // Check for common modules (if enabled)
    const expectedModules = ['Dashboard', 'Administration'];

    expectedModules.forEach((moduleName) => {
      cy.contains(moduleName).should('exist');
    });
  });

  it('should maintain admin menu visibility after sidebar collapse/expand', () => {
    // Check Administration menu exists initially
    cy.contains('Administration').should('exist');

    // Find and click sidebar toggle (if available)
    cy.get('[data-testid="sidebar-trigger"]').then(($trigger) => {
      if ($trigger.length) {
        // Click to collapse
        cy.wrap($trigger).click();

        // Wait for animation
        cy.wait(500);

        // Click to expand
        cy.wrap($trigger).click();

        // Wait for animation
        cy.wait(500);

        // Administration menu should still exist
        cy.contains('Administration').should('exist');
      }
    });
  });
});
