import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createServiceJobSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  customer_id: z.string().min(1, 'Customer ID is required'),
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  service_type_id: z.string().min(1, 'Service type ID is required'),
  job_number: z.string().min(1, 'Job number is required'),
  customer_concerns: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    const serviceJobs = await prisma.awms_service_jobs.findMany({
      where: { vehicle_id: vehicleId },
    });

    return NextResponse.json(serviceJobs);
  } catch (error) {
    console.error('Error fetching service jobs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createServiceJobSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const {
      organizationId,
      customer_id,
      vehicle_id,
      service_type_id,
      job_number,
      customer_concerns,
    } = validation.data;

    const newServiceJob = await prisma.awms_service_jobs.create({
      data: {
        organizationId,
        customer_id,
        vehicle_id,
        service_type_id,
        job_number,
        customer_concerns,
        status: 'NEW',
        priority: 'ROUTINE',
        quality_check_status: 'PENDING',
      },
    });

    return NextResponse.json(newServiceJob, { status: 201 });
  } catch (error) {
    console.error('Error creating service job:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('job_number')) {
      return NextResponse.json({ error: 'A service job with this job number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
