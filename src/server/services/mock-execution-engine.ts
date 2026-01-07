/**
 * Mock Execution Engine
 * Simulates realistic order fills against mock market data
 */

import { MarketDataGenerator, CONTRACTS } from "@/lib/mock-data/market-data-generator";

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
  private generators: Map<string, MarketDataGenerator> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly PRICE_CACHE_MS = 100; // Cache price for 100ms

  /**
   * Get or create market data generator for a symbol
   */
  private getGenerator(symbol: string): MarketDataGenerator {
    // Extract base symbol (e.g., "ESH25" -> "ES")
    const baseSymbol = this.extractBaseSymbol(symbol);

    if (!this.generators.has(baseSymbol)) {
      this.generators.set(baseSymbol, new MarketDataGenerator(baseSymbol));
    }

    return this.generators.get(baseSymbol)!;
  }

  /**
   * Extract base symbol from futures contract (e.g., "ESH25" -> "ES")
   */
  private extractBaseSymbol(symbol: string): string {
    const futuresSymbols = ['ES', 'NQ', 'YM', 'CL', 'GC'];

    for (const baseSymbol of futuresSymbols) {
      if (symbol.startsWith(baseSymbol)) {
        return baseSymbol;
      }
    }

    // Fallback: return first 2 characters
    return symbol.substring(0, 2).toUpperCase();
  }

  /**
   * Get current market price for a symbol
   * Uses caching to ensure consistent prices across simultaneous reads
   */
  getCurrentPrice(symbol: string): number {
    const baseSymbol = this.extractBaseSymbol(symbol);
    const now = Date.now();
    const cached = this.priceCache.get(baseSymbol);

    // Return cached price if still fresh (within 100ms)
    if (cached && (now - cached.timestamp) < this.PRICE_CACHE_MS) {
      return cached.price;
    }

    // Generate new tick and cache it
    const generator = this.getGenerator(symbol);
    const newPrice = generator.generateNextTick();

    this.priceCache.set(baseSymbol, {
      price: newPrice,
      timestamp: now,
    });

    return newPrice;
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
      return this.fillLimitOrder(order, order.limitPrice!);
    }

    // Sell limit: fill when market price >= limit price
    if (order.side === "sell" && currentPrice >= order.limitPrice!) {
      return this.fillLimitOrder(order, order.limitPrice!);
    }

    return null;
  }

  /**
   * Fill a limit order (no slippage on limit orders)
   */
  private fillLimitOrder(order: Order, fillPrice: number): Execution {
    const commission = this.calculateCommission(order.remainingQuantity);
    const fees = this.calculateFees(order.remainingQuantity);

    return {
      quantity: order.remainingQuantity,
      price: fillPrice,
      slippage: 0, // No slippage on limit orders
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
      // Move stop up as price rises
      const calculatedStop = currentPrice - order.trailAmount!;
      if (calculatedStop > currentStopPrice) {
        newStopPrice = calculatedStop;
      }

      // Check if triggered (price fell to stop)
      if (currentPrice <= newStopPrice) {
        return { newStopPrice, triggered: true };
      }
    } else {
      // Trailing stop for short position: stop trails above market price
      // Move stop down as price falls
      const calculatedStop = currentPrice + order.trailAmount!;
      if (calculatedStop < currentStopPrice) {
        newStopPrice = calculatedStop;
      }

      // Check if triggered (price rose to stop)
      if (currentPrice >= newStopPrice) {
        return { newStopPrice, triggered: true };
      }
    }

    return { newStopPrice, triggered: false };
  }

  /**
   * Calculate realistic slippage for market orders
   * Larger orders get more slippage
   */
  private calculateSlippage(order: Order): number {
    const baseSymbol = this.extractBaseSymbol(order.symbol);
    const contractInfo = CONTRACTS[baseSymbol];

    if (!contractInfo) {
      return 0;
    }

    const tickSize = contractInfo.tickSize;

    // Base slippage: 0-2 ticks for small orders
    // Scale up with order size
    const baseTicks = Math.random() * 2;
    const sizeFactor = 1 + (order.quantity / 10); // Larger orders = more slippage
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
   * Simulate partial fill (10% chance for large orders)
   */
  shouldPartialFill(order: Order): { shouldPartial: boolean; fillQuantity: number } {
    // Only consider partial fills for large orders (5+ contracts)
    if (order.remainingQuantity < 5) {
      return { shouldPartial: false, fillQuantity: order.remainingQuantity };
    }

    // 10% chance of partial fill
    if (Math.random() < 0.1) {
      // Fill 30-70% of remaining quantity
      const fillPercent = 0.3 + (Math.random() * 0.4);
      const fillQuantity = Math.floor(order.remainingQuantity * fillPercent);

      return { shouldPartial: true, fillQuantity: Math.max(1, fillQuantity) };
    }

    return { shouldPartial: false, fillQuantity: order.remainingQuantity };
  }

  /**
   * Get contract specifications for margin calculations
   */
  getContractInfo(symbol: string) {
    const baseSymbol = this.extractBaseSymbol(symbol);
    return CONTRACTS[baseSymbol];
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
