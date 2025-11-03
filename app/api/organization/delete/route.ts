/**
 * Organization Deletion API
 * Soft delete with 30-day retention period
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-logger";
import crypto from "crypto";
import { rateLimited } from "@/middleware/with-rate-limit";

const DELETION_RETENTION_DAYS = 30;

async function handlePOST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { confirmationText, confirmationToken } = await request.json();

    // Get user with organization
    const user = await prismadb.users.findUnique({
      where: { id: session.user.id },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Only OWNER can delete organization
    if (user.organization_role !== "OWNER") {
      return NextResponse.json(
        { error: "Only organization owners can delete the organization" },
        { status: 403 }
      );
    }

    // Verify organization is not already scheduled for deletion
    if (user.organization.deleteScheduledAt) {
      return NextResponse.json(
        {
          error: "Organization is already scheduled for deletion",
          deleteScheduledAt: user.organization.deleteScheduledAt,
        },
        { status: 400 }
      );
    }

    // Verify confirmation text matches organization name
    if (confirmationText !== user.organization.name) {
      return NextResponse.json(
        { error: "Confirmation text does not match organization name" },
        { status: 400 }
      );
    }

    // Generate confirmation token if not provided
    if (!confirmationToken) {
      const token = crypto.randomBytes(32).toString("hex");
      return NextResponse.json({
        message: "Confirmation token generated",
        confirmationToken: token,
        requiresConfirmation: true,
      });
    }

    // Calculate deletion date (30 days from now)
    const deleteScheduledAt = new Date();
    deleteScheduledAt.setDate(deleteScheduledAt.getDate() + DELETION_RETENTION_DAYS);

    // Update organization status
    const updatedOrg = await prismadb.organizations.update({
      where: { id: user.organization.id },
      data: {
        status: "SUSPENDED",
        deleteScheduledAt,
      },
    });

    // Cancel Stripe subscription if exists
    if (user.organization.stripeCustomerId) {
      try {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const subscriptions = await stripe.subscriptions.list({
          customer: user.organization.stripeCustomerId,
          status: "active",
        });

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id);
        }
      } catch (stripeError) {
        console.error("Failed to cancel Stripe subscription:", stripeError);
        // Continue with deletion even if Stripe cancellation fails
      }
    }

    // Log deletion action
    await logAuditEvent({
      action: "DELETE",
      resource: "organization",
      resourceId: user.organization.id,
      changes: {
        status: "SUSPENDED",
        deleteScheduledAt: deleteScheduledAt.toISOString(),
        retentionDays: DELETION_RETENTION_DAYS,
      },
      context: {
        organizationId: user.organization.id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Organization scheduled for deletion on ${deleteScheduledAt.toLocaleDateString()}`,
      deleteScheduledAt: deleteScheduledAt.toISOString(),
      retentionDays: DELETION_RETENTION_DAYS,
      cancellationDeadline: deleteScheduledAt.toISOString(),
    });
  } catch (error) {
    console.error("Organization deletion error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Cancel scheduled deletion
async function handleDELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prismadb.users.findUnique({
      where: { id: session.user.id },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Only OWNER can cancel deletion
    if (user.organization_role !== "OWNER") {
      return NextResponse.json(
        { error: "Only organization owners can cancel deletion" },
        { status: 403 }
      );
    }

    // Verify organization is scheduled for deletion
    if (!user.organization.deleteScheduledAt) {
      return NextResponse.json(
        { error: "Organization is not scheduled for deletion" },
        { status: 400 }
      );
    }

    // Restore organization
    const updatedOrg = await prismadb.organizations.update({
      where: { id: user.organization.id },
      data: {
        status: "ACTIVE",
        deleteScheduledAt: null,
      },
    });

    // Log cancellation
    await logAuditEvent({
      action: "UPDATE",
      resource: "organization",
      resourceId: user.organization.id,
      changes: {
        action: "deletion_cancelled",
        status: "ACTIVE",
      },
      context: {
        organizationId: user.organization.id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Organization deletion cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel deletion error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Get deletion status
async function handleGET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prismadb.users.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            deleteScheduledAt: true,
          },
        },
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Only OWNER can view deletion status
    if (user.organization_role !== "OWNER") {
      return NextResponse.json(
        { error: "Only organization owners can view deletion status" },
        { status: 403 }
      );
    }

    const isScheduledForDeletion = !!user.organization.deleteScheduledAt;
    const daysRemaining = user.organization.deleteScheduledAt
      ? Math.ceil(
          (user.organization.deleteScheduledAt.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return NextResponse.json({
      organizationId: user.organization.id,
      organizationName: user.organization.name,
      status: user.organization.status,
      isScheduledForDeletion,
      deleteScheduledAt: user.organization.deleteScheduledAt,
      daysRemaining,
      canCancel: isScheduledForDeletion && daysRemaining && daysRemaining > 0,
    });
  } catch (error) {
    console.error("Get deletion status error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Apply rate limiting to all endpoints
export const GET = rateLimited(handleGET);
export const POST = rateLimited(handlePOST);
export const DELETE = rateLimited(handleDELETE);
