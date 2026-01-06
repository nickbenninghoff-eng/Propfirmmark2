import { db } from "../src/lib/db";
import { users, accountTiers, tradingAccounts } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";

async function createTestData() {
  try {
    console.log("Creating test data...\n");

    // 1. Create admin user
    console.log("1. Creating admin user...");
    const adminEmail = "admin@test.com";
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, adminEmail),
    });

    let adminUser;
    if (existingAdmin) {
      console.log("   ✓ Admin user already exists");
      adminUser = existingAdmin;
    } else {
      const passwordHash = await bcrypt.hash("Admin123!", 12);
      [adminUser] = await db
        .insert(users)
        .values({
          email: adminEmail,
          passwordHash,
          firstName: "Admin",
          lastName: "User",
          role: "admin",
          referralCode: "ADMIN001",
        })
        .returning();
      console.log("   ✓ Created admin user");
    }
    console.log("   Email: admin@test.com");
    console.log("   Password: Admin123!\n");

    // 2. Create test traders
    console.log("2. Creating test traders...");
    const testTraders = [
      { firstName: "John", lastName: "Doe", email: "john@test.com" },
      { firstName: "Jane", lastName: "Smith", email: "jane@test.com" },
      { firstName: "Mike", lastName: "Johnson", email: "mike@test.com" },
      { firstName: "Sarah", lastName: "Williams", email: "sarah@test.com" },
      { firstName: "Tom", lastName: "Brown", email: "tom@test.com" },
    ];

    const createdTraders = [];
    for (const trader of testTraders) {
      const existing = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, trader.email),
      });

      if (existing) {
        console.log(`   ✓ ${trader.firstName} ${trader.lastName} already exists`);
        createdTraders.push(existing);
      } else {
        const passwordHash = await bcrypt.hash("Trader123!", 12);
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
        console.log(`   ✓ Created ${trader.firstName} ${trader.lastName}`);
      }
    }
    console.log("   All trader passwords: Trader123!\n");

    // 3. Create test tier if it doesn't exist
    console.log("3. Creating test tier...");
    const existingTier = await db.query.accountTiers.findFirst({
      where: (tiers, { eq }) => eq(tiers.name, "test_25k"),
    });

    let testTier;
    if (existingTier) {
      console.log("   ✓ Test tier already exists");
      testTier = existingTier;
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
      console.log("   ✓ Created $25k tier");
    }

    // 4. Create test trading accounts
    console.log("\n4. Creating test trading accounts...");
    const accountStatuses = ["active", "funded", "passed", "failed", "suspended"];

    for (let i = 0; i < createdTraders.length; i++) {
      const trader = createdTraders[i];
      const status = accountStatuses[i % accountStatuses.length];

      // Check if account already exists
      const existingAccount = await db.query.tradingAccounts.findFirst({
        where: (accounts, { and, eq }) =>
          and(eq(accounts.userId, trader.id), eq(accounts.tierId, testTier.id)),
      });

      if (existingAccount) {
        console.log(`   ✓ Account for ${trader.firstName} already exists`);
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

      console.log(`   ✓ Created ${status} account for ${trader.firstName} ${trader.lastName}`);
    }

    console.log("\n✅ Test data created successfully!\n");
    console.log("=== LOGIN CREDENTIALS ===");
    console.log("Admin:");
    console.log("  Email: admin@test.com");
    console.log("  Password: Admin123!\n");
    console.log("Test Traders (all use same password):");
    testTraders.forEach((t) => console.log(`  - ${t.email}`));
    console.log("  Password: Trader123!\n");
  } catch (error) {
    console.error("❌ Error creating test data:", error);
    process.exit(1);
  }

  process.exit(0);
}

createTestData();
