describe('Authentication', () => {
  it('should be able to sign in and sign out', () => {
    cy.login()
    cy.visit('/')

    // Ideally, we'd have a more specific selector for the sign-out button
    cy.get('nav').contains('Sign Out').click()
    cy.url().should('include', '/sign-in')
  })
})
