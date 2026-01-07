import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, tradingAccounts } from "@/lib/db/schema";
import { submitOrder } from "@/server/services/order-execution-service";
import { eq, and, inArray, desc } from "drizzle-orm";

/**
 * GET /api/orders?accountId={accountId}&status={status}
 * Fetch orders for an account with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status");

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    // Verify account ownership
    const account = await db.query.tradingAccounts.findFirst({
      where: eq(tradingAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Verify user owns this account (or is admin)
    if (account.userId !== session.user.id && session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build query conditions
    const conditions = [eq(orders.tradingAccountId, accountId)];

    // Add status filter if provided
    if (status) {
      const statuses = status.split(",").map(s => s.trim());
      conditions.push(inArray(orders.status, statuses as any));
    }

    // Fetch orders with executions
    const accountOrders = await db.query.orders.findMany({
      where: and(...conditions),
      with: {
        executions: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      orders: accountOrders,
      count: accountOrders.length,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch orders",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Submit a new order
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountId,
      symbol,
      orderType,
      side,
      quantity,
      limitPrice,
      stopPrice,
      trailAmount,
      timeInForce,
    } = body;

    // Validate required fields
    if (!accountId || !symbol || !orderType || !side || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, symbol, orderType, side, quantity" },
        { status: 400 }
      );
    }

    // Validate order type
    if (!["market", "limit", "stop", "stop_limit", "trailing_stop"].includes(orderType)) {
      return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
    }

    // Validate side
    if (!["buy", "sell"].includes(side)) {
      return NextResponse.json({ error: "Invalid side (must be buy or sell)" }, { status: 400 });
    }

    // Validate quantity
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: "Quantity must be a positive integer" }, { status: 400 });
    }

    // Validate limit price for limit orders
    if ((orderType === "limit" || orderType === "stop_limit") && !limitPrice) {
      return NextResponse.json({ error: "Limit price required for limit orders" }, { status: 400 });
    }

    // Validate stop price for stop orders
    if ((orderType === "stop" || orderType === "stop_limit" || orderType === "trailing_stop") && !stopPrice) {
      return NextResponse.json({ error: "Stop price required for stop orders" }, { status: 400 });
    }

    // Validate trail amount for trailing stop
    if (orderType === "trailing_stop" && !trailAmount) {
      return NextResponse.json({ error: "Trail amount required for trailing stop orders" }, { status: 400 });
    }

    // Verify account ownership
    const account = await db.query.tradingAccounts.findFirst({
      where: eq(tradingAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Verify user owns this account (or is admin)
    if (account.userId !== session.user.id && session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if account is active
    if (account.status === "failed" || account.status === "suspended" || account.status === "expired") {
      return NextResponse.json(
        { error: `Account is ${account.status}. Cannot place orders.` },
        { status: 403 }
      );
    }

    // Check if daily loss limit hit
    if (account.dailyLossLimitHit) {
      return NextResponse.json(
        { error: "Daily loss limit has been hit. No new trades allowed today." },
        { status: 403 }
      );
    }

    // Get client IP
    const placedFromIp = request.headers.get("x-forwarded-for") ||
                         request.headers.get("x-real-ip") ||
                         "unknown";

    // Submit order via execution service
    const result = await submitOrder({
      accountId,
      symbol,
      orderType,
      side,
      quantity,
      limitPrice: limitPrice ? Number(limitPrice) : undefined,
      stopPrice: stopPrice ? Number(stopPrice) : undefined,
      trailAmount: trailAmount ? Number(trailAmount) : undefined,
      timeInForce: timeInForce || "day",
      placedFromIp,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          validationResult: result.validationResult,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      message: "Order submitted successfully",
      validationResult: result.validationResult,
      executionDetails: result.executionDetails,
    });
  } catch (error) {
    console.error("Error submitting order:", error);
    return NextResponse.json(
      {
        error: "Failed to submit order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
