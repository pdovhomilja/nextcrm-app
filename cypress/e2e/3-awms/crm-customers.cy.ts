describe('AWMS CRM Customers API', () => {
  let organizationId;
  let userId;

  beforeEach(() => {
    const orgName = `Test Org ${Date.now()}`;
    const userName = 'Test User';
    const userEmail = `test.user.${Date.now()}@example.com`;

    cy.request('POST', '/api/awms/test-setup', {
      orgName,
      userName,
      userEmail,
    }).then((response) => {
      cy.wrap(response.body.organization.id).as('organizationId');
      cy.wrap(response.body.user.id).as('userId');
    });
  });

  it('should create a new customer', function () {
    const customer = {
      first_name: 'John',
      last_name: 'Doe',
      email: `john.doe.${Date.now()}@example.com`,
      phone_primary: '123-456-7890',
      organizationId: this.organizationId,
      created_by_id: this.userId,
      customer_number: `CUST-${Date.now()}`,
    };

    cy.request('POST', '/api/awms/customers', customer).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('id');
      expect(response.body.first_name).to.eq(customer.first_name);
    });
  });

  it('should fetch customers for an organization', function () {
    cy.request('GET', `/api/awms/customers?organizationId=${this.organizationId}`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.be.an('array');
    });
  });
});
