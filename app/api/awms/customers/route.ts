import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createCustomerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone_primary: z.string().optional(),
  organizationId: z.string().min(1, 'Organization ID is required'),
  created_by_id: z.string().min(1, 'Created by ID is required'),
  customer_number: z.string().min(1, 'Customer number is required'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const customers = await prisma.awms_customers.findMany({
      where: { organizationId },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createCustomerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const {
      first_name,
      last_name,
      email,
      phone_primary,
      organizationId,
      created_by_id,
      customer_number
    } = validation.data;

    // Check for existing customer with the same email in the same organization
    const existingCustomer = await prisma.awms_customers.findFirst({
      where: {
        organizationId,
        email,
      },
    });

    if (existingCustomer) {
      return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 409 });
    }

    const newCustomer = await prisma.awms_customers.create({
      data: {
        first_name,
        last_name,
        email,
        phone_primary,
        organizationId,
        created_by_id,
        customer_number,
        status: 'NEW',
        lifecycle_stage: 'CUSTOMER',
        contact_preference: 'EMAIL',
      },
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
