/**
 * Mock Market Data Generator
 * Generates realistic candlestick data for futures contracts
 */

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ContractConfig {
  symbol: string;
  name: string;
  basePrice: number;
  tickSize: number;
  tickValue: number; // Dollar value per point
  volatility: number; // Standard deviation as percentage of price
  marketOpen: { hour: number; minute: number }; // ET
  marketClose: { hour: number; minute: number }; // ET
}

// Popular futures contracts
export const CONTRACTS: Record<string, ContractConfig> = {
  ES: {
    symbol: "ES",
    name: "E-mini S&P 500",
    basePrice: 5800,
    tickSize: 0.25,
    tickValue: 50, // $50 per point
    volatility: 0.008, // ~0.8% daily volatility
    marketOpen: { hour: 9, minute: 30 },
    marketClose: { hour: 16, minute: 0 },
  },
  NQ: {
    symbol: "NQ",
    name: "E-mini NASDAQ-100",
    basePrice: 20500,
    tickSize: 0.25,
    tickValue: 20, // $20 per point
    volatility: 0.012, // ~1.2% daily volatility
    marketOpen: { hour: 9, minute: 30 },
    marketClose: { hour: 16, minute: 0 },
  },
  YM: {
    symbol: "YM",
    name: "E-mini Dow",
    basePrice: 42000,
    tickSize: 1,
    tickValue: 5, // $5 per point
    volatility: 0.007,
    marketOpen: { hour: 9, minute: 30 },
    marketClose: { hour: 16, minute: 0 },
  },
  CL: {
    symbol: "CL",
    name: "Crude Oil",
    basePrice: 75,
    tickSize: 0.01,
    tickValue: 1000, // $1000 per dollar
    volatility: 0.015, // ~1.5% daily volatility
    marketOpen: { hour: 9, minute: 0 },
    marketClose: { hour: 14, minute: 30 },
  },
  GC: {
    symbol: "GC",
    name: "Gold",
    basePrice: 2050,
    tickSize: 0.10,
    tickValue: 100, // $100 per dollar
    volatility: 0.010,
    marketOpen: { hour: 8, minute: 20 },
    marketClose: { hour: 13, minute: 30 },
  },
};

/**
 * Generate realistic candlestick data
 */
export class MarketDataGenerator {
  private contract: ContractConfig;
  private currentPrice: number;
  private trend: number = 0; // Current trend direction
  private peakPrice: number; // Track price peaks for reversals
  private troughPrice: number; // Track price troughs for reversals
  private barsSinceTrendChange: number = 0;

  constructor(symbol: string) {
    const config = CONTRACTS[symbol];
    if (!config) {
      throw new Error(`Unknown contract: ${symbol}`);
    }
    this.contract = config;
    // Add some randomness to base price
    this.currentPrice = config.basePrice * (1 + (Math.random() - 0.5) * 0.02);
    this.peakPrice = this.currentPrice;
    this.troughPrice = this.currentPrice;
  }

  /**
   * Generate historical candles
   */
  generateHistoricalCandles(
    intervalMinutes: number = 5,
    count: number = 100
  ): Candle[] {
    const candles: Candle[] = [];
    const now = new Date();

    // Start from 'count' intervals ago
    let currentTime = new Date(now.getTime() - count * intervalMinutes * 60 * 1000);

    for (let i = 0; i < count; i++) {
      const candle = this.generateCandle(currentTime, intervalMinutes);
      candles.push(candle);

      // Move to next interval
      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
    }

    return candles;
  }

  /**
   * Generate a single candle
   */
  private generateCandle(timestamp: Date, intervalMinutes: number): Candle {
    const open = this.currentPrice;

    // Calculate price movement
    const volatilityPerMinute = this.contract.volatility / Math.sqrt(390); // 6.5 hour trading day
    const intervalVolatility = volatilityPerMinute * Math.sqrt(intervalMinutes);

    // Add trend component (trend can change)
    if (Math.random() < 0.05) { // 5% chance to change trend each candle
      this.trend = (Math.random() - 0.5) * 2; // -1 to 1
    }

    const trendComponent = this.trend * intervalVolatility * 0.3;
    const randomComponent = (Math.random() - 0.5) * 2 * intervalVolatility;
    const totalMove = (trendComponent + randomComponent) * open;

    const close = open + totalMove;

    // Generate high and low based on volatility
    const candleVolatility = Math.abs(totalMove) * 1.5;
    const high = Math.max(open, close) + candleVolatility * Math.random();
    const low = Math.min(open, close) - candleVolatility * Math.random();

    // Round to tick size
    const roundToTick = (price: number) => {
      return Math.round(price / this.contract.tickSize) * this.contract.tickSize;
    };

    // Generate volume (higher during high volatility)
    const baseVolume = 1000 + Math.random() * 2000;
    const volatilityMultiplier = 1 + Math.abs(totalMove / open) * 10;
    const volume = Math.floor(baseVolume * volatilityMultiplier);

    // Update current price for next candle
    this.currentPrice = close;

    return {
      timestamp,
      open: roundToTick(open),
      high: roundToTick(high),
      low: roundToTick(low),
      close: roundToTick(close),
      volume,
    };
  }

  /**
   * Generate candles for a specific trading day
   */
  generateTradingDayCandles(
    date: Date,
    intervalMinutes: number = 5
  ): Candle[] {
    const candles: Candle[] = [];

    // Create market open time
    const marketOpen = new Date(date);
    marketOpen.setHours(this.contract.marketOpen.hour, this.contract.marketOpen.minute, 0, 0);

    // Create market close time
    const marketClose = new Date(date);
    marketClose.setHours(this.contract.marketClose.hour, this.contract.marketClose.minute, 0, 0);

    let currentTime = new Date(marketOpen);

    while (currentTime < marketClose) {
      const candle = this.generateCandle(currentTime, intervalMinutes);
      candles.push(candle);

      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
    }

    return candles;
  }

  /**
   * Get current price
   */
  getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * Generate next tick (real-time price update)
   * Simulates small price movements for live trading with mean reversion
   */
  generateNextTick(): number {
    this.barsSinceTrendChange++;

    // Volatility scaled for realistic tick-by-tick movement
    // Adjusted to generate 0.5-2 ticks per update on average
    const tickVolatility = this.contract.volatility / 200; // Balanced per-tick volatility

    // Update peak/trough tracking
    if (this.currentPrice > this.peakPrice) {
      this.peakPrice = this.currentPrice;
    }
    if (this.currentPrice < this.troughPrice) {
      this.troughPrice = this.currentPrice;
    }

    // Mean reversion logic - pull back toward base price
    const basePrice = this.contract.basePrice;
    const distanceFromBase = (this.currentPrice - basePrice) / basePrice;

    // Calculate move away from base as percentage
    const meanReversionForce = -distanceFromBase * 0.3; // Pull back toward mean

    // Trend exhaustion - reverse after extended moves
    const trendExtension = this.barsSinceTrendChange / 20; // Trend gets tired after ~20 bars
    let trendReversalChance = 0.05; // Base 5% chance

    // Increase reversal chance based on distance from mean and trend age
    if (Math.abs(distanceFromBase) > 0.015) { // More than 1.5% from base
      trendReversalChance += Math.abs(distanceFromBase) * 2; // Higher chance to reverse
    }

    if (this.barsSinceTrendChange > 15) {
      trendReversalChance += trendExtension * 0.5; // Increase reversal chance with age
    }

    // Trend change logic
    if (Math.random() < trendReversalChance) {
      // Reverse or change trend
      if (Math.abs(distanceFromBase) > 0.01) {
        // Force reversal toward mean if far from base
        this.trend = distanceFromBase > 0 ? -1 : 1;
      } else {
        // Random new trend
        this.trend = (Math.random() - 0.5) * 2;
      }
      this.barsSinceTrendChange = 0;
      this.peakPrice = this.currentPrice;
      this.troughPrice = this.currentPrice;
    }

    // Calculate price movement
    const trendComponent = this.trend * tickVolatility * 0.5;
    const randomComponent = (Math.random() - 0.5) * 2 * tickVolatility;
    const meanReversionComponent = meanReversionForce * tickVolatility;

    const totalMove = (trendComponent + randomComponent + meanReversionComponent) * this.currentPrice;

    // Update price
    this.currentPrice += totalMove;

    // Round to tick size
    const roundToTick = (price: number) => {
      return Math.round(price / this.contract.tickSize) * this.contract.tickSize;
    };

    this.currentPrice = roundToTick(this.currentPrice);

    return this.currentPrice;
  }

  /**
   * Get contract info
   */
  getContractInfo(): ContractConfig {
    return this.contract;
  }
}

/**
 * Generate a realistic trade fill
 */
export interface TradeFill {
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
  direction: "long" | "short";
  contracts: number;
  commission: number;
  netPnl: number;
}

export function generateRandomTrade(
  symbol: string,
  date: Date = new Date()
): TradeFill {
  const generator = new MarketDataGenerator(symbol);
  const config = CONTRACTS[symbol];

  // Generate candles for the day
  const candles = generator.generateTradingDayCandles(date, 5);

  if (candles.length < 10) {
    throw new Error("Not enough candles generated");
  }

  // Pick random entry point (not too early, not too late)
  const entryIndex = Math.floor(Math.random() * (candles.length - 10)) + 2;
  const entryCandle = candles[entryIndex];

  // Hold for 5-30 candles (25-150 minutes)
  const holdTime = Math.floor(Math.random() * 25) + 5;
  const exitIndex = Math.min(entryIndex + holdTime, candles.length - 1);
  const exitCandle = candles[exitIndex];

  // Random direction
  const direction = Math.random() > 0.5 ? "long" : "short";

  // Entry price somewhere in the entry candle
  const entryPrice = entryCandle.low + Math.random() * (entryCandle.high - entryCandle.low);

  // Exit price somewhere in the exit candle
  const exitPrice = exitCandle.low + Math.random() * (exitCandle.high - exitCandle.low);

  // Calculate P&L
  const contracts = Math.floor(Math.random() * 5) + 1;
  const priceMove = direction === "long" ? exitPrice - entryPrice : entryPrice - exitPrice;

  // Contract multipliers
  const multipliers: Record<string, number> = {
    ES: 50,
    NQ: 20,
    YM: 5,
    CL: 1000,
    GC: 100,
  };

  const multiplier = multipliers[symbol] || 50;
  const grossPnl = priceMove * multiplier * contracts;

  // Commission ($1.50 per side per contract is common)
  const commission = contracts * 1.50 * 2;
  const netPnl = grossPnl - commission;

  return {
    symbol,
    entryPrice: Math.round(entryPrice / config.tickSize) * config.tickSize,
    exitPrice: Math.round(exitPrice / config.tickSize) * config.tickSize,
    entryTime: entryCandle.timestamp,
    exitTime: exitCandle.timestamp,
    direction,
    contracts,
    commission,
    netPnl: Math.round(netPnl * 100) / 100,
  };
}
