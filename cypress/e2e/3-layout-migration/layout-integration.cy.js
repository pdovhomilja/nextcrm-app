/**
 * Task Group 1.3.1: Layout Integration Tests
 *
 * Focused tests for main layout integration with sidebar.
 * Tests critical behaviors:
 * - SidebarProvider wraps layout
 * - Session redirects work
 * - Sidebar renders in layout
 */

describe('Layout Integration with Sidebar', () => {
  // Test 1: Unauthenticated users redirect to sign-in
  it('redirects unauthenticated users to sign-in page', () => {
    // Clear any existing session
    cy.clearCookies()
    cy.clearLocalStorage()

    // Attempt to access protected route
    cy.visit('/dashboard')

    // Should redirect to sign-in
    cy.url().should('include', '/sign-in')
  })

  // Test 2: Authenticated user sees sidebar and layout
  it('renders sidebar and main layout for authenticated users', () => {
    // Mock authentication (adjust based on your auth setup)
    // This is a placeholder - you may need to adjust based on actual auth flow
    cy.login() // Assuming you have a custom cy.login() command

    cy.visit('/dashboard')

    // Verify sidebar is present (using data attributes from shadcn sidebar)
    cy.get('[data-sidebar="sidebar"]').should('exist')

    // Verify main content area is present (SidebarInset)
    cy.get('main').should('exist')

    // Verify header is present inside main content
    cy.get('main header').should('exist')
  })

  // Test 3: Sidebar displays logo and branding
  it('displays logo and N branding symbol in sidebar', () => {
    cy.login()
    cy.visit('/dashboard')

    // Check for "N" branding symbol
    cy.get('[data-sidebar="sidebar"]').within(() => {
      cy.contains('N').should('exist')
    })
  })

  // Test 4: Build version displays in sidebar footer
  it('displays build version in sidebar footer when expanded', () => {
    cy.login()
    cy.visit('/dashboard')

    // Check for build version text (format: "build: 0.0.3-beta-{number}")
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.contains(/build: 0\.0\.3-beta-\d+/).should('exist')
    })
  })

  // Test 5: Mobile responsive behavior - sidebar trigger exists
  it('shows sidebar trigger button on mobile viewport', () => {
    cy.login()

    // Set mobile viewport
    cy.viewport('iphone-x')
    cy.visit('/dashboard')

    // Sidebar trigger should be visible on mobile
    cy.get('[data-sidebar="trigger"]').should('exist')
  })

  // Test 6: Desktop sidebar is expanded by default
  it('renders sidebar expanded on desktop viewport', () => {
    cy.login()

    // Set desktop viewport
    cy.viewport(1280, 720)
    cy.visit('/dashboard')

    // Sidebar should be in expanded state
    cy.get('[data-state="expanded"]').should('exist')
  })

  // Test 7: Session status redirects - PENDING users
  it('redirects PENDING users to pending page', () => {
    // Mock a PENDING user session
    cy.loginAsPending() // Assuming custom command for PENDING user

    cy.visit('/dashboard')

    // Should redirect to pending page
    cy.url().should('include', '/pending')
  })

  // Test 8: Session status redirects - INACTIVE users
  it('redirects INACTIVE users to inactive page', () => {
    // Mock an INACTIVE user session
    cy.loginAsInactive() // Assuming custom command for INACTIVE user

    cy.visit('/dashboard')

    // Should redirect to inactive page
    cy.url().should('include', '/inactive')
  })
})
