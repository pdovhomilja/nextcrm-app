/// <reference types="cypress" />

/**
 * Task Group 1.2: Core App Sidebar Component Tests
 *
 * Focused tests for sidebar functionality:
 * - Logo/branding rendering
 * - Build version display
 * - Collapse/expand state
 *
 * Note: Navigation items will be tested in Phase 2
 */

describe('App Sidebar Component', () => {
  beforeEach(() => {
    // Login and navigate to authenticated area
    // Note: Adjust this URL and authentication as needed for your app
    cy.visit('/en/crm/dashboard')
  })

  it('renders the sidebar with logo and branding', () => {
    // Check that sidebar exists
    cy.get('[data-sidebar="sidebar"]').should('exist')

    // Check that logo/brand section exists in header
    cy.get('[data-sidebar="header"]').should('exist')

    // Check for "N" branding symbol (should have rotation animation)
    cy.get('[data-sidebar="header"]').within(() => {
      cy.contains('N').should('exist')
    })
  })

  it('displays app name when sidebar is expanded', () => {
    // Ensure sidebar is expanded
    cy.get('[data-sidebar="sidebar"]')
      .parents('[data-state]')
      .should('have.attr', 'data-state', 'expanded')

    // App name should be visible when expanded
    cy.get('[data-sidebar="header"]').within(() => {
      cy.get('[class*="scale"]').should('not.have.class', 'scale-0')
    })
  })

  it('displays build version in footer when expanded', () => {
    // Ensure sidebar is expanded
    cy.get('[data-sidebar="sidebar"]')
      .parents('[data-state]')
      .should('have.attr', 'data-state', 'expanded')

    // Check footer exists
    cy.get('[data-sidebar="footer"]').should('exist')

    // Check build version is displayed (format: "build: 0.0.3-beta-XXX")
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.contains(/build:\s*0\.0\.3-beta-\d+/).should('exist')
    })
  })

  it('hides build version when sidebar is collapsed', () => {
    // Find and click the collapse/toggle button (SidebarRail or trigger)
    cy.get('[data-sidebar="rail"]').click({ force: true })

    // Wait for animation
    cy.wait(300)

    // Verify sidebar is collapsed
    cy.get('[data-sidebar="sidebar"]')
      .parents('[data-state]')
      .should('have.attr', 'data-state', 'collapsed')

    // Build version should not be visible when collapsed
    // Either hidden or has opacity-0 class
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.contains(/build:/).should('not.be.visible')
    })
  })

  it('toggles sidebar state on rail click', () => {
    // Get initial state
    cy.get('[data-sidebar="sidebar"]')
      .parents('[data-state]')
      .invoke('attr', 'data-state')
      .then((initialState) => {
        // Click the rail to toggle
        cy.get('[data-sidebar="rail"]').click({ force: true })

        // Wait for animation
        cy.wait(300)

        // Verify state has changed
        cy.get('[data-sidebar="sidebar"]')
          .parents('[data-state]')
          .invoke('attr', 'data-state')
          .should('not.equal', initialState)
      })
  })

  it('preserves branding symbol in collapsed state', () => {
    // Collapse the sidebar
    cy.get('[data-sidebar="rail"]').click({ force: true })

    // Wait for animation
    cy.wait(300)

    // "N" symbol should still be visible in collapsed state
    cy.get('[data-sidebar="header"]').within(() => {
      cy.contains('N').should('be.visible')
    })
  })
})
