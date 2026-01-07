"use client";

import { useOrders, useCancelOrder } from "@/hooks/use-trading-data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Loader2, Clock } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface OpenOrdersPanelProps {
  accountId: string;
}

export default function OpenOrdersPanel({ accountId }: OpenOrdersPanelProps) {
  const { data: ordersData, isLoading } = useOrders(accountId, "pending,submitted,working,partial");
  const cancelOrderMutation = useCancelOrder();
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      setCancellingOrderId(orderId);
      await cancelOrderMutation.mutateAsync({ orderId, accountId });
      toast.success("Order cancelled successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel order");
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">Loading orders...</div>
      </div>
    );
  }

  if (!ordersData?.success) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-rose-500">Failed to load orders</div>
      </div>
    );
  }

  const orders = ordersData.orders || [];

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-2 text-2xl">📝</div>
        <div className="text-white/60">No open orders</div>
        <div className="mt-1 text-sm text-white/40">All submitted orders will appear here</div>
      </div>
    );
  }

  const getOrderTypeColor = (orderType: string) => {
    switch (orderType) {
      case "market":
        return "bg-cyan-500/20 text-cyan-400";
      case "limit":
        return "bg-violet-500/20 text-violet-400";
      case "stop":
        return "bg-amber-500/20 text-amber-400";
      case "stop_limit":
        return "bg-fuchsia-500/20 text-fuchsia-400";
      case "trailing_stop":
        return "bg-orange-500/20 text-orange-400";
      default:
        return "bg-white/20 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working":
        return "bg-emerald-500/20 text-emerald-400";
      case "submitted":
        return "bg-cyan-500/20 text-cyan-400";
      case "pending":
        return "bg-amber-500/20 text-amber-400";
      case "partial":
        return "bg-violet-500/20 text-violet-400";
      default:
        return "bg-white/20 text-white";
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Total Open Orders</div>
        <div className="font-mono text-xl font-bold text-white">{orders.length}</div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Side</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/70">Quantity</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/70">Limit Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/70">Stop Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Time</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/70">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {orders.map((order: any) => {
              return (
                <tr key={order.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-white">{order.symbol}</td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex rounded px-2 py-1 text-xs font-semibold uppercase ${getOrderTypeColor(order.orderType)}`}>
                      {order.orderType === "stop_limit" ? "STOP LMT" : order.orderType === "trailing_stop" ? "TRAIL" : order.orderType}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex rounded px-2 py-1 text-xs font-semibold uppercase ${order.side === "buy" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {order.side}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white">
                    {order.remainingQuantity}/{order.quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white">
                    {order.limitPrice ? `$${Number(order.limitPrice).toFixed(2)}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white">
                    {order.stopPrice ? `$${Number(order.stopPrice).toFixed(2)}` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex rounded px-2 py-1 text-xs font-semibold uppercase ${getStatusColor(order.status)}`}>
                      {order.status}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingOrderId === order.id}
                      size="sm"
                      variant="ghost"
                      className="hover:bg-rose-500/20 hover:text-rose-400"
                    >
                      {cancellingOrderId === order.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Help Text */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/60">
          <strong>Working</strong> orders are actively monitored and will execute when conditions are met. Click the X button to cancel an order.
        </div>
      </div>
    </div>
  );
}
