import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { tradingAccounts, transactions, accountTiers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Verify checkout session and create account if webhook didn't fire
 * This is a fallback for local development when Stripe webhooks can't reach localhost
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_session", request.url));
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      return NextResponse.redirect(new URL("/dashboard?error=payment_not_complete", request.url));
    }

    const { userId, tierId, type } = session.metadata || {};

    // Validate metadata - type is optional for backward compatibility
    if (!userId || !tierId) {
      return NextResponse.redirect(new URL("/dashboard?error=invalid_session", request.url));
    }

    // If type is specified, it should be account_purchase (not reset)
    if (type && type !== "account_purchase") {
      return NextResponse.redirect(new URL("/dashboard?error=invalid_session_type", request.url));
    }

    // Check for existing transaction with this payment intent (prevents duplicates)
    const existingTransaction = await db.query.transactions.findFirst({
      where: eq(transactions.stripePaymentIntentId, session.payment_intent as string),
    });

    if (existingTransaction) {
      // Account was already created by webhook, just redirect
      return NextResponse.redirect(new URL("/dashboard?checkout=success", request.url));
    }

    // Get tier details
    const tier = await db.query.accountTiers.findFirst({
      where: eq(accountTiers.id, tierId),
    });

    if (!tier) {
      return NextResponse.redirect(new URL("/dashboard?error=tier_not_found", request.url));
    }

    // Generate account number
    const sizeCode = `${tier.accountSize / 1000}K`;
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const accountNumber = `PF-${sizeCode}-${randomPart}`;

    // Create the trading account
    const [newAccount] = await db
      .insert(tradingAccounts)
      .values({
        userId,
        tierId,
        accountNumber,
        status: "active",
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

    console.log(`Account created via verify endpoint: ${accountNumber} for user ${userId}`);

    return NextResponse.redirect(new URL("/dashboard?checkout=success", request.url));
  } catch (error) {
    console.error("Checkout verification error:", error);
    return NextResponse.redirect(new URL("/dashboard?error=verification_failed", request.url));
  }
}
