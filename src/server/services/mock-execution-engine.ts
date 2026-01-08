/**
 * Mock Execution Engine
 * Simulates realistic order fills using the unified market data generator
 *
 * This ensures order fills happen at prices consistent with what's shown on the chart.
 */

import { getMarketData, CONTRACT_SPECS } from "@/lib/mock-data/unified-market-data";

interface Order {
  id: string;
  symbol: string;
  orderType: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
  side: "buy" | "sell";
  quantity: number;
  remainingQuantity: number;
  limitPrice?: number;
  stopPrice?: number;
  trailAmount?: number;
}

interface Execution {
  quantity: number;
  price: number;
  slippage: number;
  commission: number;
  fees: number;
}

export class MockExecutionEngine {
  private intervalMinutes: number = 5;

  /**
   * Extract base symbol from futures contract (e.g., "ESH25" -> "ES")
   */
  private extractBaseSymbol(symbol: string): string {
    for (const base of Object.keys(CONTRACT_SPECS)) {
      if (symbol.startsWith(base)) {
        return base;
      }
    }
    return symbol.substring(0, 2).toUpperCase();
  }

  /**
   * Get current market price for a symbol
   * Uses the unified generator to ensure consistency with chart
   */
  getCurrentPrice(symbol: string): number {
    const generator = getMarketData(symbol, this.intervalMinutes);
    return generator.getCurrentPrice();
  }

  /**
   * Execute a market order with realistic slippage
   */
  async executeMarketOrder(order: Order): Promise<Execution> {
    const currentPrice = this.getCurrentPrice(order.symbol);
    const slippage = this.calculateSlippage(order);

    // Apply slippage based on side
    const fillPrice = order.side === "buy"
      ? currentPrice + slippage
      : currentPrice - slippage;

    const commission = this.calculateCommission(order.quantity);
    const fees = this.calculateFees(order.quantity);

    return {
      quantity: order.remainingQuantity,
      price: fillPrice,
      slippage,
      commission,
      fees,
    };
  }

  /**
   * Check if a limit order should fill at current price
   */
  async checkLimitOrderFill(order: Order): Promise<Execution | null> {
    const currentPrice = this.getCurrentPrice(order.symbol);

    // Buy limit: fill when market price <= limit price
    if (order.side === "buy" && currentPrice <= order.limitPrice!) {
      return this.fillLimitOrder(order, currentPrice);
    }

    // Sell limit: fill when market price >= limit price
    if (order.side === "sell" && currentPrice >= order.limitPrice!) {
      return this.fillLimitOrder(order, currentPrice);
    }

    return null;
  }

  /**
   * Fill a limit order at the better of limit price or current price
   */
  private fillLimitOrder(order: Order, currentPrice: number): Execution {
    // Fill at the better price for the trader
    const fillPrice = order.side === "buy"
      ? Math.min(order.limitPrice!, currentPrice)
      : Math.max(order.limitPrice!, currentPrice);

    const commission = this.calculateCommission(order.remainingQuantity);
    const fees = this.calculateFees(order.remainingQuantity);

    return {
      quantity: order.remainingQuantity,
      price: fillPrice,
      slippage: 0,
      commission,
      fees,
    };
  }

  /**
   * Check if a stop order should trigger
   */
  async checkStopOrderTrigger(order: Order): Promise<boolean> {
    const currentPrice = this.getCurrentPrice(order.symbol);

    // Buy stop: trigger when price rises to stop price
    if (order.side === "buy" && currentPrice >= order.stopPrice!) {
      return true;
    }

    // Sell stop: trigger when price falls to stop price
    if (order.side === "sell" && currentPrice <= order.stopPrice!) {
      return true;
    }

    return false;
  }

  /**
   * Execute a stop order that has been triggered (converts to market order)
   */
  async executeStopOrder(order: Order): Promise<Execution> {
    return this.executeMarketOrder(order);
  }

  /**
   * Update trailing stop price and check for trigger
   */
  async updateTrailingStop(order: Order, currentStopPrice: number): Promise<{ newStopPrice: number; triggered: boolean }> {
    const currentPrice = this.getCurrentPrice(order.symbol);
    let newStopPrice = currentStopPrice;

    if (order.side === "sell") {
      // Trailing stop for long position: stop trails below market price
      const calculatedStop = currentPrice - order.trailAmount!;
      if (calculatedStop > currentStopPrice) {
        newStopPrice = calculatedStop;
      }

      if (currentPrice <= newStopPrice) {
        return { newStopPrice, triggered: true };
      }
    } else {
      // Trailing stop for short position: stop trails above market price
      const calculatedStop = currentPrice + order.trailAmount!;
      if (calculatedStop < currentStopPrice) {
        newStopPrice = calculatedStop;
      }

      if (currentPrice >= newStopPrice) {
        return { newStopPrice, triggered: true };
      }
    }

    return { newStopPrice, triggered: false };
  }

  /**
   * Calculate realistic slippage for market orders
   */
  private calculateSlippage(order: Order): number {
    const baseSymbol = this.extractBaseSymbol(order.symbol);
    const spec = CONTRACT_SPECS[baseSymbol];

    if (!spec) {
      return 0;
    }

    const tickSize = spec.tickSize;

    // Base slippage: 0-2 ticks for small orders
    const baseTicks = Math.random() * 2;
    const sizeFactor = 1 + (order.quantity / 10);
    const slippageTicks = baseTicks * sizeFactor;

    return slippageTicks * tickSize;
  }

  /**
   * Calculate commission ($1.50 per contract per side)
   */
  private calculateCommission(quantity: number): number {
    return quantity * 1.5;
  }

  /**
   * Calculate exchange/regulatory fees ($0.50 per contract per side)
   */
  private calculateFees(quantity: number): number {
    return quantity * 0.5;
  }

  /**
   * Get contract specifications
   */
  getContractInfo(symbol: string) {
    const baseSymbol = this.extractBaseSymbol(symbol);
    return CONTRACT_SPECS[baseSymbol];
  }
}

// Singleton instance
let mockExecutionEngine: MockExecutionEngine | null = null;

export function getMockExecutionEngine(): MockExecutionEngine {
  if (!mockExecutionEngine) {
    mockExecutionEngine = new MockExecutionEngine();
  }
  return mockExecutionEngine;
}
