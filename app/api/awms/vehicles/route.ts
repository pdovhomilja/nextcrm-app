import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createVehicleSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  customer_id: z.string().min(1, 'Customer ID is required'),
  vehicle_number: z.string().min(1, 'Vehicle number is required'),
  registration_number: z.string().min(1, 'Registration number is required'),
  created_by_id: z.string().min(1, 'Created by ID is required'),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const vehicles = await prisma.awms_vehicles.findMany({
      where: { customer_id: customerId },
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createVehicleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const {
      organizationId,
      customer_id,
      vehicle_number,
      registration_number,
      created_by_id,
      make,
      model,
      year,
    } = validation.data;

    const newVehicle = await prisma.awms_vehicles.create({
      data: {
        organizationId,
        customer_id,
        vehicle_number,
        registration_number,
        created_by_id,
        make,
        model,
        year,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json(newVehicle, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('registration_number')) {
      return NextResponse.json({ error: 'A vehicle with this registration number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
