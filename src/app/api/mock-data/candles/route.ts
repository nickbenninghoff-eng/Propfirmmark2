import { NextRequest, NextResponse } from "next/server";
import { MarketDataGenerator, CONTRACTS } from "@/lib/mock-data/market-data-generator";
import { getMockExecutionEngine } from "@/server/services/mock-execution-engine";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol") || "ES";
    const intervalMinutes = parseInt(searchParams.get("interval") || "5");
    const count = parseInt(searchParams.get("count") || "100");

    // Validate symbol
    if (!CONTRACTS[symbol]) {
      return NextResponse.json(
        { error: `Unknown symbol: ${symbol}. Available: ${Object.keys(CONTRACTS).join(", ")}` },
        { status: 400 }
      );
    }

    // Get the current price from the execution engine (singleton) FIRST
    const executionEngine = getMockExecutionEngine();
    const currentPrice = executionEngine.getCurrentPrice(symbol);

    // Generate candles
    const generator = new MarketDataGenerator(symbol);
    const candles = generator.generateHistoricalCandles(intervalMinutes, count);

    // Shift ALL candles to match the current price
    // This preserves candlestick patterns while aligning to the execution engine's price
    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const priceOffset = currentPrice - lastCandle.close;
      const tickSize = CONTRACTS[symbol].tickSize;

      // Apply offset to all candles
      for (const candle of candles) {
        candle.open = Math.round((candle.open + priceOffset) / tickSize) * tickSize;
        candle.high = Math.round((candle.high + priceOffset) / tickSize) * tickSize;
        candle.low = Math.round((candle.low + priceOffset) / tickSize) * tickSize;
        candle.close = Math.round((candle.close + priceOffset) / tickSize) * tickSize;
      }

      // Ensure the very last candle closes exactly at current price
      const finalCandle = candles[candles.length - 1];
      finalCandle.close = currentPrice;
    }

    return NextResponse.json({
      success: true,
      symbol,
      interval: `${intervalMinutes}Min`,
      count: candles.length,
      contractInfo: generator.getContractInfo(),
      candles: candles.map(c => ({
        time: Math.floor(c.timestamp.getTime() / 1000), // Unix timestamp in seconds
        timestamp: c.timestamp.toISOString(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
    });
  } catch (error) {
    console.error("Error generating mock candles:", error);
    return NextResponse.json(
      {
        error: "Failed to generate market data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
