import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createAppointmentSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  customer_id: z.string().min(1, 'Customer ID is required'),
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  service_type_id: z.string().min(1, 'Service type ID is required'),
  appointment_date_time: z.string().datetime(),
  duration_minutes: z.number(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    const appointments = await prisma.awms_appointments.findMany({
      where: { vehicle_id: vehicleId },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const {
      organizationId,
      customer_id,
      vehicle_id,
      service_type_id,
      appointment_date_time,
      duration_minutes,
    } = validation.data;

    const newAppointment = await prisma.awms_appointments.create({
      data: {
        organizationId,
        customer_id,
        vehicle_id,
        service_type_id,
        appointment_date_time: new Date(appointment_date_time),
        duration_minutes,
        status: 'SCHEDULED',
      },
    });

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
