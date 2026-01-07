"use client";

import { useEffect } from "react";
import { toast } from "sonner";

interface TradingShortcutsConfig {
  onQuickBuy: () => void;
  onQuickSell: () => void;
  onCloseAllPositions: () => void;
  onFlatten: () => void;
  enabled?: boolean;
}

/**
 * Hook to enable keyboard shortcuts for trading
 *
 * Shortcuts:
 * - B: Quick buy market order (1 contract)
 * - S: Quick sell market order (1 contract)
 * - C: Close all positions
 * - F: Flatten account (cancel all orders + close all positions)
 * - ESC: Close any open dialogs (handled by browser/components)
 * - ?: Show help dialog
 */
export function useTradingShortcuts(config: TradingShortcutsConfig) {
  const { onQuickBuy, onQuickSell, onCloseAllPositions, onFlatten, enabled = true } = config;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't trigger if modifier keys are pressed (except Shift for ?)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      switch (key) {
        case "b":
          event.preventDefault();
          onQuickBuy();
          break;

        case "s":
          event.preventDefault();
          onQuickSell();
          break;

        case "c":
          event.preventDefault();
          onCloseAllPositions();
          break;

        case "f":
          event.preventDefault();
          onFlatten();
          break;

        case "?":
          event.preventDefault();
          showShortcutsHelp();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [enabled, onQuickBuy, onQuickSell, onCloseAllPositions, onFlatten]);
}

function showShortcutsHelp() {
  const message = `Trading Keyboard Shortcuts:

B - Quick Buy (1 contract)
S - Quick Sell (1 contract)
C - Close All Positions
F - Flatten Account
ESC - Close Dialogs
? - Show This Help`;

  toast.info(message, {
    duration: 10000,
    style: {
      whiteSpace: 'pre-line',
    }
  });
}
