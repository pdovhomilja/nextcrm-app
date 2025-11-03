import { OrganizationPlan } from "@prisma/client";

export interface PlanFeature {
  name: string;
  price: number;
  stripePriceId: string | null;
  features: string[];
  limits: {
    users: number;
    contacts: number;
    storage: number;
    projects: number;
    documents: number;
  };
  popular?: boolean;
}

export type Plans = {
  [key in OrganizationPlan]: PlanFeature;
};

export const PLANS: Plans = {
  FREE: {
    name: "Free",
    price: 0,
    stripePriceId: null,
    features: [
      "5 users",
      "100 contacts",
      "1GB storage",
      "5 projects",
      "100 documents",
      "Basic CRM",
      "Email support",
    ],
    limits: {
      users: 5,
      contacts: 100,
      storage: 1024 * 1024 * 1024,
      projects: 5,
      documents: 100,
    },
  },
  PRO: {
    name: "Pro",
    price: 29,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "",
    features: [
      "Unlimited users",
      "10,000 contacts",
      "100GB storage",
      "Unlimited projects",
      "10,000 documents",
      "Advanced CRM",
      "Email integration",
      "Priority support",
      "Custom fields",
      "API access",
    ],
    limits: {
      users: -1,
      contacts: 10000,
      storage: 100 * 1024 * 1024 * 1024,
      projects: -1,
      documents: 10000,
    },
    popular: true,
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 99,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "",
    features: [
      "Everything in Pro",
      "Unlimited contacts",
      "1TB storage",
      "Unlimited documents",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Advanced security",
      "Custom branding",
      "SSO integration",
      "Audit logs",
    ],
    limits: {
      users: -1,
      contacts: -1,
      storage: 1024 * 1024 * 1024 * 1024,
      projects: -1,
      documents: -1,
    },
  },
};

export const getPlanLimits = (plan: OrganizationPlan) => {
  return PLANS[plan].limits;
};

export const isPlanFeatureAvailable = (
  currentPlan: OrganizationPlan,
  requiredPlan: OrganizationPlan
): boolean => {
  const planHierarchy = ["FREE", "PRO", "ENTERPRISE"];
  const currentIndex = planHierarchy.indexOf(currentPlan);
  const requiredIndex = planHierarchy.indexOf(requiredPlan);
  return currentIndex >= requiredIndex;
};

export const canUpgradeToPlan = (
  currentPlan: OrganizationPlan,
  targetPlan: OrganizationPlan
): boolean => {
  const planHierarchy = ["FREE", "PRO", "ENTERPRISE"];
  const currentIndex = planHierarchy.indexOf(currentPlan);
  const targetIndex = planHierarchy.indexOf(targetPlan);
  return targetIndex > currentIndex;
};
