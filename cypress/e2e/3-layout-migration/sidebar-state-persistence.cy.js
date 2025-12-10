/**
 * Task Group 6.1.3 - Additional Strategic Test #6
 * Sidebar State Persistence
 *
 * Tests sidebar collapsed/expanded state persistence:
 * - Collapse sidebar
 * - Navigate to new page
 * - Verify state persists
 * - Reload page
 * - Verify state persists across reload
 *
 * Priority: LOW
 * User Impact: User preference persistence
 */

describe('Sidebar State Persistence', () => {
  beforeEach(() => {
    // Login as active user
    cy.visit('/sign-in')
    cy.get('input[name="email"]').type('admin@example.com')
    cy.get('input[name="password"]').type('password')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/sign-in')
  })

  it('starts with sidebar expanded by default on desktop', () => {
    // Set desktop viewport
    cy.viewport(1280, 720)
    cy.visit('/dashboard')

    // Sidebar should be expanded by default
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'expanded')

    // App name and build version should be visible
    cy.get('[data-sidebar="header"]').should('be.visible')
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.contains(/build:/).should('be.visible')
    })
  })

  it('persists collapsed state across navigation', () => {
    cy.viewport(1280, 720)
    cy.visit('/dashboard')

    // Collapse sidebar
    cy.get('[data-sidebar="rail"]').click({ force: true })
    cy.wait(300)

    // Verify collapsed
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'collapsed')

    // Navigate to different page
    cy.get('[data-sidebar="menu"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').first().click()
    })

    cy.wait(500)

    // Sidebar should still be collapsed
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'collapsed')
  })

  it('persists collapsed state across page reload', () => {
    cy.viewport(1280, 720)
    cy.visit('/dashboard')

    // Collapse sidebar
    cy.get('[data-sidebar="rail"]').click({ force: true })
    cy.wait(300)

    // Verify collapsed
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'collapsed')

    // Reload page
    cy.reload()

    // Wait for page load
    cy.wait(1000)

    // Sidebar should still be collapsed
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'collapsed')
  })

  it('persists expanded state across page reload', () => {
    cy.viewport(1280, 720)
    cy.visit('/dashboard')

    // Ensure sidebar is expanded
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .invoke('attr', 'data-state')
      .then((state) => {
        if (state === 'collapsed') {
          cy.get('[data-sidebar="rail"]').click({ force: true })
          cy.wait(300)
        }
      })

    // Verify expanded
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'expanded')

    // Reload page
    cy.reload()

    // Wait for page load
    cy.wait(1000)

    // Sidebar should still be expanded
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'expanded')
  })

  it('stores sidebar state in localStorage or cookie', () => {
    cy.viewport(1280, 720)
    cy.visit('/dashboard')

    // Collapse sidebar
    cy.get('[data-sidebar="rail"]').click({ force: true })
    cy.wait(300)

    // Check localStorage for sidebar state
    cy.window().then((win) => {
      const sidebarState = win.localStorage.getItem('sidebar:state')
      // Should have some value indicating collapsed state
      expect(sidebarState).to.not.be.null
    })
    // OR check cookies
    // cy.getCookie('sidebar-state').should('exist')
  })

  it('respects user preference across different modules', () => {
    cy.viewport(1280, 720)
    cy.visit('/dashboard')

    // Collapse sidebar
    cy.get('[data-sidebar="rail"]').click({ force: true })
    cy.wait(300)

    // Navigate to CRM module
    cy.visit('/crm/accounts')

    // Sidebar should be collapsed
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'collapsed')

    // Navigate to Projects module
    cy.visit('/projects')

    // Sidebar should still be collapsed
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'collapsed')
  })

  it('allows toggling sidebar state multiple times', () => {
    cy.viewport(1280, 720)
    cy.visit('/dashboard')

    // Toggle collapsed
    cy.get('[data-sidebar="rail"]').click({ force: true })
    cy.wait(300)
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'collapsed')

    // Toggle expanded
    cy.get('[data-sidebar="rail"]').click({ force: true })
    cy.wait(300)
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'expanded')

    // Toggle collapsed again
    cy.get('[data-sidebar="rail"]').click({ force: true })
    cy.wait(300)
    cy.get('[data-sidebar="sidebar"]')
      .parent()
      .should('have.attr', 'data-state', 'collapsed')
  })

  it('does not persist sidebar state on mobile (always collapsed)', () => {
    // Mobile viewports should not persist expanded state
    cy.viewport('iphone-x')
    cy.visit('/dashboard')

    // On mobile, sidebar is hidden by default
    cy.get('[data-sidebar="sidebar"]').should('not.be.visible')

    // Open sidebar via trigger
    cy.get('[data-sidebar="trigger"]').click()
    cy.wait(300)

    // Sidebar shows as overlay
    cy.get('[data-sidebar="sidebar"]').should('be.visible')

    // Close sidebar (click outside or trigger)
    cy.get('body').click(100, 100, { force: true })
    cy.wait(300)

    // Navigate to new page
    cy.visit('/crm/accounts')

    // Sidebar should still be hidden (mobile default)
    cy.get('[data-sidebar="sidebar"]').should('not.be.visible')
  })
})
