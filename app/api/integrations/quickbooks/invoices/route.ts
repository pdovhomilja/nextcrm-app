/**
 * GET /api/integrations/quickbooks/invoices - Get QuickBooks invoices
 * POST /api/integrations/quickbooks/invoices - Save or sync QuickBooks invoice
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

    const invoices = await prisma.quickbooks_Invoices.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.quickbooks_Invoices.count();

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
    const existingInvoice = await prisma.quickbooks_Invoices.findUnique({
      where: { quickbooks_id: externalId },
    });

    if (existingInvoice) {
      // Update existing invoice
      const updated = await prisma.quickbooks_Invoices.update({
        where: { quickbooks_id: externalId },
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
    const invoice = await prisma.quickbooks_Invoices.create({
      data: {
        quickbooks_id: externalId,
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
