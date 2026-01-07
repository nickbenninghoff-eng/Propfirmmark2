import { NextRequest, NextResponse } from "next/server";
import { MarketDataGenerator } from "@/lib/mock-data/market-data-generator";

/**
 * GET /api/market-data/candles?symbol={symbol}&interval={interval}&count={count}
 * Get historical candlestick data for a symbol
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const interval = parseInt(searchParams.get("interval") || "5"); // default 5 minutes
    const count = parseInt(searchParams.get("count") || "100"); // default 100 candles

    if (!symbol) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }

    // Extract base symbol (e.g., "ESH25" -> "ES")
    const baseSymbol = symbol.substring(0, 2).toUpperCase();

    const generator = new MarketDataGenerator(baseSymbol);
    const candles = generator.generateHistoricalCandles(interval, count);

    // Format for Lightweight Charts
    const formattedCandles = candles.map(candle => ({
      time: Math.floor(candle.timestamp.getTime() / 1000), // Unix timestamp in seconds
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));

    return NextResponse.json({
      success: true,
      symbol,
      interval,
      candles: formattedCandles,
      currentPrice: generator.getCurrentPrice(),
    });
  } catch (error) {
    console.error("Error fetching candles:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch candles",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
