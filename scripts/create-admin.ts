import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";

async function createAdmin() {
  try {
    const email = "admin@test.com";
    const password = "Admin123!";

    // Check if admin already exists
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (existing) {
      console.log("✓ Admin user already exists:", email);
      console.log("  Password:", password);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const [admin] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        referralCode: "ADMIN001",
      })
      .returning();

    console.log("✓ Admin user created successfully!");
    console.log("  Email:", email);
    console.log("  Password:", password);
    console.log("  Role:", admin.role);
  } catch (error) {
    console.error("✗ Error creating admin user:", error);
    process.exit(1);
  }

  process.exit(0);
}

createAdmin();
