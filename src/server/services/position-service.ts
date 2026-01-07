/**
 * Position Management Service
 * Track and update positions on executions
 */

import { db } from "@/lib/db";
import { positions, tradingAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getMockExecutionEngine } from "./mock-execution-engine";

interface Execution {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  commission: number;
  fees: number;
}

interface Position {
  id: string;
  tradingAccountId: string;
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  currentPrice: number | null;
  isOpen: boolean;
  totalBought: number;
  totalSold: number;
}

/**
 * Update position after an execution
 * Returns the realized P&L from this execution
 */
export async function updatePosition(
  accountId: string,
  symbol: string,
  execution: Execution
): Promise<{ realizedPnl: number }> {
  // Get or create position
  let position = await db.query.positions.findFirst({
    where: and(
      eq(positions.tradingAccountId, accountId),
      eq(positions.symbol, symbol),
      eq(positions.isOpen, true)
    ),
  });

  const executionEngine = getMockExecutionEngine();
  const currentPrice = executionEngine.getCurrentPrice(symbol);

  let realizedPnl = 0;

  if (!position) {
    // Create new position
    await createPosition(accountId, symbol, execution, currentPrice);
  } else {
    // Update existing position and get realized P&L
    realizedPnl = await modifyPosition(position, execution, currentPrice);
  }

  // Update account's open positions count
  await updateAccountPositionCount(accountId);

  return { realizedPnl };
}

/**
 * Create a new position
 */
async function createPosition(
  accountId: string,
  symbol: string,
  execution: Execution,
  currentPrice: number
): Promise<void> {
  const quantity = execution.side === "buy" ? execution.quantity : -execution.quantity;
  const unrealizedPnl = calculateUnrealizedPnL(
    quantity,
    execution.price,
    currentPrice,
    symbol
  );

  await db.insert(positions).values({
    tradingAccountId: accountId,
    symbol,
    quantity,
    avgEntryPrice: execution.price.toString(),
    realizedPnl: "0",
    unrealizedPnl: unrealizedPnl.toString(),
    totalPnl: unrealizedPnl.toString(),
    currentPrice: currentPrice.toString(),
    isOpen: true,
    totalBought: execution.side === "buy" ? execution.quantity : 0,
    totalSold: execution.side === "sell" ? execution.quantity : 0,
  });
}

/**
 * Modify existing position
 * Returns the realized P&L from this execution
 */
async function modifyPosition(
  position: any,
  execution: Execution,
  currentPrice: number
): Promise<number> {
  const currentQty = position.quantity;
  const currentAvgPrice = Number(position.avgEntryPrice);
  const currentRealized = Number(position.realizedPnl);

  const executionQty = execution.side === "buy" ? execution.quantity : -execution.quantity;
  const newQty = currentQty + executionQty;

  let newAvgPrice = currentAvgPrice;
  let newRealizedPnl = currentRealized;
  let realizedFromThisExecution = 0;

  // Determine if adding to or reducing position
  const isAddingToPosition = (currentQty > 0 && executionQty > 0) || (currentQty < 0 && executionQty < 0);
  const isReducingPosition = (currentQty > 0 && executionQty < 0) || (currentQty < 0 && executionQty > 0);

  if (isAddingToPosition) {
    // Adding to position: calculate new weighted average entry price
    const totalCost = (Math.abs(currentQty) * currentAvgPrice) + (Math.abs(executionQty) * execution.price);
    const totalQty = Math.abs(currentQty) + Math.abs(executionQty);
    newAvgPrice = totalCost / totalQty;
  } else if (isReducingPosition) {
    // Reducing position: realize P&L on closed portion
    const closedQty = Math.abs(executionQty);
    const pnlPerContract = currentQty > 0
      ? (execution.price - currentAvgPrice)
      : (currentAvgPrice - execution.price);

    const contractInfo = getMockExecutionEngine().getContractInfo(position.symbol);
    const tickValue = contractInfo?.tickValue || 1;
    const realizedOnClose = closedQty * pnlPerContract * tickValue;

    realizedFromThisExecution = realizedOnClose - execution.commission - execution.fees;
    newRealizedPnl = currentRealized + realizedFromThisExecution;
    // Average entry price stays the same when reducing
  }

  // Calculate unrealized P&L on remaining position
  const unrealizedPnl = calculateUnrealizedPnL(newQty, newAvgPrice, currentPrice, position.symbol);
  const totalPnl = newRealizedPnl + unrealizedPnl;

  // Update totals
  const newTotalBought = position.totalBought + (execution.side === "buy" ? execution.quantity : 0);
  const newTotalSold = position.totalSold + (execution.side === "sell" ? execution.quantity : 0);

  // Check if position is now closed
  const isClosed = newQty === 0;

  await db
    .update(positions)
    .set({
      quantity: newQty,
      avgEntryPrice: newAvgPrice.toString(),
      realizedPnl: newRealizedPnl.toString(),
      unrealizedPnl: unrealizedPnl.toString(),
      totalPnl: totalPnl.toString(),
      currentPrice: currentPrice.toString(),
      isOpen: !isClosed,
      closedAt: isClosed ? new Date() : undefined,
      totalBought: newTotalBought,
      totalSold: newTotalSold,
      lastUpdated: new Date(),
    })
    .where(eq(positions.id, position.id));

  return realizedFromThisExecution;
}

/**
 * Calculate unrealized P&L for a position
 */
function calculateUnrealizedPnL(
  quantity: number,
  avgEntryPrice: number,
  currentPrice: number,
  symbol: string
): number {
  if (quantity === 0) return 0;

  const contractInfo = getMockExecutionEngine().getContractInfo(symbol);
  const tickValue = contractInfo?.tickValue || 1;

  const pnlPerContract = quantity > 0
    ? (currentPrice - avgEntryPrice)
    : (avgEntryPrice - currentPrice);

  return Math.abs(quantity) * pnlPerContract * tickValue;
}

/**
 * Calculate P&L for a position at a given price
 */
export async function calculatePositionPnL(
  positionId: string,
  currentPrice: number
): Promise<{ unrealized: number; total: number }> {
  const position = await db.query.positions.findFirst({
    where: eq(positions.id, positionId),
  });

  if (!position) {
    throw new Error("Position not found");
  }

  const unrealized = calculateUnrealizedPnL(
    position.quantity,
    Number(position.avgEntryPrice),
    currentPrice,
    position.symbol
  );

  const total = Number(position.realizedPnl) + unrealized;

  return { unrealized, total };
}

/**
 * Get all open positions for an account
 */
export async function getOpenPositions(accountId: string): Promise<Position[]> {
  const openPositions = await db.query.positions.findMany({
    where: and(
      eq(positions.tradingAccountId, accountId),
      eq(positions.isOpen, true)
    ),
  });

  return openPositions.map((pos) => ({
    id: pos.id,
    tradingAccountId: pos.tradingAccountId,
    symbol: pos.symbol,
    quantity: pos.quantity,
    avgEntryPrice: Number(pos.avgEntryPrice),
    realizedPnl: Number(pos.realizedPnl),
    unrealizedPnl: Number(pos.unrealizedPnl),
    totalPnl: Number(pos.totalPnl),
    currentPrice: pos.currentPrice ? Number(pos.currentPrice) : null,
    isOpen: pos.isOpen,
    totalBought: pos.totalBought,
    totalSold: pos.totalSold,
  }));
}

/**
 * Update unrealized P&L for all open positions (called periodically)
 */
export async function updateUnrealizedPnL(accountId: string): Promise<void> {
  const openPositions = await getOpenPositions(accountId);
  const executionEngine = getMockExecutionEngine();

  for (const position of openPositions) {
    const currentPrice = executionEngine.getCurrentPrice(position.symbol);
    const unrealizedPnl = calculateUnrealizedPnL(
      position.quantity,
      position.avgEntryPrice,
      currentPrice,
      position.symbol
    );
    const totalPnl = position.realizedPnl + unrealizedPnl;

    await db
      .update(positions)
      .set({
        currentPrice: currentPrice.toString(),
        unrealizedPnl: unrealizedPnl.toString(),
        totalPnl: totalPnl.toString(),
        lastUpdated: new Date(),
      })
      .where(eq(positions.id, position.id));
  }
}

/**
 * Close a position at market price
 */
export async function closePosition(
  accountId: string,
  symbol: string
): Promise<{ success: boolean; message: string }> {
  const position = await db.query.positions.findFirst({
    where: and(
      eq(positions.tradingAccountId, accountId),
      eq(positions.symbol, symbol),
      eq(positions.isOpen, true)
    ),
  });

  if (!position) {
    return { success: false, message: "No open position found for this symbol" };
  }

  // This will be called by the order execution service to create a closing market order
  return {
    success: true,
    message: `Position ${symbol} will be closed via market order`,
  };
}

/**
 * Update account's open positions count
 */
async function updateAccountPositionCount(accountId: string): Promise<void> {
  const openPositions = await db.query.positions.findMany({
    where: and(
      eq(positions.tradingAccountId, accountId),
      eq(positions.isOpen, true)
    ),
  });

  await db
    .update(tradingAccounts)
    .set({
      openPositionsCount: openPositions.length,
    })
    .where(eq(tradingAccounts.id, accountId));
}
