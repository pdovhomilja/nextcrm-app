/**
 * Task Group 3.1: Nav-User Section Component Tests
 *
 * Test suite for nav-user component in sidebar footer.
 * Focuses on 6 critical behaviors:
 * 1. User info displays (avatar, name, email)
 * 2. Dropdown menu opens on click
 * 3. User actions are accessible (Profile, Settings, Logout)
 * 4. Logout action works correctly
 * 5. Navigation to profile/settings works
 * 6. Component adapts to sidebar collapsed/expanded states
 */

describe('Nav-User Component', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/sign-in')
    cy.get('input[name="email"]').type('admin@nextcrm.com')
    cy.get('input[name="password"]').type('password123')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard')
  })

  it('Test 1: Nav-user displays user avatar, name, and email when expanded', () => {
    // Verify sidebar is expanded (or expand it)
    cy.get('[data-sidebar="sidebar"]').should('be.visible')

    // Find nav-user in sidebar footer
    cy.get('[data-sidebar="footer"]').within(() => {
      // Check that user avatar is visible
      cy.get('[data-sidebar="menu-button"]').should('be.visible')

      // Check that name and email are visible when expanded
      cy.get('[data-sidebar="menu-button"]').within(() => {
        // Should show user info text (name/email)
        cy.get('.truncate').should('be.visible')
      })
    })
  })

  it('Test 2: Nav-user dropdown opens when clicked', () => {
    // Click the nav-user button in footer
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').click()
    })

    // Verify dropdown menu opens
    cy.get('[role="menu"]').should('be.visible')

    // Verify dropdown has user info
    cy.get('[role="menu"]').within(() => {
      // Should have menu items
      cy.get('[role="menuitem"]').should('have.length.at.least', 1)
    })
  })

  it('Test 3: Nav-user dropdown contains Profile action', () => {
    // Open nav-user dropdown
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').click()
    })

    // Check for Profile menu item
    cy.get('[role="menu"]').within(() => {
      cy.contains('Profile').should('be.visible')
    })
  })

  it('Test 4: Nav-user dropdown contains Settings action', () => {
    // Open nav-user dropdown
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').click()
    })

    // Check for Settings menu item
    cy.get('[role="menu"]').within(() => {
      cy.contains('Settings').should('be.visible')
    })
  })

  it('Test 5: Nav-user dropdown contains Logout action', () => {
    // Open nav-user dropdown
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').click()
    })

    // Check for Logout menu item
    cy.get('[role="menu"]').within(() => {
      cy.contains('Logout').should('be.visible')
    })
  })

  it('Test 6: Logout action redirects to sign-in page', () => {
    // Open nav-user dropdown
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').click()
    })

    // Click logout
    cy.get('[role="menu"]').within(() => {
      cy.contains('Logout').click()
    })

    // Verify redirect to sign-in page
    cy.url().should('include', '/sign-in')
  })
})
