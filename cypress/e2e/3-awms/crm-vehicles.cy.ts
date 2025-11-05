describe('AWMS Vehicles API', () => {
  let organizationId;
  let customerId;
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

      const customer = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: `jane.doe.${Date.now()}@example.com`,
        organizationId: response.body.organization.id,
        created_by_id: response.body.user.id,
        customer_number: `CUST-${Date.now()}`,
      };

      cy.request('POST', '/api/awms/customers', customer).then(
        (customerResponse) => {
          cy.wrap(customerResponse.body.id).as('customerId');
        }
      );
    });
  });

  it('should create a new vehicle', function () {
    const vehicle = {
      organizationId: this.organizationId,
      customer_id: this.customerId,
      vehicle_number: `VEH-${Date.now()}`,
      registration_number: `REG-${Date.now()}`,
      created_by_id: this.userId,
      make: 'Toyota',
      model: 'Camry',
      year: 2021,
    };

    cy.request('POST', '/api/awms/vehicles', vehicle).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('id');
      expect(response.body.make).to.eq(vehicle.make);
    });
  });

  it('should fetch vehicles for a customer', function () {
    cy.request('GET', `/api/awms/vehicles?customerId=${this.customerId}`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.be.an('array');
    });
  });
});
