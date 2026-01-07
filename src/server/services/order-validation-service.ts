/**
 * Order Validation Service
 * Pre-trade validation against account rules
 */

import { db } from "@/lib/db";
import { tradingAccounts, accountTiers, positions, orders } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getMockExecutionEngine } from "./mock-execution-engine";

export interface OrderValidationRequest {
  accountId: string;
  symbol: string;
  orderType: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
  side: "buy" | "sell";
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
}

export interface ValidationCheck {
  passed: boolean;
  details: any;
}

export interface ValidationResult {
  passed: boolean;
  checks: {
    balanceCheck: ValidationCheck;
    positionLimitCheck: ValidationCheck;
    drawdownCheck: ValidationCheck;
    dailyLossLimitCheck: ValidationCheck;
    marginCheck: ValidationCheck;
  };
  failureReasons: string[];
  accountSnapshot: any;
}

/**
 * Main validation entry point
 */
export async function validateOrder(
  request: OrderValidationRequest
): Promise<ValidationResult> {
  // Load account with tier rules
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, request.accountId),
    with: {
      tier: true,
    },
  });

  if (!account || !account.tier) {
    throw new Error("Account or tier not found");
  }

  // Take snapshot of account state
  const accountSnapshot = {
    currentBalance: account.currentBalance,
    dailyPnl: account.dailyPnl,
    currentDrawdown: account.currentDrawdown,
    openPositionsCount: account.openPositionsCount,
    openOrdersCount: account.openOrdersCount,
    availableMargin: account.availableMargin,
    usedMargin: account.usedMargin,
    dailyLossLimitHit: account.dailyLossLimitHit,
  };

  const failureReasons: string[] = [];

  // 1. Balance Check
  const balanceCheck = await checkBalance(account, request);
  if (!balanceCheck.passed) {
    failureReasons.push(balanceCheck.details.reason);
  }

  // 2. Position Limit Check
  const positionLimitCheck = await checkPositionLimits(account, request);
  if (!positionLimitCheck.passed) {
    failureReasons.push(positionLimitCheck.details.reason);
  }

  // 3. Drawdown Check
  const drawdownCheck = await checkDrawdown(account, request);
  if (!drawdownCheck.passed) {
    failureReasons.push(drawdownCheck.details.reason);
  }

  // 4. Daily Loss Limit Check
  const dailyLossLimitCheck = await checkDailyLossLimit(account, request);
  if (!dailyLossLimitCheck.passed) {
    failureReasons.push(dailyLossLimitCheck.details.reason);
  }

  // 5. Margin Check
  const marginCheck = await checkMargin(account, request);
  if (!marginCheck.passed) {
    failureReasons.push(marginCheck.details.reason);
  }

  const allPassed =
    balanceCheck.passed &&
    positionLimitCheck.passed &&
    drawdownCheck.passed &&
    dailyLossLimitCheck.passed &&
    marginCheck.passed;

  return {
    passed: allPassed,
    checks: {
      balanceCheck,
      positionLimitCheck,
      drawdownCheck,
      dailyLossLimitCheck,
      marginCheck,
    },
    failureReasons,
    accountSnapshot,
  };
}

/**
 * Check if account has sufficient balance for commission/fees
 */
async function checkBalance(
  account: any,
  request: OrderValidationRequest
): Promise<ValidationCheck> {
  const totalCommission = request.quantity * 3; // $3 round-trip per contract
  const currentBalance = Number(account.currentBalance);

  if (currentBalance < totalCommission) {
    return {
      passed: false,
      details: {
        reason: `Insufficient balance. Need $${totalCommission.toFixed(2)} for commission, have $${currentBalance.toFixed(2)}`,
        requiredCommission: totalCommission,
        currentBalance,
      },
    };
  }

  return {
    passed: true,
    details: {
      currentBalance,
      requiredCommission: totalCommission,
    },
  };
}

/**
 * Check position limits from tier rules
 */
async function checkPositionLimits(
  account: any,
  request: OrderValidationRequest
): Promise<ValidationCheck> {
  const tier = account.tier;

  // Check max contracts per trade
  if (tier.maxContractsPerTrade && request.quantity > tier.maxContractsPerTrade) {
    return {
      passed: false,
      details: {
        reason: `Order quantity ${request.quantity} exceeds max contracts per trade (${tier.maxContractsPerTrade})`,
        orderQuantity: request.quantity,
        maxAllowed: tier.maxContractsPerTrade,
      },
    };
  }

  // Check max open contracts across all positions
  if (tier.maxOpenContracts) {
    // Get current open positions
    const openPositions = await db.query.positions.findMany({
      where: and(
        eq(positions.tradingAccountId, account.id),
        eq(positions.isOpen, true)
      ),
    });

    const currentOpenContracts = openPositions.reduce(
      (sum, pos) => sum + Math.abs(pos.quantity),
      0
    );

    const totalAfterOrder = currentOpenContracts + request.quantity;

    if (totalAfterOrder > tier.maxOpenContracts) {
      return {
        passed: false,
        details: {
          reason: `Total open contracts ${totalAfterOrder} would exceed limit (${tier.maxOpenContracts})`,
          currentOpenContracts,
          orderQuantity: request.quantity,
          maxAllowed: tier.maxOpenContracts,
        },
      };
    }
  }

  return {
    passed: true,
    details: {
      orderQuantity: request.quantity,
      maxContractsPerTrade: tier.maxContractsPerTrade,
      maxOpenContracts: tier.maxOpenContracts,
    },
  };
}

/**
 * Check that order won't breach drawdown limit
 */
async function checkDrawdown(
  account: any,
  request: OrderValidationRequest
): Promise<ValidationCheck> {
  const tier = account.tier;
  const maxDrawdown = Number(tier.maxDrawdown);
  const currentDrawdown = Number(account.currentDrawdown);

  // Estimate worst-case scenario (order goes against us by 5 points)
  const executionEngine = getMockExecutionEngine();
  const contractInfo = executionEngine.getContractInfo(request.symbol);

  if (!contractInfo) {
    return {
      passed: true,
      details: { reason: "Unknown contract, skipping drawdown check" },
    };
  }

  // Assume worst case: 5 point move against position
  const worstCaseLoss = request.quantity * 5 * contractInfo.tickValue;
  const estimatedDrawdown = currentDrawdown + worstCaseLoss;

  if (estimatedDrawdown > maxDrawdown) {
    return {
      passed: false,
      details: {
        reason: `Potential drawdown $${estimatedDrawdown.toFixed(2)} exceeds max drawdown $${maxDrawdown.toFixed(2)}`,
        currentDrawdown,
        estimatedDrawdown,
        maxDrawdown,
      },
    };
  }

  return {
    passed: true,
    details: {
      currentDrawdown,
      estimatedDrawdown,
      maxDrawdown,
    },
  };
}

/**
 * Check daily loss limit
 */
async function checkDailyLossLimit(
  account: any,
  request: OrderValidationRequest
): Promise<ValidationCheck> {
  const tier = account.tier;

  // Check if daily loss limit already hit
  if (account.dailyLossLimitHit) {
    return {
      passed: false,
      details: {
        reason: "Daily loss limit has been hit. No new trades allowed today.",
        dailyPnl: Number(account.dailyPnl),
        dailyLossLimit: Number(tier.dailyLossLimit),
      },
    };
  }

  const dailyLossLimit = Number(tier.dailyLossLimit);
  const currentDailyPnl = Number(account.dailyPnl);

  // Check if current daily P&L is near limit
  if (currentDailyPnl <= -dailyLossLimit) {
    return {
      passed: false,
      details: {
        reason: `Daily loss $${Math.abs(currentDailyPnl).toFixed(2)} exceeds limit $${dailyLossLimit.toFixed(2)}`,
        currentDailyPnl,
        dailyLossLimit,
      },
    };
  }

  return {
    passed: true,
    details: {
      currentDailyPnl,
      dailyLossLimit,
      remainingBuffer: dailyLossLimit + currentDailyPnl,
    },
  };
}

/**
 * Check margin requirements
 */
async function checkMargin(
  account: any,
  request: OrderValidationRequest
): Promise<ValidationCheck> {
  const requiredMargin = calculateRequiredMargin(request.symbol, request.quantity);

  // Use availableMargin if set, otherwise fallback to currentBalance - usedMargin
  let availableMargin = Number(account.availableMargin);

  // If availableMargin is 0 or not set, calculate from balance
  if (availableMargin === 0) {
    const currentBalance = Number(account.currentBalance);
    const usedMargin = Number(account.usedMargin || 0);
    availableMargin = currentBalance - usedMargin;
  }

  if (requiredMargin > availableMargin) {
    return {
      passed: false,
      details: {
        reason: `Insufficient margin. Need $${requiredMargin.toFixed(2)}, have $${availableMargin.toFixed(2)}`,
        requiredMargin,
        availableMargin,
      },
    };
  }

  return {
    passed: true,
    details: {
      requiredMargin,
      availableMargin,
    },
  };
}

/**
 * Calculate required margin for an order
 */
export function calculateRequiredMargin(symbol: string, quantity: number): number {
  // Margin requirements by contract type
  const marginRequirements: Record<string, number> = {
    ES: 500,   // E-mini S&P 500
    NQ: 500,   // E-mini Nasdaq
    YM: 500,   // E-mini Dow
    CL: 1000,  // Crude Oil
    GC: 1000,  // Gold
  };

  // Extract base symbol
  const baseSymbol = symbol.substring(0, 2).toUpperCase();
  const marginPerContract = marginRequirements[baseSymbol] || 1000; // Default $1,000

  return quantity * marginPerContract;
}
