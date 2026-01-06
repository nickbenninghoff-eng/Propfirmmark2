import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { seedTrades } from "@/lib/db/seed-trades";

export async function POST() {
  const session = await auth();

  // Only allow admins to seed data (development feature)
  if (!session?.user || (session.user.role !== "super_admin" && session.user.role !== "admin")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await seedTrades();
    return NextResponse.json({
      success: true,
      message: "Sample trades seeded successfully"
    });
  } catch (error) {
    console.error("Error seeding trades:", error);
    return NextResponse.json(
      { error: "Failed to seed trades" },
      { status: 500 }
    );
  }
}
