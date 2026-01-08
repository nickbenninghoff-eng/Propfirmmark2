/**
 * Order Execution Service
 * Handles order lifecycle and execution orchestration
 */

import { db } from "@/lib/db";
import { orders, executions, orderRuleChecks, tradingAccounts, accountEquitySnapshots, positions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { validateOrder, type OrderValidationRequest } from "./order-validation-service";
import { getMockExecutionEngine } from "./mock-execution-engine";
import { updatePosition } from "./position-service";
import { v4 as uuidv4 } from "uuid";

export interface OrderSubmission {
  accountId: string;
  symbol: string;
  orderType: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
  side: "buy" | "sell";
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  trailAmount?: number;
  timeInForce?: "day" | "gtc" | "ioc" | "fok";
  placedFromIp?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  validationResult?: any;
  executionDetails?: any;
}

/**
 * Submit a new order
 */
export async function submitOrder(submission: OrderSubmission): Promise<OrderResult> {
  try {
    // 1. Validate order
    const validationRequest: OrderValidationRequest = {
      accountId: submission.accountId,
      symbol: submission.symbol,
      orderType: submission.orderType,
      side: submission.side,
      quantity: submission.quantity,
      limitPrice: submission.limitPrice,
      stopPrice: submission.stopPrice,
    };

    const validationResult = await validateOrder(validationRequest);

    // 2. Create order record (status: pending)
    const clientOrderId = `ORD-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const [order] = await db
      .insert(orders)
      .values({
        tradingAccountId: submission.accountId,
        clientOrderId,
        symbol: submission.symbol,
        orderType: submission.orderType,
        side: submission.side,
        quantity: submission.quantity,
        remainingQuantity: submission.quantity,
        limitPrice: submission.limitPrice?.toString(),
        stopPrice: submission.stopPrice?.toString(),
        trailAmount: submission.trailAmount?.toString(),
        timeInForce: submission.timeInForce || "day",
        status: "pending",
        preTradeCheckPassed: validationResult.passed,
        preTradeCheckDetails: validationResult,
        placedFromIp: submission.placedFromIp,
      })
      .returning();

    // 3. Create order rule checks record
    await db.insert(orderRuleChecks).values({
      orderId: order.id,
      tradingAccountId: submission.accountId,
      passed: validationResult.passed,
      checkType: "pre_trade_validation",
      checkDetails: validationResult.checks,
      failureReason: validationResult.failureReasons.join("; "),
      accountSnapshot: validationResult.accountSnapshot,
    });

    // 4. If validation failed, reject order
    if (!validationResult.passed) {
      await db
        .update(orders)
        .set({
          status: "rejected",
          rejectionReason: validationResult.failureReasons.join("; "),
          closedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      return {
        success: false,
        orderId: order.id,
        error: `Order rejected: ${validationResult.failureReasons.join("; ")}`,
        validationResult,
      };
    }

    // 5. Update status to submitted
    await db
      .update(orders)
      .set({
        status: "submitted",
        submittedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Update account's open orders count
    await updateAccountOrderCount(submission.accountId);

    // 6. Execute based on order type
    let executionResult;

    if (submission.orderType === "market") {
      executionResult = await executeMarketOrder(order.id);
    } else if (submission.orderType === "limit") {
      executionResult = await executeLimitOrder(order.id);
    } else if (submission.orderType === "stop") {
      executionResult = await executeStopOrder(order.id);
    } else if (submission.orderType === "stop_limit") {
      executionResult = await executeStopLimitOrder(order.id);
    } else if (submission.orderType === "trailing_stop") {
      executionResult = await executeTrailingStopOrder(order.id);
    }

    return {
      success: true,
      orderId: order.id,
      validationResult,
      executionDetails: executionResult,
    };
  } catch (error) {
    console.error("Error submitting order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute a market order immediately
 */
export async function executeMarketOrder(orderId: string): Promise<any> {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");

  const executionEngine = getMockExecutionEngine();
  const execution = await executionEngine.executeMarketOrder({
    id: order.id,
    symbol: order.symbol,
    orderType: "market",
    side: order.side as "buy" | "sell",
    quantity: order.quantity,
    remainingQuantity: order.remainingQuantity,
  });

  // Record execution
  await recordExecution(order, execution);

  // Update order status
  await db
    .update(orders)
    .set({
      status: "filled",
      filledQuantity: order.quantity,
      remainingQuantity: 0,
      avgFillPrice: execution.price.toString(),
      firstFillAt: new Date(),
      lastFillAt: new Date(),
      closedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  // Update position and get realized P&L
  const positionResult = await updatePosition(order.tradingAccountId, order.symbol, {
    id: "",
    symbol: order.symbol,
    side: order.side as "buy" | "sell",
    quantity: execution.quantity,
    price: execution.price,
    commission: execution.commission,
    fees: execution.fees,
  });

  // Update account balance with commission, fees, and realized P&L
  await updateAccountAfterExecution(order.tradingAccountId, {
    commission: execution.commission,
    fees: execution.fees,
    realizedPnl: positionResult.realizedPnl
  });
  await checkAccountRules(order.tradingAccountId);

  // Get current position to update TP/SL orders or cancel if closed
  // First check for open position
  const openPosition = await db.query.positions.findFirst({
    where: and(
      eq(positions.tradingAccountId, order.tradingAccountId),
      eq(positions.symbol, order.symbol),
      eq(positions.isOpen, true)
    ),
  });

  console.log(`[Market Order Fill] Order ${order.id} filled. Position check:`, {
    symbol: order.symbol,
    orderSide: order.side,
    realizedPnl: positionResult.realizedPnl,
    openPositionFound: !!openPosition,
    openPositionQty: openPosition?.quantity,
  });

  // Use realizedPnl to determine if this was an entry or exit:
  // - realizedPnl = 0 means this was a pure entry (opened or added to position)
  // - realizedPnl != 0 means this closed/reduced a position
  const wasExitOrder = positionResult.realizedPnl !== 0;

  if (openPosition && openPosition.quantity !== 0) {
    // Position still exists and is open - update TP/SL order quantities to match current position size
    const positionQty = Math.abs(openPosition.quantity);
    const isLong = openPosition.quantity > 0;

    // Always update TP/SL quantities when position is still open (entry or partial exit)
    console.log(`[Market Order Fill] Position still open with ${positionQty} contracts, updating TP/SL quantities`);
    await updateTPSLOrderQuantities(order.tradingAccountId, order.symbol, positionQty, isLong);
  } else if (wasExitOrder) {
    // This was an exit order AND no open position remains - cancel related orders (OCO)
    console.log(`[Market Order Fill] Exit order closed position, cancelling related orders (OCO)`);
    await cancelRelatedOrdersOnPositionClose(order.tradingAccountId, order.symbol, order.id);
  } else {
    // This was an entry order but somehow no position found - don't cancel anything
    console.log(`[Market Order Fill] Entry order but no position found - skipping OCO`);
  }

  // Update open orders count
  await updateAccountOrderCount(order.tradingAccountId);

  return {
    filled: true,
    fillPrice: execution.price,
    fillQuantity: execution.quantity,
    slippage: execution.slippage,
  };
}

/**
 * Execute a limit order - check for immediate fill or mark as working
 */
export async function executeLimitOrder(orderId: string): Promise<any> {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");

  const executionEngine = getMockExecutionEngine();
  const currentPrice = executionEngine.getCurrentPrice(order.symbol);
  const limitPrice = Number(order.limitPrice);

  console.log(`[executeLimitOrder] Order ${orderId}: side=${order.side}, limitPrice=${limitPrice}, currentPrice=${currentPrice}`);

  // Check if the order should fill immediately
  const shouldFillImmediately =
    (order.side === "buy" && currentPrice <= limitPrice) ||
    (order.side === "sell" && currentPrice >= limitPrice);

  if (shouldFillImmediately) {
    console.log(`[executeLimitOrder] Order ${orderId} filling immediately`);

    // Fill at the better price for the trader
    const fillPrice = order.side === "buy"
      ? Math.min(limitPrice, currentPrice)
      : Math.max(limitPrice, currentPrice);

    const commission = order.remainingQuantity * 1.5;
    const fees = order.remainingQuantity * 0.5;

    // Record execution
    await recordExecution(order, {
      quantity: order.remainingQuantity,
      price: fillPrice,
      slippage: 0,
      commission,
      fees,
    });

    // Update order status
    await db
      .update(orders)
      .set({
        status: "filled",
        filledQuantity: order.quantity,
        remainingQuantity: 0,
        avgFillPrice: fillPrice.toString(),
        firstFillAt: new Date(),
        lastFillAt: new Date(),
        closedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Update position and get realized P&L
    const positionResult = await updatePosition(order.tradingAccountId, order.symbol, {
      id: "",
      symbol: order.symbol,
      side: order.side as "buy" | "sell",
      quantity: order.remainingQuantity,
      price: fillPrice,
      commission,
      fees,
    });

    // Update account balance
    await updateAccountAfterExecution(order.tradingAccountId, {
      commission,
      fees,
      realizedPnl: positionResult.realizedPnl
    });
    await checkAccountRules(order.tradingAccountId);

    // Handle OCO/TP-SL logic
    const openPosition = await db.query.positions.findFirst({
      where: and(
        eq(positions.tradingAccountId, order.tradingAccountId),
        eq(positions.symbol, order.symbol),
        eq(positions.isOpen, true)
      ),
    });

    const wasExitOrder = positionResult.realizedPnl !== 0;

    if (openPosition && openPosition.quantity !== 0) {
      const positionQty = Math.abs(openPosition.quantity);
      const isLong = openPosition.quantity > 0;
      await updateTPSLOrderQuantities(order.tradingAccountId, order.symbol, positionQty, isLong);
    } else if (wasExitOrder) {
      await cancelRelatedOrdersOnPositionClose(order.tradingAccountId, order.symbol, order.id);
    }

    await updateAccountOrderCount(order.tradingAccountId);

    return {
      filled: true,
      fillPrice,
      fillQuantity: order.remainingQuantity,
      immediate: true,
    };
  }

  // Mark as working - the order monitor service will check for fills
  await db
    .update(orders)
    .set({
      status: "working",
    })
    .where(eq(orders.id, orderId));

  console.log(`[executeLimitOrder] Order ${orderId} is now working (waiting for price ${order.side === 'buy' ? '<=' : '>='} ${limitPrice})`);

  return {
    working: true,
    message: "Limit order is now working in the market",
  };
}

/**
 * Execute a stop order - check for immediate trigger or mark as working
 */
export async function executeStopOrder(orderId: string): Promise<any> {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");

  const executionEngine = getMockExecutionEngine();
  const currentPrice = executionEngine.getCurrentPrice(order.symbol);
  const stopPrice = Number(order.stopPrice);

  console.log(`[executeStopOrder] Order ${orderId}: side=${order.side}, stopPrice=${stopPrice}, currentPrice=${currentPrice}`);

  // Check if the stop should trigger immediately
  const shouldTriggerImmediately =
    (order.side === "buy" && currentPrice >= stopPrice) ||
    (order.side === "sell" && currentPrice <= stopPrice);

  if (shouldTriggerImmediately) {
    console.log(`[executeStopOrder] Order ${orderId} triggering immediately as market order`);

    // Execute as market order with slippage
    const execution = await executionEngine.executeMarketOrder({
      id: order.id,
      symbol: order.symbol,
      orderType: "market",
      side: order.side as "buy" | "sell",
      quantity: order.quantity,
      remainingQuantity: order.remainingQuantity,
    });

    // Record execution
    await recordExecution(order, execution);

    // Update order status
    await db
      .update(orders)
      .set({
        status: "filled",
        filledQuantity: order.quantity,
        remainingQuantity: 0,
        avgFillPrice: execution.price.toString(),
        firstFillAt: new Date(),
        lastFillAt: new Date(),
        closedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Update position and get realized P&L
    const positionResult = await updatePosition(order.tradingAccountId, order.symbol, {
      id: "",
      symbol: order.symbol,
      side: order.side as "buy" | "sell",
      quantity: execution.quantity,
      price: execution.price,
      commission: execution.commission,
      fees: execution.fees,
    });

    // Update account balance
    await updateAccountAfterExecution(order.tradingAccountId, {
      commission: execution.commission,
      fees: execution.fees,
      realizedPnl: positionResult.realizedPnl
    });
    await checkAccountRules(order.tradingAccountId);

    // Handle OCO/TP-SL logic
    const openPosition = await db.query.positions.findFirst({
      where: and(
        eq(positions.tradingAccountId, order.tradingAccountId),
        eq(positions.symbol, order.symbol),
        eq(positions.isOpen, true)
      ),
    });

    const wasExitOrder = positionResult.realizedPnl !== 0;

    if (openPosition && openPosition.quantity !== 0) {
      const positionQty = Math.abs(openPosition.quantity);
      const isLong = openPosition.quantity > 0;
      await updateTPSLOrderQuantities(order.tradingAccountId, order.symbol, positionQty, isLong);
    } else if (wasExitOrder) {
      await cancelRelatedOrdersOnPositionClose(order.tradingAccountId, order.symbol, order.id);
    }

    await updateAccountOrderCount(order.tradingAccountId);

    return {
      filled: true,
      fillPrice: execution.price,
      fillQuantity: execution.quantity,
      immediate: true,
    };
  }

  // Mark as working
  await db
    .update(orders)
    .set({
      status: "working",
    })
    .where(eq(orders.id, orderId));

  console.log(`[executeStopOrder] Order ${orderId} is now working (waiting for price ${order.side === 'buy' ? '>=' : '<='} ${stopPrice})`);

  return {
    working: true,
    message: "Stop order is now working, will trigger to market order",
  };
}

/**
 * Execute a stop-limit order (mark as working)
 */
export async function executeStopLimitOrder(orderId: string): Promise<any> {
  await db
    .update(orders)
    .set({
      status: "working",
    })
    .where(eq(orders.id, orderId));

  return {
    working: true,
    message: "Stop-limit order is now working",
  };
}

/**
 * Execute a trailing stop order (mark as working)
 */
export async function executeTrailingStopOrder(orderId: string): Promise<any> {
  await db
    .update(orders)
    .set({
      status: "working",
    })
    .where(eq(orders.id, orderId));

  return {
    working: true,
    message: "Trailing stop order is now working",
  };
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string): Promise<boolean> {
  const order = await getOrder(orderId);
  if (!order) return false;

  // Can only cancel pending, submitted, or working orders
  if (!["pending", "submitted", "working"].includes(order.status)) {
    return false;
  }

  await db
    .update(orders)
    .set({
      status: "cancelled",
      closedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  // Update account's open orders count
  await updateAccountOrderCount(order.tradingAccountId);

  return true;
}

/**
 * Get order status
 */
export async function getOrderStatus(orderId: string): Promise<any> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      executions: true,
      ruleChecks: true,
    },
  });

  return order;
}

/**
 * Record an execution
 */
async function recordExecution(order: any, execution: any): Promise<void> {
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
 * Get order details
 */
async function getOrder(orderId: string): Promise<any> {
  return await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
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

/**
 * Update TP/SL order quantities to match new position size
 * Called after an entry order is filled to keep TP/SL covering all contracts
 */
async function updateTPSLOrderQuantities(
  accountId: string,
  symbol: string,
  newPositionQuantity: number,
  isLong: boolean
): Promise<number> {
  // If position is closed, don't update (OCO will cancel them)
  if (newPositionQuantity === 0) {
    return 0;
  }

  // TP/SL orders are on the opposite side of the position
  const tpslSide = isLong ? "sell" : "buy";

  // Find all working TP (limit) and SL (stop) orders on the opposite side
  const tpslOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.tradingAccountId, accountId),
      eq(orders.symbol, symbol),
      eq(orders.side, tpslSide),
      inArray(orders.status, ["working", "submitted", "pending"])
    ),
  });

  let updatedCount = 0;
  for (const order of tpslOrders) {
    // Only update if quantity is different
    if (order.quantity !== newPositionQuantity) {
      await db
        .update(orders)
        .set({
          quantity: newPositionQuantity,
          remainingQuantity: newPositionQuantity,
        })
        .where(eq(orders.id, order.id));

      console.log(`Updated ${order.orderType} order ${order.id} quantity from ${order.quantity} to ${newPositionQuantity}`);
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Cancel related orders when a position is closed (OCO behavior)
 * This cancels any remaining TP/SL orders on the same symbol
 */
async function cancelRelatedOrdersOnPositionClose(
  accountId: string,
  symbol: string,
  filledOrderId: string
): Promise<number> {
  // Check if the position is now closed
  const position = await db.query.positions.findFirst({
    where: and(
      eq(positions.tradingAccountId, accountId),
      eq(positions.symbol, symbol),
      eq(positions.isOpen, true)
    ),
  });

  // If position still exists and is open, don't cancel other orders
  if (position && position.quantity !== 0) {
    return 0;
  }

  // Position is closed - cancel all other working orders on this symbol
  const relatedOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.tradingAccountId, accountId),
      eq(orders.symbol, symbol),
      inArray(orders.status, ["working", "submitted", "pending"])
    ),
  });

  let cancelledCount = 0;
  for (const order of relatedOrders) {
    // Don't cancel the order that just filled
    if (order.id === filledOrderId) continue;

    await db
      .update(orders)
      .set({
        status: "cancelled",
        closedAt: new Date(),
        notes: (order.notes || "") + " [OCO: Cancelled - position closed]",
      })
      .where(eq(orders.id, order.id));

    cancelledCount++;
  }

  return cancelledCount;
}
