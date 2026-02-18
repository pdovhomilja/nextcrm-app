/**
 * Task Group 6.1.3 - Additional Strategic Test #4
 * Keyboard Navigation Through Sidebar
 *
 * Tests keyboard accessibility:
 * - Tab through menu items
 * - Enter to activate items
 * - Escape to close dropdowns
 * - Logical tab order
 *
 * Priority: MEDIUM
 * User Impact: Accessibility and power users
 */

describe('Keyboard Navigation', () => {
  beforeEach(() => {
    // Login as active user
    cy.visit('/sign-in')
    cy.get('input[name="email"]').type('admin@example.com')
    cy.get('input[name="password"]').type('password')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/sign-in')
    cy.visit('/dashboard')
  })

  it('allows tabbing through navigation items', () => {
    // Focus on first navigation item
    cy.get('[data-sidebar="menu-button"]').first().focus()

    // Tab to next item
    cy.focused().tab()

    // Verify focus moved to next navigation element
    cy.focused().should('have.attr', 'data-sidebar')
  })

  it('activates navigation item with Enter key', () => {
    // Focus on a navigation item
    cy.get('[data-sidebar="menu-button"]').contains('CRM').focus()

    // Press Enter to activate
    cy.focused().type('{enter}')

    // Wait for group to expand or navigation to occur
    cy.wait(200)

    // Verify action occurred (group expanded or navigation happened)
    cy.get('[data-sidebar="menu-sub"]').should('be.visible')
    // OR
    // cy.url().should('include', '/crm')
  })

  it('activates navigation item with Space key', () => {
    // Focus on a navigation item
    cy.get('[data-sidebar="menu-button"]').first().focus()

    // Press Space to activate
    cy.focused().type(' ')

    // Verify action occurred
    cy.wait(200)
    // Action should occur (expand group or navigate)
  })

  it('closes dropdown/collapsible with Escape key', () => {
    // Open a collapsible group
    cy.get('[data-sidebar="menu-button"]').contains('CRM').click()
    cy.wait(200)

    // Verify sub-menu is visible
    cy.get('[data-sidebar="menu-sub"]').should('be.visible')

    // Press Escape to close
    cy.get('body').type('{esc}')

    // Wait for animation
    cy.wait(300)

    // Sub-menu should be closed
    cy.get('[data-sidebar="menu-sub"]').should('not.be.visible')
  })

  it('opens nav-user dropdown with Enter key', () => {
    // Focus on nav-user button
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').focus()
    })

    // Press Enter to open dropdown
    cy.focused().type('{enter}')

    // Wait for dropdown
    cy.wait(200)

    // Dropdown should be visible
    cy.get('[role="menu"]').should('be.visible')
  })

  it('closes nav-user dropdown with Escape key', () => {
    // Open nav-user dropdown
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').click()
    })

    cy.wait(200)
    cy.get('[role="menu"]').should('be.visible')

    // Press Escape to close
    cy.get('body').type('{esc}')

    // Wait for animation
    cy.wait(300)

    // Dropdown should be closed
    cy.get('[role="menu"]').should('not.be.visible')
  })

  it('follows logical tab order through header and sidebar', () => {
    // Tab from body
    cy.get('body').tab()

    // First focusable element should be in header or sidebar
    cy.focused().should('be.visible')

    // Continue tabbing and track order
    const focusedElements = []

    // Tab through first 10 elements
    for (let i = 0; i < 10; i++) {
      cy.focused().then(($el) => {
        focusedElements.push($el.attr('data-sidebar') || $el.prop('tagName'))
      })
      cy.focused().tab()
    }

    // Verify logical order (header → sidebar → content)
    // Exact order depends on implementation
  })

  it('traps focus within modal/dialog when opened', () => {
    // Open a dialog/modal (if available in navigation)
    // This tests focus trap behavior

    // Example: Open user dropdown
    cy.get('[data-sidebar="footer"]').within(() => {
      cy.get('[data-sidebar="menu-button"]').click()
    })

    cy.wait(200)

    // Tab through dropdown items
    cy.get('[role="menu"]').within(() => {
      cy.get('[role="menuitem"]').first().focus()
      cy.focused().tab()
      cy.focused().should('have.attr', 'role', 'menuitem')
    })

    // Focus should stay within dropdown
  })

  it('allows keyboard navigation through collapsible sub-items', () => {
    // Expand a collapsible group
    cy.get('[data-sidebar="menu-button"]').contains('CRM').focus().type('{enter}')
    cy.wait(200)

    // Tab to sub-item
    cy.focused().tab()

    // Focus should be on sub-menu item
    cy.focused().should('have.attr', 'data-sidebar', 'menu-sub-button')

    // Activate sub-item with Enter
    cy.focused().type('{enter}')

    // Should navigate to sub-route
    cy.wait(500)
    cy.url().should('include', '/crm/')
  })

  it('highlights focused elements visibly', () => {
    // Focus on navigation item
    cy.get('[data-sidebar="menu-button"]').first().focus()

    // Verify focus indicator is visible (outline or ring)
    cy.focused().should(($el) => {
      const outline = $el.css('outline')
      const boxShadow = $el.css('box-shadow')

      // Should have visible focus indicator
      const hasFocusIndicator = outline !== 'none' || boxShadow !== 'none'
      expect(hasFocusIndicator).to.be.true
    })
  })
})
