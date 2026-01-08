import { NextRequest, NextResponse } from "next/server";
import { getMarketData } from "@/lib/mock-data/unified-market-data";

/**
 * GET /api/market-data/price?symbol={symbol}&interval={interval}
 * Get current market price for a symbol
 *
 * Uses the unified market data generator to ensure the price
 * is consistent with the candles shown on the chart.
 * Each call generates a small tick movement and updates the current candle.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const interval = parseInt(searchParams.get("interval") || "5");

    if (!symbol) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }

    // Get the unified generator (same instance as candles API)
    const generator = getMarketData(symbol, interval);

    // Generate a tick - this updates the current candle and returns it
    const currentCandle = generator.tick();
    const price = generator.getCurrentPrice();

    return NextResponse.json({
      success: true,
      symbol,
      price,
      currentCandle, // Include current candle for chart updates
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching market price:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch market price",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
