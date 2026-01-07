import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tradingAccounts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/users/{userId}/accounts
 * Get all trading accounts for a user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    // Verify user is accessing their own accounts or is admin
    if (session.user.id !== userId && session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all accounts for the user
    const accounts = await db.query.tradingAccounts.findMany({
      where: eq(tradingAccounts.userId, userId),
      with: {
        tier: true,
      },
      orderBy: [desc(tradingAccounts.createdAt)],
    });

    return NextResponse.json({
      success: true,
      accounts,
      count: accounts.length,
    });
  } catch (error) {
    console.error("Error fetching user accounts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch accounts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
