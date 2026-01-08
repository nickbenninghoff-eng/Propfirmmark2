import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { accountTiers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tierId } = await request.json();

    if (!tierId) {
      return NextResponse.json({ error: "Tier ID is required" }, { status: 400 });
    }

    // Fetch fresh user email from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch the tier
    const tier = await db.query.accountTiers.findFirst({
      where: eq(accountTiers.id, tierId),
    });

    if (!tier || !tier.isActive) {
      return NextResponse.json({ error: "Tier not found or inactive" }, { status: 404 });
    }

    // Get base URL from request headers (works for any port/host)
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: tier.displayName,
              description: tier.description || `${tier.displayName} trading account evaluation`,
              metadata: {
                tierId: tier.id,
                accountSize: tier.accountSize.toString(),
              },
            },
            unit_amount: Math.round(parseFloat(tier.price) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/api/checkout/verify?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/accounts/purchase?canceled=true`,
      metadata: {
        userId: session.user.id,
        tierId: tier.id,
        tierName: tier.name,
        type: "account_purchase",
      },
    });

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
