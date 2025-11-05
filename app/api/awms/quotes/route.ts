import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createQuoteSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  customer_id: z.string().min(1, 'Customer ID is required'),
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  quote_number: z.string().min(1, 'Quote number is required'),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const quotes = await prisma.awms_quotes.findMany({
      where: { customer_id: customerId },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createQuoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const {
      organizationId,
      customer_id,
      vehicle_id,
      quote_number,
      subtotal,
      tax_amount,
      total_amount,
    } = validation.data;

    const newQuote = await prisma.awms_quotes.create({
      data: {
        organizationId,
        customer_id,
        vehicle_id,
        quote_number,
        subtotal,
        tax_amount,
        total_amount,
        status: 'DRAFT',
      },
    });

    return NextResponse.json(newQuote, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('quote_number')) {
      return NextResponse.json({ error: 'A quote with this number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
