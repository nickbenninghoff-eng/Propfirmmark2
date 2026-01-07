import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { monitorWorkingOrders } from "@/server/services/order-monitor-service";

/**
 * POST /api/admin/trigger-order-monitor
 * Manually trigger order monitoring (admin only)
 *
 * This endpoint allows admins to manually trigger the background
 * order monitoring service to check for limit fills, stop triggers,
 * and trailing stop updates.
 *
 * In production, this would be called by a cron job every 5 seconds.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Require authentication but allow all users
    // (monitoring is read-only and only executes based on market conditions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Run order monitoring
    const result = await monitorWorkingOrders();

    return NextResponse.json({
      success: true,
      message: "Order monitoring completed",
      result: {
        ordersChecked: result.checked,
        ordersFilled: result.filled,
        ordersTriggered: result.triggered,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error triggering order monitor:", error);
    return NextResponse.json(
      {
        error: "Failed to trigger order monitor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
