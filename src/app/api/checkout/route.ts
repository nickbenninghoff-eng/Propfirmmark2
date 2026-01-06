import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCheckoutSession, createResetCheckoutSession } from "@/lib/stripe/checkout";
import { db } from "@/lib/db";
import { accountTiers, tradingAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tierId, accountId, type = "purchase" } = body;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (type === "purchase") {
      if (!tierId) {
        return NextResponse.json(
          { error: "Tier ID is required" },
          { status: 400 }
        );
      }

      // Get tier details
      const tier = await db.query.accountTiers.findFirst({
        where: eq(accountTiers.id, tierId),
      });

      if (!tier) {
        return NextResponse.json(
          { error: "Tier not found" },
          { status: 404 }
        );
      }

      if (!tier.isActive) {
        return NextResponse.json(
          { error: "This tier is not currently available" },
          { status: 400 }
        );
      }

      const checkoutSession = await createCheckoutSession({
        tierId: tier.id,
        tierName: tier.displayName,
        price: Number(tier.price),
        userId: session.user.id,
        userEmail: session.user.email,
        successUrl: `${baseUrl}/dashboard?checkout=success`,
        cancelUrl: `${baseUrl}/accounts/purchase?checkout=cancelled`,
      });

      return NextResponse.json({ url: checkoutSession.url });
    } else if (type === "reset") {
      if (!accountId) {
        return NextResponse.json(
          { error: "Account ID is required" },
          { status: 400 }
        );
      }

      // Get account details
      const account = await db.query.tradingAccounts.findFirst({
        where: eq(tradingAccounts.id, accountId),
        with: {
          tier: true,
        },
      });

      if (!account) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }

      if (account.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }

      const checkoutSession = await createResetCheckoutSession({
        accountId: account.id,
        tierName: account.tier.displayName,
        resetPrice: Number(account.tier.resetPrice),
        userId: session.user.id,
        userEmail: session.user.email,
        successUrl: `${baseUrl}/accounts/${account.id}?reset=success`,
        cancelUrl: `${baseUrl}/accounts/${account.id}?reset=cancelled`,
      });

      return NextResponse.json({ url: checkoutSession.url });
    }

    return NextResponse.json(
      { error: "Invalid checkout type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
