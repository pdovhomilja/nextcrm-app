/**
 * GET /api/integrations/xero/invoices - Get Xero invoices
 * POST /api/integrations/xero/invoices - Save or sync Xero invoice
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

    const invoices = await prisma.xero_Invoices.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.xero_Invoices.count();

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
    const {
      externalId,
      invoiceNumber,
      amount,
      taxAmount,
      currency,
      status,
      invoiceDate,
      dueDate,
      contactName,
      description,
    } = body;

    if (!externalId) {
      return NextResponse.json(
        { error: 'Missing external ID' },
        { status: 400 }
      );
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.xero_Invoices.findUnique({
      where: { xero_invoice_id: externalId },
    });

    if (existingInvoice) {
      // Update existing invoice
      const updated = await prisma.xero_Invoices.update({
        where: { xero_invoice_id: externalId },
        data: {
          invoice_number: invoiceNumber,
          amount,
          tax_amount: taxAmount,
          currency,
          status,
          invoice_date: invoiceDate ? new Date(invoiceDate) : undefined,
          due_date: dueDate ? new Date(dueDate) : undefined,
          contact_name: contactName,
          description,
          last_synced_at: new Date(),
        },
      });
      return NextResponse.json(
        { invoice: updated, message: 'Invoice updated' },
        { status: 200 }
      );
    }

    // Create new invoice
    const invoice = await prisma.xero_Invoices.create({
      data: {
        xero_invoice_id: externalId,
        invoice_number: invoiceNumber,
        amount,
        tax_amount: taxAmount,
        currency,
        status,
        invoice_date: invoiceDate ? new Date(invoiceDate) : undefined,
        due_date: dueDate ? new Date(dueDate) : undefined,
        contact_name: contactName,
        description,
        xero_created_at: new Date(),
        last_synced_at: new Date(),
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
