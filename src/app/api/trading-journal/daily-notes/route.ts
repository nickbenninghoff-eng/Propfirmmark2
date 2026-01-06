import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailySnapshots, tradingAccounts, trades } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gte, lte } from "drizzle-orm";
import { format } from "date-fns";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId, date, notes } = await request.json();

    if (!accountId || !date) {
      return NextResponse.json(
        { error: "accountId and date are required" },
        { status: 400 }
      );
    }

    // Verify the account belongs to the user
    const account = await db.query.tradingAccounts.findFirst({
      where: and(
        eq(tradingAccounts.id, accountId),
        eq(tradingAccounts.userId, session.user.id)
      ),
    });

    if (!account) {
      return NextResponse.json(
        { error: "Trading account not found" },
        { status: 404 }
      );
    }

    const snapshotDate = new Date(date);
    snapshotDate.setHours(0, 0, 0, 0);

    // Find the daily snapshot for the given date
    let snapshot = await db.query.dailySnapshots.findFirst({
      where: and(
        eq(dailySnapshots.tradingAccountId, accountId),
        eq(dailySnapshots.snapshotDate, snapshotDate)
      ),
    });

    // If snapshot doesn't exist, create it
    if (!snapshot) {
      // Calculate daily P&L from trades
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const dayTrades = await db.query.trades.findMany({
        where: and(
          eq(trades.tradingAccountId, accountId),
          gte(trades.exitTime, startOfDay),
          lte(trades.exitTime, endOfDay),
          eq(trades.isOpen, false)
        ),
      });

      const dailyPnl = dayTrades.reduce((sum, trade) => sum + Number(trade.netPnl || 0), 0);
      const winnersCount = dayTrades.filter(t => Number(t.netPnl || 0) > 0).length;
      const losersCount = dayTrades.filter(t => Number(t.netPnl || 0) < 0).length;

      const [newSnapshot] = await db
        .insert(dailySnapshots)
        .values({
          tradingAccountId: accountId,
          snapshotDate: snapshotDate,
          openingBalance: Number(account.currentBalance) - dailyPnl,
          closingBalance: account.currentBalance,
          highBalance: account.currentBalance,
          lowBalance: Number(account.currentBalance) - dailyPnl,
          dailyPnl: dailyPnl,
          tradesCount: dayTrades.length,
          winnersCount,
          losersCount,
          notes,
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: "Daily notes created successfully",
      });
    }

    // Update the notes
    await db
      .update(dailySnapshots)
      .set({ notes })
      .where(eq(dailySnapshots.id, snapshot.id));

    return NextResponse.json({
      success: true,
      message: "Daily notes updated successfully",
    });
  } catch (error) {
    console.error("Error updating daily notes:", error);
    return NextResponse.json(
      {
        error: "Failed to update daily notes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
