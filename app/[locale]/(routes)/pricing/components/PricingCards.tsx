"use client";

import { useState } from "react";
import { OrganizationPlan } from "@prisma/client";
import { PLANS } from "@/lib/subscription-plans";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";

interface PricingCardsProps {
  currentPlan: OrganizationPlan;
}

export function PricingCards({ currentPlan }: PricingCardsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<OrganizationPlan | null>(null);

  const handleUpgrade = async (plan: OrganizationPlan) => {
    if (plan === "FREE") {
      return;
    }

    try {
      setLoading(plan);
      const response = await axios.post("/api/billing/create-checkout-session", {
        plan,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      toast.error(error.response?.data || "Failed to create checkout session");
    } finally {
      setLoading(null);
    }
  };

  const getButtonText = (plan: OrganizationPlan) => {
    if (plan === currentPlan) {
      return "Current Plan";
    }
    if (plan === "FREE") {
      return "Get Started";
    }
    const planHierarchy = ["FREE", "PRO", "ENTERPRISE"];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const targetIndex = planHierarchy.indexOf(plan);

    if (targetIndex > currentIndex) {
      return "Upgrade";
    }
    return "Contact Sales";
  };

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto py-8">
      {Object.entries(PLANS).map(([key, plan]) => {
        const planKey = key as OrganizationPlan;
        const isCurrent = planKey === currentPlan;
        const isPopular = plan.popular;

        return (
          <Card
            key={planKey}
            className={`relative flex flex-col ${isPopular ? "border-primary shadow-lg scale-105" : ""}`}
          >
            {isPopular && (
              <div className="absolute -top-4 left-0 right-0 flex justify-center">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-4xl font-bold">${plan.price}</span>
                {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={isCurrent ? "outline" : isPopular ? "default" : "outline"}
                disabled={isCurrent || loading !== null}
                onClick={() => handleUpgrade(planKey)}
              >
                {loading === planKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  getButtonText(planKey)
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
