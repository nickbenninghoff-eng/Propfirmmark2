import { NextRequest, NextResponse } from "next/server";
import { getMarketData } from "@/lib/mock-data/unified-market-data";

/**
 * GET /api/market-data/candles?symbol={symbol}&interval={interval}&count={count}
 * Get historical candlestick data for a symbol
 *
 * Uses the unified market data generator to ensure consistency
 * between historical candles and live price updates.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const interval = parseInt(searchParams.get("interval") || "5");
    const count = parseInt(searchParams.get("count") || "100");

    if (!symbol) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }

    // Get the unified generator for this symbol/interval
    const generator = getMarketData(symbol, interval);

    // Generate historical candles (this also initializes the current candle)
    const historicalCandles = generator.generateHistoricalCandles(count);

    // Get current price (equals last candle close or current forming candle close)
    const currentPrice = generator.getCurrentPrice();

    console.log(`[Candles API] Generated ${historicalCandles.length} candles for ${symbol}`);
    console.log(`[Candles API] Last candle close: $${historicalCandles[historicalCandles.length - 1]?.close}`);
    console.log(`[Candles API] Current price: $${currentPrice}`);

    return NextResponse.json({
      success: true,
      symbol,
      interval,
      candles: historicalCandles,
      currentPrice,
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
