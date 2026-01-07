import { NextRequest, NextResponse } from "next/server";
import { MarketDataGenerator, CONTRACTS } from "@/lib/mock-data/market-data-generator";

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

    // Generate candles
    const generator = new MarketDataGenerator(symbol);
    const candles = generator.generateHistoricalCandles(intervalMinutes, count);

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
