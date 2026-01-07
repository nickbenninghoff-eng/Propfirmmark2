import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tradingAccounts, trades, accountEquitySnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Futures symbols with realistic price ranges
const futuresSymbols = [
  { symbol: "ESH25", name: "E-mini S&P 500", exchange: "CME", priceRange: [5100, 5200], tickValue: 12.50 },
  { symbol: "NQH25", name: "E-mini Nasdaq", exchange: "CME", priceRange: [17800, 18200], tickValue: 5.00 },
  { symbol: "GCG25", name: "Gold Futures", exchange: "COMEX", priceRange: [2020, 2080], tickValue: 10.00 },
  { symbol: "CLH25", name: "Crude Oil", exchange: "NYMEX", priceRange: [68, 74], tickValue: 10.00 },
];

// Generate a random price within range
function randomPrice(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

// Generate a random date in the past N days
function randomDate(daysAgo: number): Date {
  const now = new Date();
  const daysBack = Math.floor(Math.random() * daysAgo);
  const date = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // Random time during trading hours (9:30 AM - 4:00 PM ET)
  const hour = 9 + Math.floor(Math.random() * 7);
  const minute = Math.floor(Math.random() * 60);

  date.setHours(hour, minute, 0, 0);
  return date;
}

// Generate a trade with realistic P&L
function generateTrade(accountId: string, index: number) {
  const instrument = futuresSymbols[Math.floor(Math.random() * futuresSymbols.length)];
  const [minPrice, maxPrice] = instrument.priceRange;

  const entryPrice = randomPrice(minPrice, maxPrice);
  const direction = Math.random() > 0.5 ? "long" : "short";
  const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 contracts

  // Generate realistic P&L (70% win rate for good traders)
  const isWinner = Math.random() < 0.58;

  let exitPrice: number;
  if (direction === "long") {
    if (isWinner) {
      // Profit: exit higher
      exitPrice = randomPrice(entryPrice + 2, entryPrice + 15);
    } else {
      // Loss: exit lower
      exitPrice = randomPrice(entryPrice - 12, entryPrice - 2);
    }
  } else {
    if (isWinner) {
      // Profit: exit lower
      exitPrice = randomPrice(entryPrice - 15, entryPrice - 2);
    } else {
      // Loss: exit higher
      exitPrice = randomPrice(entryPrice + 2, entryPrice + 12);
    }
  }

  // Calculate P&L
  const points = direction === "long"
    ? (exitPrice - entryPrice) * quantity
    : (entryPrice - exitPrice) * quantity;

  const pnl = points * instrument.tickValue;
  const commission = quantity * 2.50; // $2.50 per contract round trip
  const netPnl = pnl - commission;

  // Entry and exit times (exit 30-240 minutes after entry for better chart visualization)
  const entryTime = randomDate(30); // Past 30 days
  const holdTime = (30 + Math.floor(Math.random() * 210)) * 60 * 1000; // 30-240 minutes = 6-48 candles
  const exitTime = new Date(entryTime.getTime() + holdTime);

  return {
    tradingAccountId: accountId,
    symbol: instrument.symbol,
    exchange: instrument.exchange,
    direction: direction as "long" | "short",
    quantity,
    entryPrice: entryPrice.toString(),
    exitPrice: exitPrice.toString(),
    commission: commission.toString(),
    fees: "0.50",
    pnl: pnl.toFixed(2),
    netPnl: netPnl.toFixed(2),
    isOpen: false,
    entryTime,
    exitTime,
    assetType: "futures" as const,
    contractMonth: "2025-03",
    contractSize: instrument.symbol.startsWith("ES") ? 50 :
                  instrument.symbol.startsWith("NQ") ? 20 :
                  instrument.symbol.startsWith("GC") ? 100 : 1000,
  };
}

export async function POST() {
  try {
    const session = await auth();

    // Only admins can regenerate trades
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active trading accounts
    const accounts = await db.query.tradingAccounts.findMany({
      where: eq(tradingAccounts.status, "active"),
      with: { tier: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: "No active accounts found" }, { status: 404 });
    }

    const results = [];

    for (const account of accounts) {
      // Delete existing trades and snapshots for this account
      await db.delete(trades).where(eq(trades.tradingAccountId, account.id));
      await db.delete(accountEquitySnapshots).where(eq(accountEquitySnapshots.tradingAccountId, account.id));

      // Generate 40-60 trades per account
      const numTrades = 40 + Math.floor(Math.random() * 21);
      const tradesToInsert = [];

      for (let i = 0; i < numTrades; i++) {
        tradesToInsert.push(generateTrade(account.id, i));
      }

      // Sort by entry time
      tradesToInsert.sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());

      // Insert trades in batches
      const batchSize = 10;
      for (let i = 0; i < tradesToInsert.length; i += batchSize) {
        const batch = tradesToInsert.slice(i, i + batchSize);
        await db.insert(trades).values(batch);
      }

      // Calculate updated account stats
      const totalPnl = tradesToInsert.reduce((sum, t) => sum + Number(t.netPnl), 0);
      const winners = tradesToInsert.filter(t => Number(t.netPnl) > 0).length;
      const losers = tradesToInsert.filter(t => Number(t.netPnl) < 0).length;
      const totalProfit = tradesToInsert
        .filter(t => Number(t.netPnl) > 0)
        .reduce((sum, t) => sum + Number(t.netPnl), 0);
      const totalLoss = Math.abs(
        tradesToInsert
          .filter(t => Number(t.netPnl) < 0)
          .reduce((sum, t) => sum + Number(t.netPnl), 0)
      );

      const newBalance = Number(account.initialBalance) + totalPnl;
      const highWaterMark = Math.max(newBalance, Number(account.highWaterMark));

      // Get unique trading days
      const tradingDays = new Set(
        tradesToInsert.map(t => t.entryTime.toISOString().split('T')[0])
      ).size;

      // Update account
      await db.update(tradingAccounts)
        .set({
          currentBalance: newBalance.toFixed(2),
          highWaterMark: highWaterMark.toFixed(2),
          totalTrades: numTrades,
          winningTrades: winners,
          losingTrades: losers,
          totalProfit: totalProfit.toFixed(2),
          totalLoss: totalLoss.toFixed(2),
          tradingDaysCount: tradingDays,
          profitTargetReached: totalPnl >= Number(account.tier?.profitTarget || 0),
          minTradingDaysReached: tradingDays >= (account.tier?.minTradingDays || 0),
        })
        .where(eq(tradingAccounts.id, account.id));

      // Create equity snapshots
      let runningBalance = Number(account.initialBalance);
      const snapshots = [];

      for (const trade of tradesToInsert) {
        runningBalance += Number(trade.netPnl);
        snapshots.push({
          tradingAccountId: account.id,
          timestamp: trade.exitTime,
          balance: runningBalance.toFixed(2),
          equity: runningBalance.toFixed(2),
          unrealizedPnl: "0",
          snapshotType: "trade_close" as const,
        });
      }

      // Insert snapshots in batches
      for (let i = 0; i < snapshots.length; i += batchSize) {
        const batch = snapshots.slice(i, i + batchSize);
        await db.insert(accountEquitySnapshots).values(batch);
      }

      results.push({
        accountId: account.id,
        accountNumber: account.accountNumber,
        tradesGenerated: numTrades,
        snapshotsGenerated: snapshots.length,
        newBalance: newBalance.toFixed(2),
        totalPnl: totalPnl.toFixed(2),
        winRate: ((winners / numTrades) * 100).toFixed(1),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Trades regenerated successfully with longer hold times (30-240 minutes)",
      accountsUpdated: accounts.length,
      results,
    });
  } catch (error) {
    console.error("Error regenerating trades:", error);
    return NextResponse.json(
      {
        error: "Failed to regenerate trades",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
