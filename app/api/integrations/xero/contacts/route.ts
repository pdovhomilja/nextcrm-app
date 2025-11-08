/**
 * GET /api/integrations/xero/contacts - Get Xero contacts
 * POST /api/integrations/xero/contacts - Save or sync Xero contact
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

    const contacts = await prisma.xero_Contacts.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.xero_Contacts.count();

    return NextResponse.json({
      contacts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
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
    const { externalId, name, email, phone, taxNumber } = body;

    if (!externalId) {
      return NextResponse.json(
        { error: 'Missing external ID' },
        { status: 400 }
      );
    }

    // Check if contact already exists
    const existingContact = await prisma.xero_Contacts.findUnique({
      where: { xero_contact_id: externalId },
    });

    if (existingContact) {
      // Update existing contact
      const updated = await prisma.xero_Contacts.update({
        where: { xero_contact_id: externalId },
        data: {
          name,
          email,
          phone,
          tax_number: taxNumber,
        },
      });
      return NextResponse.json(
        { contact: updated, message: 'Contact updated' },
        { status: 200 }
      );
    }

    // Create new contact
    const contact = await prisma.xero_Contacts.create({
      data: {
        xero_contact_id: externalId,
        name,
        email,
        phone,
        tax_number: taxNumber,
      },
    });

    return NextResponse.json(
      { contact, message: 'Contact created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing contact:', error);
    return NextResponse.json(
      { error: 'Failed to process contact' },
      { status: 500 }
    );
  }
}
