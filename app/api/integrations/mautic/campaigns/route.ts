/**
 * GET /api/integrations/mautic/campaigns - Get Mautic campaigns
 * POST /api/integrations/mautic/campaigns - Save or sync Mautic campaign
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

    const campaigns = await prisma.mautic_Campaigns.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.mautic_Campaigns.count();

    return NextResponse.json({
      campaigns,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
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
    const { externalId, campaignName, status, contactsCount } = body;

    if (!externalId) {
      return NextResponse.json(
        { error: 'Missing external ID' },
        { status: 400 }
      );
    }

    // Check if campaign already exists
    const existingCampaign = await prisma.mautic_Campaigns.findUnique({
      where: { mautic_id: externalId },
    });

    if (existingCampaign) {
      // Update existing campaign
      const updated = await prisma.mautic_Campaigns.update({
        where: { mautic_id: externalId },
        data: {
          campaign_name: campaignName,
          status,
          contacts_count: contactsCount,
        },
      });
      return NextResponse.json(
        { campaign: updated, message: 'Campaign updated' },
        { status: 200 }
      );
    }

    // Create new campaign
    const campaign = await prisma.mautic_Campaigns.create({
      data: {
        mautic_id: externalId,
        campaign_name: campaignName,
        status,
        contacts_count: contactsCount,
      },
    });

    return NextResponse.json(
      { campaign, message: 'Campaign created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing campaign:', error);
    return NextResponse.json(
      { error: 'Failed to process campaign' },
      { status: 500 }
    );
  }
}
