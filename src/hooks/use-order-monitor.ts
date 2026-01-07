"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to automatically trigger order monitoring in the background
 * This polls the order monitor API every 5 seconds while the page is open
 *
 * NOTE: This is a development/MVP solution. In production, use a proper
 * background job scheduler (Vercel Cron, BullMQ, etc.)
 */
export function useOrderMonitor(accountId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !accountId) return;

    const triggerMonitor = async () => {
      try {
        const response = await fetch("/api/admin/trigger-order-monitor", {
          method: "POST",
        });

        if (response.ok) {
          // Invalidate queries to refresh UI after orders are filled
          queryClient.invalidateQueries({ queryKey: ["orders", accountId] });
          queryClient.invalidateQueries({ queryKey: ["positions", accountId] });
          queryClient.invalidateQueries({ queryKey: ["account-summary", accountId] });
        }
      } catch (error) {
        // Silently fail - monitoring will retry on next interval
        console.debug("Order monitor error:", error);
      }
    };

    // Run immediately on mount
    triggerMonitor();

    // Then run every 5 seconds
    intervalRef.current = setInterval(triggerMonitor, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [accountId, enabled, queryClient]);
}
