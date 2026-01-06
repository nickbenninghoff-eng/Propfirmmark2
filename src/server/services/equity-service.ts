/**
 * Equity Service
 *
 * Handles equity curve data generation and metrics calculation
 * for trading journal charts and analytics.
 */

import { db } from "@/lib/db";
import { accountEquitySnapshots, tradingAccounts, trades, dailySnapshots } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { format } from "date-fns";

export interface EquityDataPoint {
  timestamp: string;
  balance: number;
  equity: number;
  unrealizedPnl: number;
}

export interface EquityMetrics {
  sharpeRatio: number;
  profitFactor: number;
  winRate: number;
  avgWinLoss: string;
  largestWin: number;
  largestLoss: number;
  maxDrawdown: number;
  totalTrades: number;
  expectancy: number;
}

/**
 * Get equity curve data for charts
 */
export async function getEquityCurveData(
  accountId: string,
  startDate?: Date,
  endDate?: Date
): Promise<EquityDataPoint[]> {
  const conditions = [eq(accountEquitySnapshots.tradingAccountId, accountId)];

  if (startDate) {
    conditions.push(gte(accountEquitySnapshots.timestamp, startDate));
  }

  if (endDate) {
    conditions.push(lte(accountEquitySnapshots.timestamp, endDate));
  }

  const snapshots = await db.query.accountEquitySnapshots.findMany({
    where: and(...conditions),
    orderBy: (snapshots, { asc }) => [asc(snapshots.timestamp)],
  });

  return snapshots.map((snapshot) => ({
    timestamp: snapshot.timestamp.toISOString(),
    balance: Number(snapshot.balance),
    equity: Number(snapshot.equity),
    unrealizedPnl: Number(snapshot.unrealizedPnl),
  }));
}

/**
 * Calculate equity metrics for analytics
 */
export async function calculateEquityMetrics(
  accountId: string
): Promise<EquityMetrics> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  // Get all closed trades
  const closedTrades = await db.query.trades.findMany({
    where: and(
      eq(trades.tradingAccountId, accountId),
      eq(trades.isOpen, false)
    ),
    orderBy: (trades, { asc }) => [asc(trades.entryTime)],
  });

  if (closedTrades.length === 0) {
    return {
      sharpeRatio: 0,
      profitFactor: 0,
      winRate: 0,
      avgWinLoss: "0",
      largestWin: 0,
      largestLoss: 0,
      maxDrawdown: 0,
      totalTrades: 0,
      expectancy: 0,
    };
  }

  // Calculate metrics
  const pnls = closedTrades.map((trade) => Number(trade.pnl || 0));
  const winners = pnls.filter((pnl) => pnl > 0);
  const losers = pnls.filter((pnl) => pnl < 0);

  const totalProfit = winners.reduce((sum, pnl) => sum + pnl, 0);
  const totalLoss = Math.abs(losers.reduce((sum, pnl) => sum + pnl, 0));

  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
  const winRate = (winners.length / closedTrades.length) * 100;

  const avgWin = winners.length > 0 ? totalProfit / winners.length : 0;
  const avgLoss = losers.length > 0 ? totalLoss / losers.length : 0;
  const avgWinLoss = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "0";

  const largestWin = winners.length > 0 ? Math.max(...winners) : 0;
  const largestLoss = losers.length > 0 ? Math.min(...losers) : 0;

  // Calculate Sharpe ratio (simplified)
  const avgReturn = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;
  const stdDev = Math.sqrt(
    pnls.reduce((sum, pnl) => sum + Math.pow(pnl - avgReturn, 2), 0) /
      pnls.length
  );
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Expectancy
  const winProb = winners.length / closedTrades.length;
  const lossProb = losers.length / closedTrades.length;
  const expectancy = winProb * avgWin - lossProb * avgLoss;

  // Max drawdown
  const maxDrawdown = Number(account.maxDrawdownReached);

  return {
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    winRate: Number(winRate.toFixed(1)),
    avgWinLoss,
    largestWin,
    largestLoss,
    maxDrawdown,
    totalTrades: closedTrades.length,
    expectancy: Number(expectancy.toFixed(2)),
  };
}

/**
 * Create an equity snapshot
 */
export async function createEquitySnapshot(
  accountId: string,
  snapshotType: "trade_close" | "eod" | "manual"
): Promise<void> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  // Get open trades to calculate unrealized P&L (if any)
  const openTrades = await db.query.trades.findMany({
    where: and(eq(trades.tradingAccountId, accountId), eq(trades.isOpen, true)),
  });

  const unrealizedPnl = openTrades.reduce(
    (sum, trade) => sum + Number(trade.pnl || 0),
    0
  );

  const currentBalance = Number(account.currentBalance);
  const equity = currentBalance + unrealizedPnl;

  await db.insert(accountEquitySnapshots).values({
    tradingAccountId: accountId,
    timestamp: new Date(),
    balance: currentBalance.toString(),
    equity: equity.toString(),
    unrealizedPnl: unrealizedPnl.toString(),
    snapshotType,
  });
}

/**
 * Backfill equity snapshots from existing trades
 */
export async function backfillEquitySnapshots(
  accountId: string
): Promise<number> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  // Get all closed trades in chronological order
  const closedTrades = await db.query.trades.findMany({
    where: and(
      eq(trades.tradingAccountId, accountId),
      eq(trades.isOpen, false)
    ),
    orderBy: (trades, { asc }) => [asc(trades.exitTime)],
  });

  if (closedTrades.length === 0) {
    return 0;
  }

  let runningBalance = Number(account.initialBalance);
  const snapshots = [];

  // Create snapshot for each trade close
  for (const trade of closedTrades) {
    if (!trade.exitTime) continue;

    runningBalance += Number(trade.pnl || 0);

    snapshots.push({
      tradingAccountId: accountId,
      timestamp: trade.exitTime,
      balance: runningBalance.toString(),
      equity: runningBalance.toString(),
      unrealizedPnl: "0",
      snapshotType: "trade_close" as const,
    });
  }

  // Batch insert snapshots
  if (snapshots.length > 0) {
    await db.insert(accountEquitySnapshots).values(snapshots);
  }

  return snapshots.length;
}

/**
 * Get daily P&L data for calendar heatmap
 */
export async function getDailyPnLData(
  accountId: string,
  month?: Date
): Promise<Array<{ date: string; pnl: number; trades: number; notes?: string | null }>> {
  let conditions = [eq(trades.tradingAccountId, accountId)];

  // If month is specified, filter by that month
  if (month) {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
    conditions.push(gte(trades.exitTime, monthStart));
    conditions.push(lte(trades.exitTime, monthEnd));
  }

  // Fetch all trades (or for the specified month)
  const monthTrades = await db.query.trades.findMany({
    where: and(...conditions),
    orderBy: (trades, { asc }) => [asc(trades.exitTime)],
  });

  // Group trades by date and calculate daily P&L
  const dailyData = new Map<string, { pnl: number; trades: number }>();

  for (const trade of monthTrades) {
    if (!trade.exitTime || !trade.netPnl) continue;

    const dateStr = format(trade.exitTime, "yyyy-MM-dd");
    const existing = dailyData.get(dateStr) || { pnl: 0, trades: 0 };

    dailyData.set(dateStr, {
      pnl: existing.pnl + Number(trade.netPnl),
      trades: existing.trades + 1,
    });
  }

  // Fetch daily snapshots to get notes
  const snapshots = await db.query.dailySnapshots.findMany({
    where: eq(dailySnapshots.tradingAccountId, accountId),
  });

  // Create a map of date to notes
  const notesMap = new Map<string, string | null>();
  for (const snapshot of snapshots) {
    const dateStr = format(snapshot.snapshotDate, "yyyy-MM-dd");
    notesMap.set(dateStr, snapshot.notes);
  }

  // Convert to array format with notes
  return Array.from(dailyData.entries()).map(([date, data]) => ({
    date,
    pnl: Number(data.pnl.toFixed(2)),
    trades: data.trades,
    notes: notesMap.get(date) || null,
  }));
}
