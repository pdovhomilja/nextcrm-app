/**
 * GET /api/integrations/logs - Get sync logs
 * POST /api/integrations/logs - Create a new sync log
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
    const integrationType = searchParams.get('integrationType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (integrationType) {
      where.integration_type = integrationType;
    }

    const logs = await prisma.integrations_Sync_Logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.integrations_Sync_Logs.count({ where });

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      integrationType,
      syncType,
      status,
      totalRecords,
      syncedRecords,
      failedRecords,
      errorMessage,
      durationMs,
    } = body;

    if (!integrationType || !syncType || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const log = await prisma.integrations_Sync_Logs.create({
      data: {
        integration_type: integrationType,
        sync_type: syncType,
        status,
        total_records: totalRecords || 0,
        synced_records: syncedRecords || 0,
        failed_records: failedRecords || 0,
        error_message: errorMessage,
        duration_ms: durationMs,
        completed_at: new Date(),
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('Error creating log:', error);
    return NextResponse.json(
      { error: 'Failed to create log' },
      { status: 500 }
    );
  }
}
