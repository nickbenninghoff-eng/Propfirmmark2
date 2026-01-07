import { NextRequest, NextResponse } from "next/server";
import { getMockExecutionEngine } from "@/server/services/mock-execution-engine";

/**
 * GET /api/market-data/price?symbol={symbol}
 * Get current market price for a symbol
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }

    const executionEngine = getMockExecutionEngine();
    const price = executionEngine.getCurrentPrice(symbol);

    console.log(`[Price API] Returning price for ${symbol}: $${price}`);

    return NextResponse.json({
      success: true,
      symbol,
      price,
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
