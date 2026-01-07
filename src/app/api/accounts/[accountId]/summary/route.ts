import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tradingAccounts, orders } from "@/lib/db/schema";
import { getOpenPositions } from "@/server/services/position-service";
import { eq, inArray, and } from "drizzle-orm";

/**
 * GET /api/accounts/{accountId}/summary
 * Get comprehensive account summary for trading dashboard
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = await params;

    // Get account with tier
    const account = await db.query.tradingAccounts.findFirst({
      where: eq(tradingAccounts.id, accountId),
      with: { tier: true },
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

    // Get open orders
    const openOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.tradingAccountId, accountId),
        inArray(orders.status, ["pending", "submitted", "working", "partial"])
      ),
      with: {
        executions: true,
      },
    });

    // Calculate margin usage
    const currentBalance = Number(account.currentBalance);
    const initialBalance = Number(account.initialBalance);
    const equity = currentBalance + totalUnrealizedPnl;
    const usedMargin = Number(account.usedMargin);
    const availableMargin = Number(account.availableMargin);
    const marginUtilization = availableMargin > 0 ? (usedMargin / (usedMargin + availableMargin)) * 100 : 0;

    // Calculate rule compliance
    const currentDrawdown = Number(account.currentDrawdown);
    const maxDrawdown = account.tier ? Number(account.tier.maxDrawdown) : 0;
    const drawdownPercentage = maxDrawdown > 0 ? (currentDrawdown / maxDrawdown) * 100 : 0;

    const profitTarget = account.tier ? Number(account.tier.profitTarget) : 0;
    const totalProfit = currentBalance - initialBalance;
    const profitTargetProgress = profitTarget > 0 ? (totalProfit / profitTarget) * 100 : 0;

    const dailyPnl = Number(account.dailyPnl);
    const dailyLossLimit = account.tier ? Number(account.tier.dailyLossLimit) : 0;
    const dailyLossPercentage = dailyLossLimit > 0 ? (Math.abs(dailyPnl) / dailyLossLimit) * 100 : 0;

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        status: account.status,
        isSimulated: account.isSimulated,
        initialBalance,
        currentBalance,
        equity,
        dailyPnl,
        dailyLossLimitHit: account.dailyLossLimitHit,
        profitTargetReached: account.profitTargetReached,
        failureReason: account.failureReason,
      },
      margin: {
        usedMargin,
        availableMargin,
        marginUtilization,
      },
      positions: {
        count: positions.length,
        positions: positions,
        totalUnrealizedPnl,
        totalRealizedPnl,
        totalPnl,
      },
      orders: {
        count: openOrders.length,
        orders: openOrders,
      },
      ruleCompliance: {
        drawdown: {
          current: currentDrawdown,
          max: maxDrawdown,
          percentage: drawdownPercentage,
          status: drawdownPercentage >= 100 ? "violated" : drawdownPercentage >= 80 ? "warning" : "ok",
        },
        profitTarget: {
          target: profitTarget,
          current: totalProfit,
          percentage: profitTargetProgress,
          reached: account.profitTargetReached,
        },
        dailyLoss: {
          current: dailyPnl,
          limit: dailyLossLimit,
          percentage: dailyLossPercentage,
          hit: account.dailyLossLimitHit,
          status: account.dailyLossLimitHit ? "violated" : dailyLossPercentage >= 80 ? "warning" : "ok",
        },
      },
      tier: account.tier ? {
        name: account.tier.name,
        maxContractsPerTrade: account.tier.maxContractsPerTrade,
        maxOpenContracts: account.tier.maxOpenContracts,
        maxDrawdown: account.tier.maxDrawdown,
        dailyLossLimit: account.tier.dailyLossLimit,
        profitTarget: account.tier.profitTarget,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching account summary:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch account summary",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
