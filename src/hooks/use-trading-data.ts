"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to fetch trading account summary
 */
export function useAccountSummary(accountId: string) {
  return useQuery({
    queryKey: ["account-summary", accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}/summary`);
      if (!res.ok) throw new Error("Failed to fetch account summary");
      return res.json();
    },
    refetchInterval: 2000, // Refresh every 2 seconds
    enabled: !!accountId,
  });
}

/**
 * Hook to fetch open positions
 */
export function usePositions(accountId: string) {
  return useQuery({
    queryKey: ["positions", accountId],
    queryFn: async () => {
      const res = await fetch(`/api/positions?accountId=${accountId}`);
      if (!res.ok) throw new Error("Failed to fetch positions");
      return res.json();
    },
    refetchInterval: 2000, // Refresh every 2 seconds
    enabled: !!accountId,
  });
}

/**
 * Hook to fetch orders with optional status filter
 */
export function useOrders(accountId: string, status?: string) {
  return useQuery({
    queryKey: ["orders", accountId, status],
    queryFn: async () => {
      const url = status
        ? `/api/orders?accountId=${accountId}&status=${status}`
        : `/api/orders?accountId=${accountId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    refetchInterval: 2000, // Refresh every 2 seconds
    enabled: !!accountId,
  });
}

/**
 * Hook to fetch current market price for a symbol
 */
export function useMarketPrice(symbol: string) {
  return useQuery({
    queryKey: ["market-price", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market-data/price?symbol=${symbol}`);
      if (!res.ok) throw new Error("Failed to fetch market price");
      return res.json();
    },
    refetchInterval: 1000, // Refresh every 1 second for price updates
    enabled: !!symbol,
  });
}

/**
 * Hook to submit a new order
 */
export function useSubmitOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: {
      accountId: string;
      symbol: string;
      orderType: string;
      side: string;
      quantity: number;
      limitPrice?: number;
      stopPrice?: number;
      trailAmount?: number;
      timeInForce?: string;
    }) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit order");
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["orders", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["positions", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["account-summary", variables.accountId] });
    },
  });
}

/**
 * Hook to cancel an order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, accountId }: { orderId: string; accountId: string }) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["orders", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["account-summary", variables.accountId] });
    },
  });
}

/**
 * Hook to close a position
 */
export function useClosePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, symbol }: { accountId: string; symbol: string }) => {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, symbol }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close position");
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["positions", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["account-summary", variables.accountId] });
    },
  });
}

/**
 * Hook to update an existing order
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      accountId,
      limitPrice,
      stopPrice,
      quantity
    }: {
      orderId: string;
      accountId: string;
      limitPrice?: number;
      stopPrice?: number;
      quantity?: number;
    }) => {
      const updateData: any = {};
      if (limitPrice !== undefined) updateData.limitPrice = limitPrice;
      if (stopPrice !== undefined) updateData.stopPrice = stopPrice;
      if (quantity !== undefined) updateData.quantity = quantity;

      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["orders", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["account-summary", variables.accountId] });
    },
  });
}
