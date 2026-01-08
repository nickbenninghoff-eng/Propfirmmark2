import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { tradingAccounts, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Verify reset checkout session and reset account if webhook didn't fire
 * This is a fallback for local development when Stripe webhooks can't reach localhost
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("session_id");
  const accountId = searchParams.get("account_id");

  if (!sessionId || !accountId) {
    return NextResponse.redirect(new URL(`/accounts/${accountId}?error=missing_params`, request.url));
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      return NextResponse.redirect(new URL(`/accounts/${accountId}?error=payment_not_complete`, request.url));
    }

    const { userId, type } = session.metadata || {};

    if (!userId || type !== "account_reset") {
      return NextResponse.redirect(new URL(`/accounts/${accountId}?error=invalid_session`, request.url));
    }

    // Check for existing transaction with this payment intent
    const existingTransaction = await db.query.transactions.findFirst({
      where: eq(transactions.stripePaymentIntentId, session.payment_intent as string),
    });

    if (existingTransaction) {
      // Reset was already processed by webhook, just redirect
      return NextResponse.redirect(new URL(`/accounts/${accountId}?reset=success`, request.url));
    }

    // Get the account with tier info
    const account = await db.query.tradingAccounts.findFirst({
      where: eq(tradingAccounts.id, accountId),
      with: { tier: true },
    });

    if (!account) {
      return NextResponse.redirect(new URL(`/dashboard?error=account_not_found`, request.url));
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

    console.log(`Account reset via verify endpoint: ${account.accountNumber} for user ${userId}`);

    return NextResponse.redirect(new URL(`/accounts/${accountId}?reset=success`, request.url));
  } catch (error) {
    console.error("Reset verification error:", error);
    return NextResponse.redirect(new URL(`/accounts/${accountId}?error=verification_failed`, request.url));
  }
}
