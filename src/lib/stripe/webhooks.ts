import { getStripe } from "./index";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { tradingAccounts, transactions, accountTiers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }

  return getStripe().webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const { userId, tierId, accountId, type } = session.metadata || {};

  if (!userId) {
    console.error("No userId in session metadata");
    return;
  }

  if (type === "account_purchase" && tierId) {
    await handleAccountPurchase(session, userId, tierId);
  } else if (type === "account_reset" && accountId) {
    await handleAccountReset(session, userId, accountId);
  }
}

async function handleAccountPurchase(
  session: Stripe.Checkout.Session,
  userId: string,
  tierId: string
) {
  // Get the tier details
  const tier = await db.query.accountTiers.findFirst({
    where: eq(accountTiers.id, tierId),
  });

  if (!tier) {
    console.error(`Tier not found: ${tierId}`);
    return;
  }

  // Generate account number
  const accountNumber = generateAccountNumber(tier.accountSize);

  // Create the trading account
  const [newAccount] = await db
    .insert(tradingAccounts)
    .values({
      userId,
      tierId,
      accountNumber,
      status: "pending_activation",
      phase: "evaluation_1",
      initialBalance: tier.accountSize.toString(),
      currentBalance: tier.accountSize.toString(),
      highWaterMark: tier.accountSize.toString(),
      drawdownThreshold: (tier.accountSize - Number(tier.maxDrawdown)).toString(),
    })
    .returning();

  // Create transaction record
  await db.insert(transactions).values({
    userId,
    tradingAccountId: newAccount.id,
    type: "account_purchase",
    status: "completed",
    amount: session.amount_total ? (session.amount_total / 100).toString() : "0",
    currency: session.currency || "usd",
    stripePaymentIntentId: session.payment_intent as string,
    description: `${tier.displayName} purchase`,
    completedAt: new Date(),
  });

  console.log(`Account created: ${accountNumber} for user ${userId}`);
}

async function handleAccountReset(
  session: Stripe.Checkout.Session,
  userId: string,
  accountId: string
) {
  // Get the account
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
    with: {
      tier: true,
    },
  });

  if (!account) {
    console.error(`Account not found: ${accountId}`);
    return;
  }

  // Reset the account
  await db
    .update(tradingAccounts)
    .set({
      status: "pending_activation",
      currentBalance: account.initialBalance,
      highWaterMark: account.initialBalance,
      totalProfit: "0",
      totalLoss: "0",
      currentDrawdown: "0",
      maxDrawdownReached: "0",
      drawdownThreshold: (
        Number(account.initialBalance) - Number(account.tier.maxDrawdown)
      ).toString(),
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      tradingDaysCount: 0,
      profitTargetReached: false,
      profitTargetReachedAt: null,
      minTradingDaysReached: false,
      failureReason: null,
      failedAt: null,
      resetCount: account.resetCount + 1,
      lastResetAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId));

  // Create transaction record
  await db.insert(transactions).values({
    userId,
    tradingAccountId: accountId,
    type: "account_reset",
    status: "completed",
    amount: session.amount_total ? (session.amount_total / 100).toString() : "0",
    currency: session.currency || "usd",
    stripePaymentIntentId: session.payment_intent as string,
    description: `Account reset for ${account.accountNumber}`,
    completedAt: new Date(),
  });

  console.log(`Account reset: ${account.accountNumber} for user ${userId}`);
}

export async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
) {
  const { userId, tierId, accountId, type } = paymentIntent.metadata || {};

  console.error(
    `Payment failed for user ${userId}, type: ${type}, error: ${paymentIntent.last_payment_error?.message}`
  );

  // Could send notification to user here
}

function generateAccountNumber(accountSize: number): string {
  const sizeCode = `${accountSize / 1000}K`;
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PF-${sizeCode}-${randomPart}`;
}
