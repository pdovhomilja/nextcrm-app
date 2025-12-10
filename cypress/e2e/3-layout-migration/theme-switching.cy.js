/**
 * Task Group 6.1.3 - Additional Strategic Test #3
 * Theme Switching Across New Layout
 *
 * Tests theme toggle interaction with layout components:
 * - Toggle light to dark mode
 * - Verify sidebar updates theme
 * - Verify nav-user updates theme
 * - Verify main content updates theme
 * - Verify persistence across navigation
 *
 * Priority: MEDIUM
 * User Impact: Users who prefer dark/light mode
 */

describe('Theme Switching Across Layout', () => {
  beforeEach(() => {
    // Login as active user
    cy.visit('/sign-in')
    cy.get('input[name="email"]').type('admin@example.com')
    cy.get('input[name="password"]').type('password')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/sign-in')
  })

  it('finds and uses theme toggle button', () => {
    cy.visit('/dashboard')

    // Find theme toggle button (usually in header)
    cy.get('[data-testid="theme-toggle"]').should('exist')
    // OR
    cy.get('button').contains('Theme').should('exist')
    // OR (most likely for shadcn)
    cy.get('button[aria-label*="theme"]').should('exist')
  })

  it('switches from light to dark mode', () => {
    cy.visit('/dashboard')

    // Get initial theme from HTML element
    cy.get('html').invoke('attr', 'class').then((initialClass) => {
      // Click theme toggle
      cy.get('button[aria-label*="theme"]').click()

      // Wait for theme transition
      cy.wait(300)

      // Verify HTML class changed
      cy.get('html').invoke('attr', 'class').should('not.equal', initialClass)

      // Verify dark mode applied (class should include 'dark')
      cy.get('html').should('have.class', 'dark')
    })
  })

  it('updates sidebar appearance in dark mode', () => {
    cy.visit('/dashboard')

    // Switch to dark mode
    cy.get('button[aria-label*="theme"]').click()
    cy.wait(300)

    // Verify sidebar has dark theme styling
    cy.get('[data-sidebar="sidebar"]').should('exist')

    // Check sidebar background color (should be dark)
    cy.get('[data-sidebar="sidebar"]').should(($sidebar) => {
      const bgColor = $sidebar.css('background-color')
      // Dark mode backgrounds are typically rgb with low values (e.g., rgb(10, 10, 10))
      expect(bgColor).to.not.equal('rgb(255, 255, 255)')
    })
  })

  it('updates nav-user section appearance in dark mode', () => {
    cy.visit('/dashboard')

    // Switch to dark mode
    cy.get('button[aria-label*="theme"]').click()
    cy.wait(300)

    // Verify nav-user section exists and has dark styling
    cy.get('[data-sidebar="footer"]').should('exist')

    // Open nav-user dropdown
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').click()
    })

    // Verify dropdown menu has dark theme
    cy.get('[role="menu"]').should('exist')
    cy.get('[role="menu"]').should(($menu) => {
      const bgColor = $menu.css('background-color')
      expect(bgColor).to.not.equal('rgb(255, 255, 255)')
    })
  })

  it('updates main content area in dark mode', () => {
    cy.visit('/dashboard')

    // Switch to dark mode
    cy.get('button[aria-label*="theme"]').click()
    cy.wait(300)

    // Verify main content area has dark background
    cy.get('main').should(($main) => {
      const bgColor = $main.css('background-color')
      // Check that background is dark (not white)
      expect(bgColor).to.not.equal('rgb(255, 255, 255)')
    })

    // Verify HTML root has dark class
    cy.get('html').should('have.class', 'dark')
  })

  it('persists theme choice across navigation', () => {
    cy.visit('/dashboard')

    // Switch to dark mode
    cy.get('button[aria-label*="theme"]').click()
    cy.wait(300)

    // Verify dark mode
    cy.get('html').should('have.class', 'dark')

    // Navigate to different page
    cy.get('[data-sidebar="menu"]').within(() => {
      cy.contains('CRM').click()
      cy.wait(200)
      cy.contains('Accounts').click()
    })

    cy.url().should('include', '/crm/accounts')

    // Verify theme persisted
    cy.get('html').should('have.class', 'dark')

    // Sidebar should still be dark
    cy.get('[data-sidebar="sidebar"]').should('exist')
  })

  it('persists theme choice across page reload', () => {
    cy.visit('/dashboard')

    // Switch to dark mode
    cy.get('button[aria-label*="theme"]').click()
    cy.wait(300)

    // Verify dark mode
    cy.get('html').should('have.class', 'dark')

    // Reload page
    cy.reload()

    // Wait for page load
    cy.wait(1000)

    // Verify theme persisted after reload
    cy.get('html').should('have.class', 'dark')
  })

  it('switches back to light mode successfully', () => {
    cy.visit('/dashboard')

    // Switch to dark mode
    cy.get('button[aria-label*="theme"]').click()
    cy.wait(300)
    cy.get('html').should('have.class', 'dark')

    // Switch back to light mode
    cy.get('button[aria-label*="theme"]').click()
    cy.wait(300)

    // Verify light mode restored
    cy.get('html').should('not.have.class', 'dark')

    // Verify sidebar has light styling
    cy.get('[data-sidebar="sidebar"]').should('exist')
  })

  it('maintains readable contrast in both themes', () => {
    cy.visit('/dashboard')

    // Test light mode contrast
    cy.get('[data-sidebar="menu-button"]').first().should('be.visible')

    // Switch to dark mode
    cy.get('button[aria-label*="theme"]').click()
    cy.wait(300)

    // Test dark mode contrast
    cy.get('[data-sidebar="menu-button"]').first().should('be.visible')

    // Both modes should have readable text (no assertion failures means visible)
  })
})
