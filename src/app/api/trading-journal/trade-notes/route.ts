import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trades, tradingAccounts } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tradeId, notes } = await request.json();

    if (!tradeId) {
      return NextResponse.json(
        { error: "tradeId is required" },
        { status: 400 }
      );
    }

    // Find the trade and verify it belongs to the user
    const trade = await db.query.trades.findFirst({
      where: eq(trades.id, tradeId),
      with: {
        tradingAccount: true,
      },
    });

    if (!trade) {
      return NextResponse.json(
        { error: "Trade not found" },
        { status: 404 }
      );
    }

    if (trade.tradingAccount.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update the notes
    await db
      .update(trades)
      .set({ notes })
      .where(eq(trades.id, tradeId));

    return NextResponse.json({
      success: true,
      message: "Trade notes updated successfully",
    });
  } catch (error) {
    console.error("Error updating trade notes:", error);
    return NextResponse.json(
      {
        error: "Failed to update trade notes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
