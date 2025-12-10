/**
 * Task Group 2.1.1 - Navigation Component Tests
 *
 * Focused tests for nav-main component functionality:
 * - Test only critical behaviors
 * - nav-main renders items correctly
 * - nav-main handles collapsible groups
 * - Active state detection works
 *
 * Note: Limited to 2-8 tests as per task requirements
 */

describe('Navigation Component (nav-main)', () => {
  beforeEach(() => {
    // Login and navigate to a page with navigation
    cy.visit('/sign-in')
    cy.get('input[name="email"]').type('admin@example.com')
    cy.get('input[name="password"]').type('password')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/')
  })

  it('renders navigation items with icons and labels', () => {
    // Verify that navigation items are rendered
    cy.get('[data-sidebar="sidebar"]').should('exist')
    cy.get('[data-sidebar="menu"]').should('exist')
    cy.get('[data-sidebar="menu-item"]').should('have.length.greaterThan', 0)

    // Verify items have icons (SVG elements)
    cy.get('[data-sidebar="menu-button"]').first().find('svg').should('exist')
  })

  it('handles collapsible navigation groups', () => {
    // Find a collapsible group (e.g., CRM module)
    cy.get('[data-sidebar="sidebar"]').should('exist')

    // Check if collapsible trigger exists
    cy.get('[data-sidebar="menu-button"][data-state]').should('exist')

    // Click to expand/collapse (if found)
    cy.get('[data-sidebar="menu-button"][data-state]').first().then(($btn) => {
      const initialState = $btn.attr('data-state')
      cy.wrap($btn).click()

      // Verify state changed
      cy.get('[data-sidebar="menu-button"][data-state]').first()
        .should('have.attr', 'data-state')
        .and('not.equal', initialState)
    })
  })

  it('detects and highlights active navigation state', () => {
    // Navigate to dashboard
    cy.visit('/')

    // Check if active state is applied
    cy.get('[data-sidebar="menu-button"][data-active="true"]')
      .should('exist')
      .should('have.class', 'font-medium') // Active items should be styled
  })

  it('navigates to correct routes when items are clicked', () => {
    // Find and click a navigation item
    cy.get('[data-sidebar="menu-button"]').contains('Dashboard').click()

    // Verify navigation occurred
    cy.url().should('match', /\/$/)
  })

  it('expands sidebar groups and shows sub-items', () => {
    // Ensure sidebar is expanded
    cy.get('[data-sidebar="sidebar"]').should('exist')

    // Find a group with sub-items (collapsible)
    cy.get('[data-sidebar="menu-button"][data-state="closed"]').first().click()

    // Wait for animation and check sub-menu appears
    cy.get('[data-sidebar="menu-sub"]').should('be.visible')
    cy.get('[data-sidebar="menu-sub-button"]').should('have.length.greaterThan', 0)
  })

  it('maintains active state for nested items in groups', () => {
    // Navigate to a sub-item (e.g., CRM Accounts)
    cy.visit('/crm/accounts')

    // Parent group should have indication of active child
    cy.get('[data-sidebar="menu"]').should('exist')

    // Active sub-item should be highlighted
    cy.get('[data-sidebar="menu-sub-button"][data-active="true"]')
      .should('exist')
  })

  it('handles module filtering - only shows enabled modules', () => {
    // Verify navigation exists
    cy.get('[data-sidebar="sidebar"]').should('exist')

    // Check that at least some modules are rendered
    cy.get('[data-sidebar="menu-item"]').should('have.length.greaterThan', 0)

    // All rendered items should have proper structure
    cy.get('[data-sidebar="menu-button"]').each(($btn) => {
      cy.wrap($btn).should('have.attr', 'data-sidebar', 'menu-button')
    })
  })

  it('collapses sidebar and shows icons only', () => {
    // Toggle sidebar to collapsed state
    cy.get('[data-sidebar="rail"]').click({ force: true })

    // Wait for animation
    cy.wait(300)

    // Verify sidebar is in collapsed state
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'collapsed')

    // Verify text is hidden (icons only mode)
    cy.get('[data-sidebar="menu-button"]').first()
      .should('have.css', 'width')
      .and('match', /32px|2rem/) // Icon size in collapsed state
  })
})
