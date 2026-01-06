import { db } from "../src/lib/db";

async function testConnection() {
  try {
    console.log("Testing database connection...");
    const result = await db.execute("SELECT 1 as test");
    console.log("✓ Database connection successful!");
    console.log("  Result:", result);
  } catch (error) {
    console.error("✗ Database connection failed:");
    console.error(error);
  }
  process.exit(0);
}

testConnection();
