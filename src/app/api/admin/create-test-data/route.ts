import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, accountTiers, tradingAccounts } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    // Check if user is admin
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
    });

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const results: string[] = [];

    // 1. Create test tier
    const existingTier = await db.query.accountTiers.findFirst({
      where: (tiers, { eq }) => eq(tiers.name, "test_25k"),
    });

    let testTier;
    if (existingTier) {
      testTier = existingTier;
      results.push("✓ Test tier already exists");
    } else {
      [testTier] = await db
        .insert(accountTiers)
        .values({
          name: "test_25k",
          displayName: "$25,000 Test Account",
          description: "Test evaluation account",
          accountSize: 25000,
          price: "99.00",
          resetPrice: "49.00",
          profitTarget: "1500.00",
          profitTargetPercent: "6.00",
          maxDrawdown: "1500.00",
          maxDrawdownPercent: "6.00",
          drawdownType: "trailing_eod",
          dailyLossLimit: "500.00",
          dailyLossLimitPercent: "2.00",
          minTradingDays: 3,
          profitSplit: "80.00",
          minPayoutAmount: "100.00",
          payoutFrequency: "weekly",
          isActive: true,
          isPopular: true,
          sortOrder: 1,
        })
        .returning();
      results.push("✓ Created $25k test tier");
    }

    // 2. Create test traders
    const testTraders = [
      { firstName: "John", lastName: "Doe", email: "john@test.com" },
      { firstName: "Jane", lastName: "Smith", email: "jane@test.com" },
      { firstName: "Mike", lastName: "Johnson", email: "mike@test.com" },
      { firstName: "Sarah", lastName: "Williams", email: "sarah@test.com" },
      { firstName: "Tom", lastName: "Brown", email: "tom@test.com" },
    ];

    const createdTraders = [];
    const passwordHash = await bcrypt.hash("Trader123!", 12);

    for (const trader of testTraders) {
      const existing = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, trader.email),
      });

      if (existing) {
        createdTraders.push(existing);
        results.push(`✓ ${trader.firstName} ${trader.lastName} already exists`);
      } else {
        const [newTrader] = await db
          .insert(users)
          .values({
            email: trader.email,
            passwordHash,
            firstName: trader.firstName,
            lastName: trader.lastName,
            role: "user",
            referralCode: `TRADER${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          })
          .returning();
        createdTraders.push(newTrader);
        results.push(`✓ Created ${trader.firstName} ${trader.lastName}`);
      }
    }

    // 3. Create test trading accounts
    const accountStatuses = ["active", "funded", "passed", "failed", "suspended"];

    for (let i = 0; i < createdTraders.length; i++) {
      const trader = createdTraders[i];
      const status = accountStatuses[i % accountStatuses.length];

      const existingAccount = await db.query.tradingAccounts.findFirst({
        where: (accounts, { and, eq }) =>
          and(eq(accounts.userId, trader.id), eq(accounts.tierId, testTier.id)),
      });

      if (existingAccount) {
        results.push(`✓ Account for ${trader.firstName} already exists`);
        continue;
      }

      const balance = status === "funded" ? 27500 : status === "failed" ? 23500 : 25000;
      const profit = balance - 25000;

      await db.insert(tradingAccounts).values({
        userId: trader.id,
        tierId: testTier.id,
        accountNumber: `TEST${100000 + i}`,
        status: status as any,
        phase: status === "funded" ? "funded" : "evaluation_1",
        initialBalance: "25000.00",
        currentBalance: balance.toString(),
        highWaterMark: balance.toString(),
        totalProfit: profit.toString(),
        totalLoss: "0.00",
        currentDrawdown: "0.00",
        maxDrawdownReached: "0.00",
        drawdownThreshold: "1500.00",
        totalTrades: Math.floor(Math.random() * 50) + 10,
        winningTrades: Math.floor(Math.random() * 30) + 5,
        losingTrades: Math.floor(Math.random() * 20) + 5,
        tradingDaysCount: Math.floor(Math.random() * 10) + 1,
        profitTargetReached: status === "passed" || status === "funded",
        minTradingDaysReached: true,
      });

      results.push(`✓ Created ${status} account for ${trader.firstName} ${trader.lastName}`);
    }

    return NextResponse.json({
      success: true,
      message: "Test data created successfully!",
      details: results,
      credentials: {
        traders: {
          emails: testTraders.map((t) => t.email),
          password: "Trader123!",
        },
      },
    });
  } catch (error) {
    console.error("Error creating test data:", error);
    return NextResponse.json(
      { error: "Failed to create test data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
