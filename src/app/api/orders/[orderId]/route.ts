import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, tradingAccounts } from "@/lib/db/schema";
import { cancelOrder, getOrderStatus } from "@/server/services/order-execution-service";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * GET /api/orders/{orderId}
 * Get order details with executions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // Get order with executions and rule checks
    const order = await getOrderStatus(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify account ownership
    const account = await db.query.tradingAccounts.findFirst({
      where: eq(tradingAccounts.id, order.tradingAccountId),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Verify user owns this account (or is admin)
    if (account.userId !== session.user.id && session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/{orderId}
 * Cancel an order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // Get order first
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify account ownership
    const account = await db.query.tradingAccounts.findFirst({
      where: eq(tradingAccounts.id, order.tradingAccountId),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Verify user owns this account (or is admin)
    if (account.userId !== session.user.id && session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if order can be cancelled
    if (!["pending", "submitted", "working"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot cancel order with status: ${order.status}` },
        { status: 400 }
      );
    }

    // Cancel the order
    const success = await cancelOrder(orderId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to cancel order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully",
      orderId,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      {
        error: "Failed to cancel order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/{orderId}
 * Update order prices (limit/stop)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    const body = await request.json();

    // Validate input
    const schema = z.object({
      limitPrice: z.number().positive().optional(),
      stopPrice: z.number().positive().optional(),
      quantity: z.number().int().positive().optional(),
    });

    const validated = schema.parse(body);

    // Get order first
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify account ownership
    const account = await db.query.tradingAccounts.findFirst({
      where: eq(tradingAccounts.id, order.tradingAccountId),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Verify user owns this account (or is admin)
    if (account.userId !== session.user.id && session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if order can be modified
    if (!["pending", "submitted", "working"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot modify order with status: ${order.status}` },
        { status: 400 }
      );
    }

    // Update the order
    const updateData: any = {};
    if (validated.limitPrice !== undefined) {
      updateData.limitPrice = validated.limitPrice.toString();
    }
    if (validated.stopPrice !== undefined) {
      updateData.stopPrice = validated.stopPrice.toString();
    }
    if (validated.quantity !== undefined) {
      updateData.quantity = validated.quantity;
    }

    await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId));

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      orderId,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      {
        error: "Failed to update order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
