/**
 * Order Monitor Service
 * Background monitoring of working orders
 */

import { db } from "@/lib/db";
import { orders, executions, tradingAccounts, accountEquitySnapshots } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getMockExecutionEngine } from "./mock-execution-engine";
import { updatePosition } from "./position-service";
import { v4 as uuidv4 } from "uuid";

/**
 * Monitor all working orders and execute when conditions are met
 * This should be called periodically (every 5 seconds)
 */
export async function monitorWorkingOrders(): Promise<{
  checked: number;
  filled: number;
  triggered: number;
}> {
  // Get all working orders
  const workingOrders = await db.query.orders.findMany({
    where: inArray(orders.status, ["working", "submitted"]),
  });

  let filled = 0;
  let triggered = 0;

  const executionEngine = getMockExecutionEngine();

  for (const order of workingOrders) {
    try {
      const currentPrice = executionEngine.getCurrentPrice(order.symbol);

      if (order.orderType === "limit") {
        const shouldFill = await checkLimitOrderFill(order, currentPrice, executionEngine);
        if (shouldFill) {
          await fillLimitOrder(order, executionEngine);
          filled++;
        }
      } else if (order.orderType === "stop") {
        const shouldTrigger = await checkStopOrderTrigger(order, currentPrice, executionEngine);
        if (shouldTrigger) {
          await triggerStopOrder(order, executionEngine);
          triggered++;
          filled++;
        }
      } else if (order.orderType === "stop_limit") {
        const shouldTrigger = await checkStopOrderTrigger(order, currentPrice, executionEngine);
        if (shouldTrigger) {
          await triggerStopLimitOrder(order);
          triggered++;
        }
      } else if (order.orderType === "trailing_stop") {
        const result = await updateAndCheckTrailingStop(order, currentPrice, executionEngine);
        if (result.triggered) {
          await triggerStopOrder(order, executionEngine);
          triggered++;
          filled++;
        }
      }
    } catch (error) {
      console.error(`Error monitoring order ${order.id}:`, error);
    }
  }

  return {
    checked: workingOrders.length,
    filled,
    triggered,
  };
}

/**
 * Check if a limit order should fill
 */
async function checkLimitOrderFill(
  order: any,
  currentPrice: number,
  executionEngine: any
): Promise<boolean> {
  if (!order.limitPrice) return false;

  const limitPrice = Number(order.limitPrice);

  // Buy limit: fill when current price <= limit price
  if (order.side === "buy" && currentPrice <= limitPrice) {
    return true;
  }

  // Sell limit: fill when current price >= limit price
  if (order.side === "sell" && currentPrice >= limitPrice) {
    return true;
  }

  return false;
}

/**
 * Fill a limit order
 */
async function fillLimitOrder(order: any, executionEngine: any): Promise<void> {
  const fillPrice = Number(order.limitPrice);
  const commission = order.remainingQuantity * 1.5;
  const fees = order.remainingQuantity * 0.5;

  // Record execution
  const executionId = `EXEC-${Date.now()}-${uuidv4().substring(0, 8)}`;

  await db.insert(executions).values({
    orderId: order.id,
    tradingAccountId: order.tradingAccountId,
    executionId,
    symbol: order.symbol,
    side: order.side,
    quantity: order.remainingQuantity,
    price: fillPrice.toString(),
    commission: commission.toString(),
    fees: fees.toString(),
    isSimulated: true,
    simulatedSlippage: "0",
  });

  // Update order
  await db
    .update(orders)
    .set({
      status: "filled",
      filledQuantity: order.quantity,
      remainingQuantity: 0,
      avgFillPrice: fillPrice.toString(),
      firstFillAt: order.firstFillAt || new Date(),
      lastFillAt: new Date(),
      closedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  // Update position and get realized P&L
  const positionResult = await updatePosition(order.tradingAccountId, order.symbol, {
    id: executionId,
    symbol: order.symbol,
    side: order.side,
    quantity: order.remainingQuantity,
    price: fillPrice,
    commission,
    fees,
  });

  // Update account with commission, fees, and realized P&L
  await updateAccountAfterExecution(order.tradingAccountId, {
    commission,
    fees,
    realizedPnl: positionResult.realizedPnl
  });
  await checkAccountRules(order.tradingAccountId);
  await updateAccountOrderCount(order.tradingAccountId);
}

/**
 * Check if a stop order should trigger
 */
async function checkStopOrderTrigger(
  order: any,
  currentPrice: number,
  executionEngine: any
): Promise<boolean> {
  if (!order.stopPrice) return false;

  const stopPrice = Number(order.stopPrice);

  // Buy stop: trigger when price rises to stop price
  if (order.side === "buy" && currentPrice >= stopPrice) {
    return true;
  }

  // Sell stop: trigger when price falls to stop price
  if (order.side === "sell" && currentPrice <= stopPrice) {
    return true;
  }

  return false;
}

/**
 * Trigger a stop order (converts to market order)
 */
async function triggerStopOrder(order: any, executionEngine: any): Promise<void> {
  const execution = await executionEngine.executeMarketOrder({
    id: order.id,
    symbol: order.symbol,
    orderType: "market",
    side: order.side,
    quantity: order.quantity,
    remainingQuantity: order.remainingQuantity,
  });

  // Record execution
  const executionId = `EXEC-${Date.now()}-${uuidv4().substring(0, 8)}`;

  await db.insert(executions).values({
    orderId: order.id,
    tradingAccountId: order.tradingAccountId,
    executionId,
    symbol: order.symbol,
    side: order.side,
    quantity: execution.quantity,
    price: execution.price.toString(),
    commission: execution.commission.toString(),
    fees: execution.fees.toString(),
    isSimulated: true,
    simulatedSlippage: execution.slippage.toString(),
  });

  // Update order
  await db
    .update(orders)
    .set({
      status: "filled",
      filledQuantity: order.quantity,
      remainingQuantity: 0,
      avgFillPrice: execution.price.toString(),
      firstFillAt: order.firstFillAt || new Date(),
      lastFillAt: new Date(),
      closedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  // Update position and get realized P&L
  const positionResult = await updatePosition(order.tradingAccountId, order.symbol, {
    id: executionId,
    symbol: order.symbol,
    side: order.side,
    quantity: execution.quantity,
    price: execution.price,
    commission: execution.commission,
    fees: execution.fees,
  });

  // Update account with commission, fees, and realized P&L
  await updateAccountAfterExecution(order.tradingAccountId, {
    commission: execution.commission,
    fees: execution.fees,
    realizedPnl: positionResult.realizedPnl
  });
  await checkAccountRules(order.tradingAccountId);
  await updateAccountOrderCount(order.tradingAccountId);
}

/**
 * Trigger a stop-limit order (converts to limit order)
 */
async function triggerStopLimitOrder(order: any): Promise<void> {
  // Stop-limit triggered: now becomes a working limit order
  // Keep status as "working", but note that stop has been triggered
  await db
    .update(orders)
    .set({
      notes: (order.notes || "") + " [Stop triggered, now working as limit order]",
    })
    .where(eq(orders.id, order.id));
}

/**
 * Update trailing stop and check for trigger
 */
async function updateAndCheckTrailingStop(
  order: any,
  currentPrice: number,
  executionEngine: any
): Promise<{ triggered: boolean }> {
  if (!order.trailAmount || !order.stopPrice) return { triggered: false };

  const currentStopPrice = Number(order.stopPrice);
  const trailAmount = Number(order.trailAmount);

  const result = await executionEngine.updateTrailingStop(
    {
      id: order.id,
      symbol: order.symbol,
      orderType: "trailing_stop",
      side: order.side,
      quantity: order.quantity,
      remainingQuantity: order.remainingQuantity,
      trailAmount,
    },
    currentStopPrice
  );

  // Update stop price if it changed
  if (result.newStopPrice !== currentStopPrice) {
    await db
      .update(orders)
      .set({
        stopPrice: result.newStopPrice.toString(),
      })
      .where(eq(orders.id, order.id));
  }

  return { triggered: result.triggered };
}

/**
 * Update account balance after execution
 */
async function updateAccountAfterExecution(
  accountId: string,
  execution: { commission: number; fees: number; realizedPnl?: number }
): Promise<void> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
  });

  if (!account) return;

  const currentBalance = Number(account.currentBalance);
  const currentDailyPnl = Number(account.dailyPnl || 0);

  // Subtract costs
  const totalCost = execution.commission + execution.fees;

  // Add realized P&L (if position was closed/reduced)
  const realizedPnl = execution.realizedPnl || 0;

  const balanceChange = realizedPnl - totalCost;
  const newBalance = currentBalance + balanceChange;
  const newDailyPnl = currentDailyPnl + balanceChange;

  await db
    .update(tradingAccounts)
    .set({
      currentBalance: newBalance.toString(),
      dailyPnl: newDailyPnl.toString(),
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId));

  // Create equity snapshot
  await db.insert(accountEquitySnapshots).values({
    tradingAccountId: accountId,
    timestamp: new Date(),
    balance: newBalance.toString(),
    equity: newBalance.toString(),
    unrealizedPnl: "0",
    snapshotType: "trade_close",
  });
}

/**
 * Check account rules after execution
 */
async function checkAccountRules(accountId: string): Promise<void> {
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
    with: { tier: true },
  });

  if (!account || !account.tier) return;

  const currentBalance = Number(account.currentBalance);
  const initialBalance = Number(account.initialBalance);
  const pnl = currentBalance - initialBalance;

  // Check drawdown
  const currentDrawdown = Number(account.currentDrawdown);
  const maxDrawdown = Number(account.tier.maxDrawdown);

  if (currentDrawdown >= maxDrawdown) {
    await db
      .update(tradingAccounts)
      .set({
        status: "failed",
        failureReason: "Max drawdown exceeded",
        failedAt: new Date(),
      })
      .where(eq(tradingAccounts.id, accountId));
    return;
  }

  // Check daily loss limit
  const dailyPnl = Number(account.dailyPnl);
  const dailyLossLimit = Number(account.tier.dailyLossLimit);

  if (dailyPnl <= -dailyLossLimit) {
    await db
      .update(tradingAccounts)
      .set({
        dailyLossLimitHit: true,
      })
      .where(eq(tradingAccounts.id, accountId));
    return;
  }

  // Check profit target
  const profitTarget = Number(account.tier.profitTarget);

  if (pnl >= profitTarget) {
    await db
      .update(tradingAccounts)
      .set({
        status: "passed",
        profitTargetReached: true,
        profitTargetReachedAt: new Date(),
      })
      .where(eq(tradingAccounts.id, accountId));
  }
}

/**
 * Update account's open orders count
 */
async function updateAccountOrderCount(accountId: string): Promise<void> {
  const openOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.tradingAccountId, accountId),
      eq(orders.status, "working")
    ),
  });

  await db
    .update(tradingAccounts)
    .set({
      openOrdersCount: openOrders.length,
    })
    .where(eq(tradingAccounts.id, accountId));
}
