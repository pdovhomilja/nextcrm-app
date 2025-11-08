/**
 * UAT Test Data Generator
 * Creates realistic test data for AWMS UAT environment
 * Populates customers, work orders, invoices, quotes, etc.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface TestDataOptions {
  customers?: number;
  workOrders?: number;
  quotes?: number;
  invoices?: number;
  tenants?: number;
  users?: number;
  clearExisting?: boolean;
}

class UATestDataGenerator {
  private readonly DEFAULT_OPTIONS: TestDataOptions = {
    customers: 500,
    workOrders: 5000,
    quotes: 1000,
    invoices: 800,
    tenants: 3,
    users: 50,
    clearExisting: false,
  };

  async generateTestData(options: TestDataOptions = {}): Promise<void> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

    console.log('🔧 Generating AWMS UAT Test Data...\n');

    try {
      if (mergedOptions.clearExisting) {
        await this.clearExistingData();
      }

      const tenants = await this.generateTenants(mergedOptions.tenants!);
      const users = await this.generateUsers(mergedOptions.users!, tenants);
      const customers = await this.generateCustomers(mergedOptions.customers!, tenants);
      const workOrders = await this.generateWorkOrders(mergedOptions.workOrders!, {
        customers,
        users,
      });
      const quotes = await this.generateQuotes(mergedOptions.quotes!, {
        workOrders,
        users,
      });
      const invoices = await this.generateInvoices(mergedOptions.invoices!, {
        workOrders,
        customers,
      });

      console.log('\n✅ Test data generation complete!\n');
      console.log('📊 Generated Data Summary:');
      console.log(`   ✓ Tenants: ${tenants.length}`);
      console.log(`   ✓ Users: ${users.length}`);
      console.log(`   ✓ Customers: ${customers.length}`);
      console.log(`   ✓ Work Orders: ${workOrders.length}`);
      console.log(`   ✓ Quotes: ${quotes.length}`);
      console.log(`   ✓ Invoices: ${invoices.length}`);
    } catch (error) {
      console.error('❌ Error generating test data:', error);
      throw error;
    }
  }

  private async clearExistingData(): Promise<void> {
    console.log('🗑️  Clearing existing test data...');

    // Delete in correct order (respect foreign keys)
    await prisma.invoices.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.workOrders.deleteMany();
    await prisma.crm_Contacts.deleteMany();
    await prisma.crm_Accounts.deleteMany();
    await prisma.users.deleteMany({ where: { email: { contains: 'test' } } });
    await prisma.tenants.deleteMany({ where: { company_name: { contains: 'Test' } } });

    console.log('✓ Test data cleared\n');
  }

  private async generateTenants(count: number): Promise<any[]> {
    console.log(`📦 Generating ${count} test tenants...`);

    const tenants = [];

    for (let i = 0; i < count; i++) {
      const tenant = await prisma.tenants.create({
        data: {
          company_name: `Test Workshop ${i + 1}`,
          slug: `test-workshop-${i + 1}`,
          subdomain: `workshop${i + 1}`,
          domain_type: 'SUBDOMAIN',
          is_active: true,
          is_verified: true,
          subscription: {
            create: {
              tier: i === 0 ? 'ENTERPRISE' : i === 1 ? 'PROFESSIONAL' : 'FREE',
            },
          },
        },
        include: { subscription: true },
      });

      tenants.push(tenant);
    }

    console.log(`✓ Generated ${tenants.length} tenants`);
    return tenants;
  }

  private async generateUsers(count: number, tenants: any[]): Promise<any[]> {
    console.log(`👥 Generating ${count} test users...`);

    const users = [];
    const roles = ['service_advisor', 'technician', 'manager', 'admin'];
    const branches = ['north', 'south', 'east', 'west'];

    for (let i = 0; i < count; i++) {
      const role = roles[i % roles.length];
      const branch = branches[i % branches.length];
      const tenantId = tenants[i % tenants.length].id;

      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

      const user = await prisma.users.create({
        data: {
          email: `user${i}@awmstest.com`,
          name: `Test User ${i}`,
          password: hashedPassword,
          userStatus: 'ACTIVE',
          metadata: {
            role,
            branch,
            tenant_id: tenantId,
          },
        },
      });

      users.push(user);
    }

    console.log(`✓ Generated ${users.length} users`);
    return users;
  }

  private async generateCustomers(count: number, tenants: any[]): Promise<any[]> {
    console.log(`🏢 Generating ${count} test customers...`);

    const firstNames = [
      'John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eric', 'Fiona',
      'George', 'Hannah', 'Ivan', 'Julia', 'Kevin', 'Lisa', 'Mike', 'Nina',
    ];
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    ];

    const customers = [];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];

      const customer = await prisma.crm_Accounts.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@customer.com`,
          phone: `04${Math.random().toString().slice(2, 10)}`,
          office_phone: `02${Math.random().toString().slice(2, 10)}`,
          annual_revenue: `$${Math.floor(Math.random() * 1000000) + 100000}`,
          industry: null,
          company_id: null,
          type: i % 3 === 0 ? 'Supplier' : 'Customer',
          status: i % 5 === 0 ? 'Inactive' : 'Active',
          website: `https://www.${lastName.toLowerCase()}${i}.com.au`,
          billing_street: `${i} Test Street`,
          billing_city: 'Sydney',
          billing_state: 'NSW',
          billing_country: 'Australia',
          billing_postal_code: '2000',
        },
      });

      customers.push(customer);
    }

    console.log(`✓ Generated ${customers.length} customers`);
    return customers;
  }

  private async generateWorkOrders(
    count: number,
    deps: { customers: any[]; users: any[] }
  ): Promise<any[]> {
    console.log(`📋 Generating ${count} test work orders...`);

    const statuses = ['Pending', 'In Progress', 'QC Review', 'Complete'];
    const serviceTypes = ['Maintenance', 'Repair', 'Inspection', 'MOT', 'Service'];

    const workOrders = [];

    for (let i = 0; i < count; i++) {
      const customer = deps.customers[i % deps.customers.length];
      const technician = deps.users[i % deps.users.length];
      const createdBy = deps.users[(i + 1) % deps.users.length];

      const workOrder = await prisma.workOrders.create({
        data: {
          workOrderNumber: `WO-${String(i).padStart(6, '0')}`,
          accountsId: customer.id,
          description: `${serviceTypes[i % serviceTypes.length]} work on ${customer.name}'s vehicle`,
          status: statuses[i % statuses.length],
          serviceType: serviceTypes[i % serviceTypes.length],
          assignedTechnicianId: technician.id,
          createdBy: createdBy.id,
          createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          estimatedCost: Math.floor(Math.random() * 2000) + 100,
          actualCost: Math.floor(Math.random() * 2000) + 100,
        },
      });

      workOrders.push(workOrder);
    }

    console.log(`✓ Generated ${workOrders.length} work orders`);
    return workOrders;
  }

  private async generateQuotes(
    count: number,
    deps: { workOrders: any[]; users: any[] }
  ): Promise<any[]> {
    console.log(`📜 Generating ${count} test quotes...`);

    const statuses = ['Draft', 'Sent', 'Accepted', 'Declined'];

    const quotes = [];

    for (let i = 0; i < count; i++) {
      const workOrder = deps.workOrders[i % deps.workOrders.length];
      const createdBy = deps.users[i % deps.users.length];

      const quote = await prisma.quote.create({
        data: {
          quoteNumber: `QT-${String(i).padStart(6, '0')}`,
          workOrdersId: workOrder.id,
          quoteDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
          totalAmount: Math.floor(Math.random() * 5000) + 500,
          status: statuses[i % statuses.length],
          createdBy: createdBy.id,
          notes: 'Standard quote for vehicle service',
        },
      });

      quotes.push(quote);
    }

    console.log(`✓ Generated ${quotes.length} quotes`);
    return quotes;
  }

  private async generateInvoices(
    count: number,
    deps: { workOrders: any[]; customers: any[] }
  ): Promise<any[]> {
    console.log(`💰 Generating ${count} test invoices...`);

    const statuses = ['Draft', 'Sent', 'Paid', 'Overdue'];

    const invoices = [];

    for (let i = 0; i < count; i++) {
      const workOrder = deps.workOrders[i % deps.workOrders.length];
      const customer = deps.customers[i % deps.customers.length];

      const invoice = await prisma.invoices.create({
        data: {
          invoiceNumber: `INV-${String(i).padStart(6, '0')}`,
          accountsId: customer.id,
          workOrdersId: workOrder.id,
          issueDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
          totalAmount: Math.floor(Math.random() * 5000) + 500,
          paidAmount: i % 5 === 0 ? Math.floor(Math.random() * 5000) + 500 : 0,
          status: statuses[i % statuses.length],
          notes: 'Invoice for completed vehicle service',
        },
      });

      invoices.push(invoice);
    }

    console.log(`✓ Generated ${invoices.length} invoices`);
    return invoices;
  }

  async generateSpecificTestAccounts(): Promise<void> {
    console.log('👤 Creating specific test accounts for UAT...\n');

    const testAccounts = [
      {
        email: 'sa_test@awmstest.com',
        name: 'Service Advisor Test',
        role: 'service_advisor',
        branch: 'north',
      },
      {
        email: 'tech_test@awmstest.com',
        name: 'Technician Test',
        role: 'technician',
        branch: 'north',
      },
      {
        email: 'manager_test@awmstest.com',
        name: 'Service Manager Test',
        role: 'manager',
        branch: 'north',
      },
      {
        email: 'admin_test@awmstest.com',
        name: 'Admin Test',
        role: 'admin',
        branch: null,
      },
      {
        email: 'super_test@awmstest.com',
        name: 'SuperAdmin Test',
        role: 'superadmin',
        branch: null,
      },
    ];

    for (const account of testAccounts) {
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

      await prisma.users.upsert({
        where: { email: account.email },
        update: {},
        create: {
          email: account.email,
          name: account.name,
          password: hashedPassword,
          userStatus: 'ACTIVE',
          metadata: {
            role: account.role,
            branch: account.branch,
          },
        },
      });

      console.log(`✓ Created ${account.role}: ${account.email}`);
    }

    console.log('\nℹ️  All test accounts use password: TestPassword123!');
  }
}

// CLI entry point
const generator = new UATestDataGenerator();

const args = process.argv.slice(2);
const command = args[0] || 'generate';

switch (command) {
  case 'generate':
    generator.generateTestData({
      customers: 500,
      workOrders: 5000,
      quotes: 1000,
      invoices: 800,
      clearExisting: args.includes('--clear'),
    });
    break;

  case 'accounts':
    generator.generateSpecificTestAccounts();
    break;

  case 'clear':
    generator.generateTestData({ clearExisting: true, ...{} }).then(() => {
      console.log('✓ Test data cleared');
    });
    break;

  default:
    console.log('Usage: npx ts-node test-data-generator.ts [generate|accounts|clear] [--clear]');
}

export default UATestDataGenerator;
