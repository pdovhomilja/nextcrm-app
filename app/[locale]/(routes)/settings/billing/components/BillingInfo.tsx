"use client";

import { useState } from "react";
import { OrganizationPlan, OrganizationStatus, PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { PLANS } from "@/lib/subscription-plans";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Calendar, DollarSign, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import { PlanLimitIndicator } from "@/components/plan-limit-indicator";

interface BillingInfoProps {
  organization: {
    id: string;
    name: string;
    plan: OrganizationPlan;
    status: OrganizationStatus;
    stripeCustomerId: string | null;
  };
  subscription: {
    id: string;
    stripeSubscriptionId: string;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  } | null;
  paymentHistory: {
    id: string;
    stripePaymentIntentId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    description: string | null;
    receiptUrl: string | null;
    createdAt: Date;
  }[];
  usage: {
    users: number;
    contacts: number;
    storage: number;
    projects: number;
    documents: number;
  };
}

export function BillingInfo({ organization, subscription, paymentHistory, usage }: BillingInfoProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const currentPlan = PLANS[organization.plan];

  const handleManageSubscription = async () => {
    if (!organization.stripeCustomerId) {
      toast.error("No active subscription to manage");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post("/api/billing/create-portal-session");

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      toast.error(error.response?.data || "Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const variants: Record<SubscriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
      ACTIVE: "default",
      TRIALING: "secondary",
      PAST_DUE: "destructive",
      CANCELED: "outline",
      INCOMPLETE: "outline",
      INCOMPLETE_EXPIRED: "destructive",
      UNPAID: "destructive",
    };

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your active subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{currentPlan.name}</span>
                {subscription && getStatusBadge(subscription.status)}
              </div>
              <div className="text-3xl font-bold">
                ${currentPlan.price}
                {currentPlan.price > 0 && <span className="text-sm text-muted-foreground">/month</span>}
              </div>
            </div>

            {subscription && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Next billing date:</span>
                  <span className="font-medium">
                    {format(new Date(subscription.currentPeriodEnd), "PPP")}
                  </span>
                </div>
                {subscription.cancelAtPeriodEnd && (
                  <div className="text-sm text-destructive">
                    Subscription will be canceled at the end of the billing period
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-4">
              {organization.plan !== "FREE" && organization.stripeCustomerId && (
                <Button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() => router.push("/pricing")}
                variant="outline"
                className="w-full"
              >
                View All Plans
              </Button>
            </div>
          </CardContent>
        </Card>

        <PlanLimitIndicator plan={organization.plan} usage={usage} />
      </div>

      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your recent billing transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.description || "Payment"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), "PPP")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        ${(payment.amount / 100).toFixed(2)}
                      </p>
                      <Badge
                        variant={
                          payment.status === "SUCCEEDED"
                            ? "default"
                            : payment.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                    {payment.receiptUrl && (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                      >
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
