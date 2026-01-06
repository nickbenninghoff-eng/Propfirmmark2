import { getStripe } from "./index";

interface CreateCheckoutSessionParams {
  tierId: string;
  tierName: string;
  price: number;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
  promoCode?: string;
}

export async function createCheckoutSession({
  tierId,
  tierName,
  price,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
  promoCode,
}: CreateCheckoutSessionParams) {
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: tierName,
            description: "Prop Trading Evaluation Account",
          },
          unit_amount: Math.round(price * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tierId,
      type: "account_purchase",
    },
    allow_promotion_codes: true,
    ...(promoCode && { discounts: [{ coupon: promoCode }] }),
  });

  return session;
}

interface CreateResetCheckoutSessionParams {
  accountId: string;
  tierName: string;
  resetPrice: number;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createResetCheckoutSession({
  accountId,
  tierName,
  resetPrice,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: CreateResetCheckoutSessionParams) {
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${tierName} - Reset`,
            description: "Account Reset Fee",
          },
          unit_amount: Math.round(resetPrice * 100),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      accountId,
      type: "account_reset",
    },
  });

  return session;
}

export async function getCheckoutSession(sessionId: string) {
  return getStripe().checkout.sessions.retrieve(sessionId);
}

export async function createOrRetrieveCustomer(email: string, name?: string) {
  // Check if customer already exists
  const existingCustomers = await getStripe().customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return getStripe().customers.create({
    email,
    name,
  });
}
