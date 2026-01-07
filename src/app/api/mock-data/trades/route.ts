import { NextRequest, NextResponse } from "next/server";
import { generateRandomTrade, CONTRACTS } from "@/lib/mock-data/market-data-generator";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol") || "ES";
    const count = parseInt(searchParams.get("count") || "10");
    const daysBack = parseInt(searchParams.get("daysBack") || "30");

    // Validate symbol
    if (!CONTRACTS[symbol]) {
      return NextResponse.json(
        { error: `Unknown symbol: ${symbol}. Available: ${Object.keys(CONTRACTS).join(", ")}` },
        { status: 400 }
      );
    }

    // Generate random trades over the past N days
    const trades = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
      // Random day within the past daysBack
      const daysAgo = Math.floor(Math.random() * daysBack);
      const tradeDate = new Date(today);
      tradeDate.setDate(tradeDate.getDate() - daysAgo);

      // Skip weekends
      if (tradeDate.getDay() === 0 || tradeDate.getDay() === 6) {
        i--;
        continue;
      }

      const trade = generateRandomTrade(symbol, tradeDate);
      trades.push(trade);
    }

    // Sort by date (oldest first)
    trades.sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());

    // Calculate cumulative P&L
    let cumulative = 0;
    const tradesWithCumulative = trades.map(trade => {
      cumulative += trade.netPnl;
      return {
        ...trade,
        cumulativePnl: Math.round(cumulative * 100) / 100,
      };
    });

    return NextResponse.json({
      success: true,
      symbol,
      count: trades.length,
      totalPnl: Math.round(cumulative * 100) / 100,
      winRate: Math.round((trades.filter(t => t.netPnl > 0).length / trades.length) * 100),
      trades: tradesWithCumulative,
    });
  } catch (error) {
    console.error("Error generating mock trades:", error);
    return NextResponse.json(
      {
        error: "Failed to generate trades",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
