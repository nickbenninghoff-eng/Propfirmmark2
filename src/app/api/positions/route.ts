import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tradingAccounts } from "@/lib/db/schema";
import { getOpenPositions, closePosition } from "@/server/services/position-service";
import { submitOrder } from "@/server/services/order-execution-service";
import { eq } from "drizzle-orm";

/**
 * GET /api/positions?accountId={accountId}
 * Get all open positions for an account
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");

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

    // Get open positions
    const positions = await getOpenPositions(accountId);

    // Calculate total unrealized P&L
    const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
    const totalRealizedPnl = positions.reduce((sum, pos) => sum + pos.realizedPnl, 0);
    const totalPnl = positions.reduce((sum, pos) => sum + pos.totalPnl, 0);

    return NextResponse.json({
      success: true,
      positions,
      summary: {
        totalPositions: positions.length,
        totalUnrealizedPnl,
        totalRealizedPnl,
        totalPnl,
      },
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch positions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/positions/close
 * Close a position at market price
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, symbol } = body;

    if (!accountId || !symbol) {
      return NextResponse.json(
        { error: "accountId and symbol are required" },
        { status: 400 }
      );
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

    // Get positions to determine close side and quantity
    const positions = await getOpenPositions(accountId);
    const position = positions.find(p => p.symbol === symbol);

    if (!position) {
      return NextResponse.json(
        { error: "No open position found for this symbol" },
        { status: 404 }
      );
    }

    // Determine close side (opposite of position direction)
    const closeSide = position.quantity > 0 ? "sell" : "buy";
    const closeQuantity = Math.abs(position.quantity);

    // Get client IP
    const placedFromIp = request.headers.get("x-forwarded-for") ||
                         request.headers.get("x-real-ip") ||
                         "unknown";

    // Submit market order to close position
    const result = await submitOrder({
      accountId,
      symbol,
      orderType: "market",
      side: closeSide,
      quantity: closeQuantity,
      timeInForce: "ioc", // Immediate or cancel
      placedFromIp,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Position closed successfully",
      orderId: result.orderId,
      position: {
        symbol,
        closedQuantity: closeQuantity,
        closeSide,
      },
    });
  } catch (error) {
    console.error("Error closing position:", error);
    return NextResponse.json(
      {
        error: "Failed to close position",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
