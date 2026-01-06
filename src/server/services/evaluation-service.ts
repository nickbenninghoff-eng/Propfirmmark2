/**
 * Evaluation Service
 *
 * Handles all rule checking and evaluation logic for trading accounts.
 * This includes:
 * - Trailing drawdown calculations
 * - Daily loss limit checking
 * - Profit target detection
 * - Pass/fail logic
 */

import { db } from "@/lib/db";
import { tradingAccounts, accountTiers, dailySnapshots, trades } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export interface EvaluationResult {
  passed: boolean;
  failed: boolean;
  failureReason?: string;
  profitTargetReached: boolean;
  minTradingDaysReached: boolean;
  currentDrawdown: number;
  maxDrawdownReached: number;
  dailyLossLimitHit: boolean;
}

export interface TradeData {
  pnl: number;
  timestamp: Date;
}

/**
 * Check if account has passed or failed evaluation
 */
export async function evaluateAccount(accountId: string): Promise<EvaluationResult> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
    with: {
      tier: true,
    },
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const tier = account.tier;
  const currentBalance = Number(account.currentBalance);
  const initialBalance = Number(account.initialBalance);
  const profit = currentBalance - initialBalance;

  // Check drawdown
  const maxDrawdown = Number(tier.maxDrawdown);
  const drawdownThreshold = Number(account.drawdownThreshold);
  const currentDrawdown = Math.max(0, Number(account.highWaterMark) - currentBalance);

  // Check if max drawdown exceeded
  if (currentBalance <= drawdownThreshold) {
    return {
      passed: false,
      failed: true,
      failureReason: "Maximum drawdown exceeded",
      profitTargetReached: false,
      minTradingDaysReached: account.tradingDaysCount >= tier.minTradingDays,
      currentDrawdown,
      maxDrawdownReached: currentDrawdown,
      dailyLossLimitHit: false,
    };
  }

  // Check profit target
  const profitTarget = Number(tier.profitTarget);
  const profitTargetReached = profit >= profitTarget;

  // Check minimum trading days
  const minTradingDaysReached = account.tradingDaysCount >= tier.minTradingDays;

  // Check if passed (profit target reached AND min days reached)
  const passed = profitTargetReached && minTradingDaysReached;

  return {
    passed,
    failed: false,
    profitTargetReached,
    minTradingDaysReached,
    currentDrawdown,
    maxDrawdownReached: Number(account.maxDrawdownReached),
    dailyLossLimitHit: false,
  };
}

/**
 * Update trailing drawdown threshold at end of day
 * Called by daily snapshot job
 */
export async function updateTrailingDrawdown(accountId: string): Promise<void> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
    with: {
      tier: true,
    },
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const currentBalance = Number(account.currentBalance);
  const highWaterMark = Number(account.highWaterMark);
  const maxDrawdown = Number(account.tier.maxDrawdown);
  const profitTarget = Number(account.tier.profitTarget);
  const initialBalance = Number(account.initialBalance);

  // Only trail if not yet at profit target
  const profit = currentBalance - initialBalance;
  const profitTargetReached = profit >= profitTarget;

  if (profitTargetReached) {
    // Drawdown stops trailing once profit target is reached
    return;
  }

  // Update high water mark if current balance is higher
  let newHighWaterMark = highWaterMark;
  if (currentBalance > highWaterMark) {
    newHighWaterMark = currentBalance;
  }

  // Calculate new drawdown threshold (trails up with high water mark)
  const newDrawdownThreshold = newHighWaterMark - maxDrawdown;

  await db
    .update(tradingAccounts)
    .set({
      highWaterMark: newHighWaterMark.toString(),
      drawdownThreshold: newDrawdownThreshold.toString(),
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId));
}

/**
 * Check daily loss limit
 */
export async function checkDailyLossLimit(
  accountId: string,
  todayPnl: number
): Promise<boolean> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
    with: {
      tier: true,
    },
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const dailyLossLimit = Number(account.tier.dailyLossLimit);

  if (!dailyLossLimit) {
    return false; // No daily limit set
  }

  // Check if daily loss limit exceeded
  if (todayPnl <= -dailyLossLimit) {
    return true;
  }

  return false;
}

/**
 * Process a new trade and update account stats
 */
export async function processTrade(
  accountId: string,
  trade: TradeData
): Promise<EvaluationResult> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
    with: {
      tier: true,
    },
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  // Update balance
  const newBalance = Number(account.currentBalance) + trade.pnl;

  // Update win/loss counts
  const isWin = trade.pnl > 0;
  const newWinningTrades = account.winningTrades + (isWin ? 1 : 0);
  const newLosingTrades = account.losingTrades + (isWin ? 0 : 1);
  const newTotalTrades = account.totalTrades + 1;

  // Update profit/loss totals
  const newTotalProfit = Number(account.totalProfit) + (isWin ? trade.pnl : 0);
  const newTotalLoss = Number(account.totalLoss) + (isWin ? 0 : Math.abs(trade.pnl));

  // Calculate current drawdown
  const highWaterMark = Number(account.highWaterMark);
  const currentDrawdown = Math.max(0, highWaterMark - newBalance);
  const maxDrawdownReached = Math.max(Number(account.maxDrawdownReached), currentDrawdown);

  await db
    .update(tradingAccounts)
    .set({
      currentBalance: newBalance.toString(),
      totalProfit: newTotalProfit.toString(),
      totalLoss: newTotalLoss.toString(),
      currentDrawdown: currentDrawdown.toString(),
      maxDrawdownReached: maxDrawdownReached.toString(),
      totalTrades: newTotalTrades,
      winningTrades: newWinningTrades,
      losingTrades: newLosingTrades,
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId));

  // Evaluate account status
  return evaluateAccount(accountId);
}

/**
 * Mark a trading day
 */
export async function markTradingDay(accountId: string): Promise<void> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  await db
    .update(tradingAccounts)
    .set({
      tradingDaysCount: account.tradingDaysCount + 1,
      minTradingDaysReached: account.tradingDaysCount + 1 >= 5, // Assuming 5 min days
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId));
}

/**
 * Mark account as passed
 */
export async function markAccountPassed(accountId: string): Promise<void> {
  await db
    .update(tradingAccounts)
    .set({
      status: "passed",
      profitTargetReached: true,
      profitTargetReachedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId));
}

/**
 * Mark account as failed
 */
export async function markAccountFailed(
  accountId: string,
  reason: string
): Promise<void> {
  await db
    .update(tradingAccounts)
    .set({
      status: "failed",
      failureReason: reason,
      failedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId));
}

/**
 * Create daily snapshot for an account
 */
export async function createDailySnapshot(accountId: string): Promise<void> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
  });

  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's trades
  const todayTrades = await db.query.trades.findMany({
    where: and(
      eq(trades.tradingAccountId, accountId),
      gte(trades.entryTime, today)
    ),
  });

  const tradesCount = todayTrades.length;
  const winnersCount = todayTrades.filter((t) => Number(t.pnl || 0) > 0).length;
  const losersCount = todayTrades.filter((t) => Number(t.pnl || 0) < 0).length;
  const dailyPnl = todayTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);

  await db.insert(dailySnapshots).values({
    tradingAccountId: accountId,
    snapshotDate: today,
    openingBalance: account.currentBalance, // Would need yesterday's closing
    closingBalance: account.currentBalance,
    highBalance: account.highWaterMark,
    lowBalance: account.currentBalance,
    dailyPnl: dailyPnl.toString(),
    tradesCount,
    winnersCount,
    losersCount,
  });

  // Update trailing drawdown at end of day
  await updateTrailingDrawdown(accountId);
}
