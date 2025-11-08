/**
 * GET /api/integrations/myob/invoices - Get MYOB invoices
 * POST /api/integrations/myob/invoices - Save or sync MYOB invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const invoices = await prisma.myob_Invoices.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.myob_Invoices.count();

    return NextResponse.json({
      invoices,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { externalId, invoiceNumber, amount, status } = body;

    if (!externalId) {
      return NextResponse.json(
        { error: 'Missing external ID' },
        { status: 400 }
      );
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.myob_Invoices.findUnique({
      where: { myob_invoice_uid: externalId },
    });

    if (existingInvoice) {
      // Update existing invoice
      const updated = await prisma.myob_Invoices.update({
        where: { myob_invoice_uid: externalId },
        data: {
          invoice_number: invoiceNumber,
          amount,
          status,
        },
      });
      return NextResponse.json(
        { invoice: updated, message: 'Invoice updated' },
        { status: 200 }
      );
    }

    // Create new invoice
    const invoice = await prisma.myob_Invoices.create({
      data: {
        myob_invoice_uid: externalId,
        invoice_number: invoiceNumber,
        amount,
        status,
      },
    });

    return NextResponse.json(
      { invoice, message: 'Invoice created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing invoice:', error);
    return NextResponse.json(
      { error: 'Failed to process invoice' },
      { status: 500 }
    );
  }
}
