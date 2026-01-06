import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { tradingAccounts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { sendPurchaseConfirmation } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const userId = session.metadata?.userId;
      const tierId = session.metadata?.tierId;

      if (!userId || !tierId) {
        console.error("Missing metadata in checkout session:", session.id);
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      // Fetch user and tier
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      const tier = await db.query.accountTiers.findFirst({
        where: (tiers, { eq }) => eq(tiers.id, tierId),
      });

      if (!user || !tier) {
        console.error("User or tier not found:", { userId, tierId });
        return NextResponse.json({ error: "User or tier not found" }, { status: 404 });
      }

      // Generate unique account number
      const accountNumber = `AC${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Create trading account
      await db.insert(tradingAccounts).values({
        userId: user.id,
        tierId: tier.id,
        accountNumber,
        status: "active",
        phase: "evaluation_1",
        initialBalance: tier.accountSize.toString(),
        currentBalance: tier.accountSize.toString(),
        highWaterMark: tier.accountSize.toString(),
        totalProfit: "0.00",
        totalLoss: "0.00",
        currentDrawdown: "0.00",
        maxDrawdownReached: "0.00",
        drawdownThreshold: tier.maxDrawdown,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        tradingDaysCount: 0,
        profitTargetReached: false,
        minTradingDaysReached: false,
        activatedAt: new Date(),
      });

      console.log(`Created trading account ${accountNumber} for user ${user.email}`);

      // Send confirmation email
      const userName = user.firstName || user.email.split("@")[0];
      await sendPurchaseConfirmation({
        to: user.email,
        userName,
        accountNumber,
        tierName: tier.displayName,
        accountSize: tier.accountSize,
        price: tier.price,
      });
    } catch (error) {
      console.error("Error creating trading account:", error);
      return NextResponse.json(
        { error: "Failed to create trading account" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
