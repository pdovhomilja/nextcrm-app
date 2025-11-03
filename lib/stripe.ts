import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
  typescript: true,
});

export const getStripeCustomerByEmail = async (email: string) => {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  return customers.data[0];
};

export const createStripeCustomer = async ({
  email,
  name,
  organizationId,
}: {
  email: string;
  name?: string | null;
  organizationId: string;
}) => {
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      organizationId,
    },
  });

  return customer;
};

export const getOrCreateStripeCustomer = async ({
  email,
  name,
  organizationId,
}: {
  email: string;
  name?: string | null;
  organizationId: string;
}) => {
  let customer = await getStripeCustomerByEmail(email);

  if (!customer) {
    customer = await createStripeCustomer({ email, name, organizationId });
  }

  return customer;
};

export const getStripeSubscription = async (subscriptionId: string) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
};
