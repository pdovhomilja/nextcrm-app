/**
 * GET /api/integrations - List all integrations
 * POST /api/integrations - Create new integration credentials
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

    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const integrations = await prisma.integrations_Credentials.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        integration_type: true,
        integration_name: true,
        is_active: true,
        created_at: true,
        last_synced_at: true,
        sync_status: true,
        sync_error: true,
      },
    });

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
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

    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      integrationType,
      integrationName,
      accessToken,
      refreshToken,
      apiKey,
      apiSecret,
      customData,
    } = body;

    if (!integrationType || !integrationName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const integration = await prisma.integrations_Credentials.create({
      data: {
        user_id: user.id,
        integration_type: integrationType,
        integration_name: integrationName,
        access_token: accessToken,
        refresh_token: refreshToken,
        api_key: apiKey,
        api_secret: apiSecret,
        custom_data: customData,
        is_active: true,
      },
    });

    return NextResponse.json(
      { integration, message: 'Integration created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}
