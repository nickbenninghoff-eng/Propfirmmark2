import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { accountTiers, users } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log("Seeding default account tiers...");

  const defaultTiers = [
    {
      name: "25k",
      displayName: "$25,000 Account",
      description: "Perfect for beginners. Start your trading journey with a $25K evaluation account.",
      accountSize: 25000,
      price: "149.00",
      resetPrice: "49.00",
      profitTarget: "1500.00",
      profitTargetPercent: "6.00",
      maxDrawdown: "1500.00",
      maxDrawdownPercent: "6.00",
      drawdownType: "trailing_eod" as const,
      dailyLossLimit: "500.00",
      dailyLossLimitPercent: "2.00",
      minTradingDays: 5,
      maxTradingDays: null,
      profitSplit: "80.00",
      minPayoutAmount: "100.00",
      payoutFrequency: "weekly",
      isActive: true,
      isPopular: false,
      sortOrder: 1,
    },
    {
      name: "50k",
      displayName: "$50,000 Account",
      description: "Our most popular choice. Trade with $50K and prove your skills.",
      accountSize: 50000,
      price: "249.00",
      resetPrice: "79.00",
      profitTarget: "3000.00",
      profitTargetPercent: "6.00",
      maxDrawdown: "2500.00",
      maxDrawdownPercent: "5.00",
      drawdownType: "trailing_eod" as const,
      dailyLossLimit: "1000.00",
      dailyLossLimitPercent: "2.00",
      minTradingDays: 5,
      maxTradingDays: null,
      profitSplit: "80.00",
      minPayoutAmount: "100.00",
      payoutFrequency: "weekly",
      isActive: true,
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: "100k",
      displayName: "$100,000 Account",
      description: "For experienced traders. Maximize your potential with a $100K account.",
      accountSize: 100000,
      price: "349.00",
      resetPrice: "99.00",
      profitTarget: "6000.00",
      profitTargetPercent: "6.00",
      maxDrawdown: "3000.00",
      maxDrawdownPercent: "3.00",
      drawdownType: "trailing_eod" as const,
      dailyLossLimit: "2000.00",
      dailyLossLimitPercent: "2.00",
      minTradingDays: 5,
      maxTradingDays: null,
      profitSplit: "80.00",
      minPayoutAmount: "100.00",
      payoutFrequency: "weekly",
      isActive: true,
      isPopular: false,
      sortOrder: 3,
    },
    {
      name: "150k",
      displayName: "$150,000 Account",
      description: "Our premium offering. Trade with $150K and keep 80% of your profits.",
      accountSize: 150000,
      price: "449.00",
      resetPrice: "129.00",
      profitTarget: "9000.00",
      profitTargetPercent: "6.00",
      maxDrawdown: "4500.00",
      maxDrawdownPercent: "3.00",
      drawdownType: "trailing_eod" as const,
      dailyLossLimit: "3000.00",
      dailyLossLimitPercent: "2.00",
      minTradingDays: 5,
      maxTradingDays: null,
      profitSplit: "80.00",
      minPayoutAmount: "100.00",
      payoutFrequency: "weekly",
      isActive: true,
      isPopular: false,
      sortOrder: 4,
    },
  ];

  for (const tier of defaultTiers) {
    await db.insert(accountTiers).values(tier).onConflictDoNothing();
    console.log(`  Created tier: ${tier.displayName}`);
  }

  // Create admin user
  console.log("\nCreating admin user...");
  const adminEmail = "admin@propfirm.com";
  const adminPassword = "Admin123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await db.insert(users).values({
    email: adminEmail,
    passwordHash,
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    referralCode: "ADMIN001",
    emailVerified: new Date(),
  }).onConflictDoNothing();

  console.log(`  Created admin user: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);

  console.log("\nSeeding complete!");
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
