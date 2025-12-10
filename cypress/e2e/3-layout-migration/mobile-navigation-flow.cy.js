/**
 * Task Group 6.1.3 - Additional Strategic Test #1
 * Mobile Navigation Complete Flow
 *
 * Tests end-to-end mobile navigation workflow:
 * - Open mobile sidebar
 * - Navigate to module
 * - Sidebar auto-closes after navigation
 * - Content loads correctly
 *
 * Priority: HIGH
 * User Impact: Mobile users (significant traffic)
 */

describe('Mobile Navigation Flow', () => {
  beforeEach(() => {
    // Set mobile viewport
    cy.viewport('iphone-x')

    // Login as active user
    cy.visit('/sign-in')
    cy.get('input[name="email"]').type('admin@example.com')
    cy.get('input[name="password"]').type('password')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/sign-in')
  })

  it('opens mobile sidebar via trigger button', () => {
    cy.visit('/dashboard')

    // Mobile viewport should show sidebar trigger
    cy.get('[data-sidebar="trigger"]').should('be.visible')

    // Click trigger to open sidebar
    cy.get('[data-sidebar="trigger"]').click()

    // Wait for sidebar animation
    cy.wait(300)

    // Sidebar should be visible (as overlay/sheet on mobile)
    cy.get('[data-sidebar="sidebar"]').should('be.visible')

    // Navigation items should be visible
    cy.get('[data-sidebar="menu"]').should('be.visible')
  })

  it('navigates to module and closes sidebar automatically', () => {
    cy.visit('/dashboard')

    // Open mobile sidebar
    cy.get('[data-sidebar="trigger"]').click()
    cy.wait(300)

    // Click on a navigation item (e.g., CRM Accounts)
    cy.get('[data-sidebar="menu"]').within(() => {
      cy.contains('CRM').click()
      cy.wait(200) // Wait for group to expand
      cy.contains('Accounts').click()
    })

    // Wait for navigation
    cy.url().should('include', '/crm/accounts')

    // Sidebar should auto-close after navigation on mobile
    cy.wait(500)
    cy.get('[data-sidebar="sidebar"]').should('not.be.visible')

    // Main content should be visible
    cy.get('main').should('be.visible')
  })

  it('closes sidebar when backdrop is clicked', () => {
    cy.visit('/dashboard')

    // Open mobile sidebar
    cy.get('[data-sidebar="trigger"]').click()
    cy.wait(300)

    // Sidebar should be visible
    cy.get('[data-sidebar="sidebar"]').should('be.visible')

    // Click backdrop/overlay to close (click outside sidebar)
    // Note: This depends on implementation - may need to adjust selector
    cy.get('body').click(100, 100, { force: true })

    // Wait for close animation
    cy.wait(300)

    // Sidebar should be hidden
    cy.get('[data-sidebar="sidebar"]').should('not.be.visible')
  })

  it('maintains navigation state when reopening sidebar', () => {
    cy.visit('/crm/accounts')

    // Open mobile sidebar
    cy.get('[data-sidebar="trigger"]').click()
    cy.wait(300)

    // CRM section should be expanded (active route)
    cy.get('[data-sidebar="menu"]').within(() => {
      cy.contains('Accounts').should('be.visible')
    })

    // Active item should be highlighted
    cy.get('[data-sidebar="menu-button"][data-active="true"]')
      .should('exist')
      .should('contain', 'Accounts')
  })

  it('handles touch interactions on mobile', () => {
    cy.visit('/dashboard')

    // Open sidebar
    cy.get('[data-sidebar="trigger"]').click()
    cy.wait(300)

    // Simulate touch event on navigation item
    cy.get('[data-sidebar="menu-button"]').first()
      .trigger('touchstart')
      .trigger('touchend')

    // Should respond to touch
    // Verify navigation occurred or group expanded
    cy.get('[data-sidebar="menu"]').should('be.visible')
  })
})
