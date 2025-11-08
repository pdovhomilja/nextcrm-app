/**
 * POST /api/integrations/sync - Trigger sync for an integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { XeroIntegrationService } from '@/lib/integrations/xero';
import { StripeIntegrationService } from '@/lib/integrations/stripe';
import { PayPalIntegrationService } from '@/lib/integrations/paypal';

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
    const { integrationId, dataType = 'all' } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Missing integration ID' },
        { status: 400 }
      );
    }

    const integration = await prisma.integrations_Credentials.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    if (!integration.is_active) {
      return NextResponse.json(
        { error: 'Integration is not active' },
        { status: 400 }
      );
    }

    // Update sync status to SYNCING
    await prisma.integrations_Credentials.update({
      where: { id: integrationId },
      data: { sync_status: 'SYNCING' },
    });

    // Get the appropriate service and sync
    let result;
    try {
      if (integration.integration_type === 'XERO') {
        const service = new XeroIntegrationService(integration as any);
        result = await service.syncData(dataType);
      } else if (integration.integration_type === 'STRIPE') {
        const service = new StripeIntegrationService(integration as any);
        result = await service.syncData(dataType);
      } else if (integration.integration_type === 'PAYPAL') {
        const service = new PayPalIntegrationService(integration as any);
        result = await service.syncData(dataType);
      } else {
        throw new Error(`Unsupported integration type: ${integration.integration_type}`);
      }

      // Update sync status
      await prisma.integrations_Credentials.update({
        where: { id: integrationId },
        data: {
          sync_status: result.success ? 'SUCCESS' : 'ERROR',
          sync_error: result.success ? null : result.message,
          last_synced_at: new Date(),
        },
      });

      return NextResponse.json({ result });
    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';

      await prisma.integrations_Credentials.update({
        where: { id: integrationId },
        data: {
          sync_status: 'ERROR',
          sync_error: errorMessage,
        },
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error syncing integration:', error);
    return NextResponse.json(
      { error: 'Failed to sync integration' },
      { status: 500 }
    );
  }
}
