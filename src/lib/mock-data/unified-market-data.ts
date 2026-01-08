/**
 * Unified Market Data Service
 *
 * A single source of truth for mock market data that ensures:
 * - Historical candles and live price are consistent
 * - Candle continuity (each open = previous close)
 * - Bounded, realistic volatility
 * - Proper OHLC relationships
 * - TradingView Lightweight Charts compatibility
 */

export interface Candle {
  time: number; // Unix timestamp in SECONDS (TradingView format)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ContractSpec {
  symbol: string;
  name: string;
  tickSize: number;
  tickValue: number; // Dollar value per point
  typicalDailyRange: number; // Typical daily high-low range in points
}

// Contract specifications
export const CONTRACT_SPECS: Record<string, ContractSpec> = {
  ES: {
    symbol: "ES",
    name: "E-mini S&P 500",
    tickSize: 0.25,
    tickValue: 50,
    typicalDailyRange: 50, // ~50 points typical daily range
  },
  NQ: {
    symbol: "NQ",
    name: "E-mini NASDAQ-100",
    tickSize: 0.25,
    tickValue: 20,
    typicalDailyRange: 200, // ~200 points typical daily range
  },
  YM: {
    symbol: "YM",
    name: "E-mini Dow",
    tickSize: 1,
    tickValue: 5,
    typicalDailyRange: 400,
  },
  CL: {
    symbol: "CL",
    name: "Crude Oil",
    tickSize: 0.01,
    tickValue: 1000,
    typicalDailyRange: 3, // ~$3 typical daily range
  },
  GC: {
    symbol: "GC",
    name: "Gold",
    tickSize: 0.10,
    tickValue: 100,
    typicalDailyRange: 30, // ~$30 typical daily range
  },
};

// Base prices for each contract (realistic current market levels)
const BASE_PRICES: Record<string, number> = {
  ES: 5800,
  NQ: 20500,
  YM: 42000,
  CL: 75,
  GC: 2050,
};

/**
 * Unified Market Data Generator
 * Maintains consistent state between historical candles and live price
 */
export class UnifiedMarketDataGenerator {
  private symbol: string;
  private baseSymbol: string;
  private spec: ContractSpec;
  private intervalMinutes: number;

  // State
  private historicalCandles: Candle[] = [];
  private currentCandle: Candle | null = null;
  private currentCandleStartTime: number = 0;
  private lastPrice: number;
  private initialized: boolean = false;

  constructor(symbol: string, intervalMinutes: number = 5) {
    this.symbol = symbol;
    this.baseSymbol = this.extractBaseSymbol(symbol);
    this.spec = CONTRACT_SPECS[this.baseSymbol] || CONTRACT_SPECS.ES;
    this.intervalMinutes = intervalMinutes;
    this.lastPrice = BASE_PRICES[this.baseSymbol] || 5800;
  }

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
   * Round price to tick size
   */
  private roundToTick(price: number): number {
    return Math.round(price / this.spec.tickSize) * this.spec.tickSize;
  }

  /**
   * Get the candle start time for a given timestamp
   * Aligns to interval boundaries (e.g., :00, :05, :10 for 5-min candles)
   */
  private getCandleStartTime(timestamp: number): number {
    const intervalSeconds = this.intervalMinutes * 60;
    return Math.floor(timestamp / intervalSeconds) * intervalSeconds;
  }

  /**
   * Calculate volatility per candle based on typical daily range
   * Trading day ≈ 6.5 hours = 390 minutes
   * For 5-min candles: 78 candles per day
   */
  private getCandleVolatility(): number {
    const candlesPerDay = 390 / this.intervalMinutes;
    // Typical candle range = daily range / sqrt(candlesPerDay)
    // We use a fraction of this for average movement
    return this.spec.typicalDailyRange / Math.sqrt(candlesPerDay) / 4;
  }

  /**
   * Generate a random price move within bounded volatility
   */
  private generatePriceMove(): number {
    const volatility = this.getCandleVolatility();
    // Use normal-ish distribution (sum of uniforms approximates normal)
    const random = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const move = random * volatility;
    return this.roundToTick(move);
  }

  /**
   * Generate historical candles with proper continuity
   * Each candle's open = previous candle's close
   *
   * IMPORTANT: Only generates candles ONCE. Subsequent calls return cached candles.
   * This ensures price consistency between chart and order execution.
   */
  generateHistoricalCandles(count: number = 100): Candle[] {
    // If already initialized, return existing candles (don't regenerate!)
    if (this.initialized && this.historicalCandles.length > 0) {
      console.log(`[MarketData] Returning cached ${this.historicalCandles.length} candles, currentPrice=${this.lastPrice}`);
      return this.historicalCandles;
    }

    console.log(`[MarketData] Generating initial ${count} candles for first time`);

    const now = Math.floor(Date.now() / 1000);
    const currentIntervalStart = this.getCandleStartTime(now);
    const intervalSeconds = this.intervalMinutes * 60;

    // Generate candles from oldest to newest
    const candles: Candle[] = [];

    // Start price - work backwards and then forwards for continuity
    // First, generate the close prices going backwards
    const closePrices: number[] = [];
    let price = this.lastPrice;

    for (let i = 0; i < count; i++) {
      closePrices.unshift(price); // Add to front
      // Move price backwards (reverse of forward movement)
      price = this.roundToTick(price - this.generatePriceMove());
    }

    // Now generate candles with proper OHLC
    for (let i = 0; i < count; i++) {
      const candleTime = currentIntervalStart - (count - i) * intervalSeconds;
      const close = closePrices[i];
      const open = i === 0 ? this.roundToTick(close - this.generatePriceMove()) : candles[i - 1].close;

      // Generate high and low within realistic bounds
      const range = Math.abs(close - open);
      const extraRange = Math.max(this.spec.tickSize, range * 0.3 + Math.random() * this.getCandleVolatility() * 0.5);

      const high = this.roundToTick(Math.max(open, close) + extraRange * Math.random());
      const low = this.roundToTick(Math.min(open, close) - extraRange * Math.random());

      // Generate volume
      const baseVolume = 1000 + Math.random() * 2000;
      const volatilityMultiplier = 1 + (range / this.getCandleVolatility());
      const volume = Math.floor(baseVolume * volatilityMultiplier);

      candles.push({
        time: candleTime,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    // Update state
    this.historicalCandles = candles;
    this.lastPrice = candles[candles.length - 1].close;

    // Initialize current candle
    this.currentCandleStartTime = currentIntervalStart;
    this.currentCandle = {
      time: currentIntervalStart,
      open: this.lastPrice,
      high: this.lastPrice,
      low: this.lastPrice,
      close: this.lastPrice,
      volume: Math.floor(500 + Math.random() * 500),
    };

    this.initialized = true;

    console.log(`[MarketData] Initial candles generated, lastPrice=${this.lastPrice}`);

    return candles;
  }

  /**
   * Get all candles including the current forming candle
   */
  getAllCandles(): Candle[] {
    if (!this.initialized) {
      this.generateHistoricalCandles();
    }

    if (this.currentCandle) {
      return [...this.historicalCandles, this.currentCandle];
    }
    return this.historicalCandles;
  }

  /**
   * Update the current candle with a new tick
   * Returns the updated current candle
   */
  tick(): Candle {
    if (!this.initialized) {
      this.generateHistoricalCandles();
    }

    const now = Math.floor(Date.now() / 1000);
    const currentIntervalStart = this.getCandleStartTime(now);

    // Check if we need to start a new candle
    if (currentIntervalStart > this.currentCandleStartTime) {
      // Finalize current candle and add to historical
      if (this.currentCandle) {
        this.historicalCandles.push(this.currentCandle);
        // Keep only last 200 candles to prevent memory growth
        if (this.historicalCandles.length > 200) {
          this.historicalCandles.shift();
        }
      }

      // Start new candle - open = previous close
      this.currentCandleStartTime = currentIntervalStart;
      this.currentCandle = {
        time: currentIntervalStart,
        open: this.lastPrice,
        high: this.lastPrice,
        low: this.lastPrice,
        close: this.lastPrice,
        volume: Math.floor(500 + Math.random() * 500),
      };
      console.log(`[tick] New candle started, price=${this.lastPrice}`);
    }

    // Generate small price movement
    const move = this.generateSmallMove();
    const oldPrice = this.lastPrice;
    this.lastPrice = this.roundToTick(this.lastPrice + move);

    // Log price changes (every ~10th tick to reduce noise)
    if (Math.random() < 0.1) {
      console.log(`[tick] Price: ${oldPrice} -> ${this.lastPrice} (move=${move})`);
    }

    // Update current candle
    if (this.currentCandle) {
      this.currentCandle.close = this.lastPrice;
      this.currentCandle.high = Math.max(this.currentCandle.high, this.lastPrice);
      this.currentCandle.low = Math.min(this.currentCandle.low, this.lastPrice);
      this.currentCandle.volume += Math.floor(Math.random() * 50);
    }

    return this.currentCandle!;
  }

  /**
   * Generate a small tick-by-tick price movement
   * Much smaller than candle-level volatility
   */
  private generateSmallMove(): number {
    // Tick moves should be small but visible
    // Use at least 1 tick movement with some randomness
    const random = Math.random();

    // 70% chance of moving, 30% chance of staying flat
    if (random < 0.3) {
      return 0;
    }

    // Direction: roughly 50/50 up or down
    const direction = Math.random() > 0.5 ? 1 : -1;

    // Magnitude: 1-3 ticks most of the time
    const ticks = Math.ceil(Math.random() * 3);

    return direction * ticks * this.spec.tickSize;
  }

  /**
   * Get current price (always equals current candle's close)
   */
  getCurrentPrice(): number {
    if (!this.initialized) {
      this.generateHistoricalCandles();
    }
    return this.lastPrice;
  }

  /**
   * Get the current (forming) candle
   */
  getCurrentCandle(): Candle | null {
    if (!this.initialized) {
      this.generateHistoricalCandles();
    }
    return this.currentCandle;
  }

  /**
   * Get contract specifications
   */
  getSpec(): ContractSpec {
    return this.spec;
  }

  /**
   * Get interval in minutes
   */
  getIntervalMinutes(): number {
    return this.intervalMinutes;
  }
}

/**
 * Singleton manager for market data generators
 * Ensures one generator per symbol/interval combination
 */
class MarketDataManager {
  private generators: Map<string, UnifiedMarketDataGenerator> = new Map();

  /**
   * Get or create a generator for a symbol/interval
   */
  getGenerator(symbol: string, intervalMinutes: number = 5): UnifiedMarketDataGenerator {
    const key = `${symbol}-${intervalMinutes}`;

    if (!this.generators.has(key)) {
      console.log(`[MarketDataManager] Creating new generator for ${key}`);
      const generator = new UnifiedMarketDataGenerator(symbol, intervalMinutes);
      this.generators.set(key, generator);
    }

    return this.generators.get(key)!;
  }

  /**
   * Reset a generator (useful for testing)
   */
  resetGenerator(symbol: string, intervalMinutes: number = 5): void {
    const key = `${symbol}-${intervalMinutes}`;
    this.generators.delete(key);
  }

  /**
   * Reset all generators
   */
  resetAll(): void {
    this.generators.clear();
  }
}

// Use globalThis to persist singleton across hot reloads in development
const globalForMarketData = globalThis as unknown as {
  marketDataManager: MarketDataManager | undefined;
};

// Export singleton manager - survives hot module replacement
export const marketDataManager =
  globalForMarketData.marketDataManager ?? new MarketDataManager();

// Persist in development
if (process.env.NODE_ENV !== "production") {
  globalForMarketData.marketDataManager = marketDataManager;
}

/**
 * Convenience function to get market data for a symbol
 */
export function getMarketData(symbol: string, intervalMinutes: number = 5) {
  return marketDataManager.getGenerator(symbol, intervalMinutes);
}
