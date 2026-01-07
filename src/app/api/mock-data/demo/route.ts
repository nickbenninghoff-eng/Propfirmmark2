import { NextResponse } from "next/server";
import { CONTRACTS } from "@/lib/mock-data/market-data-generator";

export async function GET() {
  return NextResponse.json({
    message: "Mock Data Generator - Ready for Testing!",
    status: "operational",
    features: {
      candles: {
        endpoint: "/api/mock-data/candles",
        description: "Generate realistic candlestick data",
        parameters: {
          symbol: `Available: ${Object.keys(CONTRACTS).join(", ")}`,
          interval: "Candle interval in minutes (default: 5)",
          count: "Number of candles to generate (default: 100)",
        },
        example: "/api/mock-data/candles?symbol=ES&interval=5&count=50",
      },
      trades: {
        endpoint: "/api/mock-data/trades",
        description: "Generate random trade fills",
        parameters: {
          symbol: `Available: ${Object.keys(CONTRACTS).join(", ")}`,
          count: "Number of trades to generate (default: 10)",
          daysBack: "Spread trades over N days (default: 30)",
        },
        example: "/api/mock-data/trades?symbol=NQ&count=20&daysBack=14",
      },
    },
    availableContracts: Object.entries(CONTRACTS).map(([symbol, config]) => ({
      symbol,
      name: config.name,
      basePrice: config.basePrice,
      tickSize: config.tickSize,
    })),
    usageInstructions: [
      "1. Use /api/mock-data/candles to get realistic price charts",
      "2. Use /api/mock-data/trades to generate sample trade history",
      "3. Charts automatically use this data when viewing trades",
      "4. Easy to switch to real Tradovate data later - just update the API endpoints",
    ],
    nextSteps: [
      "Visit /api/mock-data/candles?symbol=ES to see sample candle data",
      "Visit /api/mock-data/trades?symbol=ES&count=5 to see sample trades",
      "View a trade in your Trading Journal to see live charts",
    ],
  });
}
