"use client";

import { useState, useMemo } from "react";
import { CalendarHeatmap } from "./calendar-heatmap";
import { AssetBadge } from "./asset-badge";
import { TradeChart } from "./trade-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, Filter, StickyNote, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Trade {
  id: string;
  symbol: string;
  assetType: string;
  direction: string;
  quantity: number;
  entryPrice: string;
  exitPrice: string | null;
  entryTime: Date;
  exitTime: Date | null;
  pnl: string | null;
  notes?: string | null;
}

interface DailyPnL {
  date: string;
  pnl: number;
  trades: number;
  notes?: string | null;
}

interface AccountJournalViewProps {
  accountId: string;
  trades: Trade[];
  dailyPnLData: DailyPnL[];
  initialMonth: Date;
}

export function AccountJournalView({
  accountId,
  trades,
  dailyPnLData,
  initialMonth,
}: AccountJournalViewProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [pnlFilter, setPnlFilter] = useState<string>("all");
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [currentNotes, setCurrentNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Get unique asset types
  const assetTypes = useMemo(() => {
    const types = new Set(trades.map((t) => t.assetType));
    return Array.from(types);
  }, [trades]);

  // Filter trades by selected day and filters
  const filteredTrades = useMemo(() => {
    let filtered = trades;

    // Filter by selected day
    if (selectedDay) {
      filtered = filtered.filter((trade) => {
        if (!trade.exitTime) return false;
        const tradeDate = format(trade.exitTime, "yyyy-MM-dd");
        return tradeDate === selectedDay;
      });
    }

    // Filter by asset type
    if (assetFilter !== "all") {
      filtered = filtered.filter((trade) => trade.assetType === assetFilter);
    }

    // Filter by direction
    if (directionFilter !== "all") {
      filtered = filtered.filter((trade) => trade.direction === directionFilter);
    }

    // Filter by P&L
    if (pnlFilter !== "all") {
      filtered = filtered.filter((trade) => {
        const pnl = Number(trade.pnl);
        if (pnlFilter === "winners") return pnl > 0;
        if (pnlFilter === "losers") return pnl < 0;
        if (pnlFilter === "breakeven") return pnl === 0;
        return true;
      });
    }

    return filtered;
  }, [trades, selectedDay, assetFilter, directionFilter, pnlFilter]);

  // Calculate stats for selected day
  const dayStats = useMemo(() => {
    if (!selectedDay) return null;

    const dayData = dailyPnLData.find((d) => d.date === selectedDay);
    if (!dayData) return null;

    const dayTrades = filteredTrades;
    const winners = dayTrades.filter((t) => Number(t.pnl) > 0).length;
    const losers = dayTrades.filter((t) => Number(t.pnl) < 0).length;
    const winRate = dayTrades.length > 0 ? (winners / dayTrades.length) * 100 : 0;

    return {
      date: selectedDay,
      pnl: dayData.pnl,
      trades: dayData.trades,
      winners,
      losers,
      winRate,
    };
  }, [selectedDay, dailyPnLData, filteredTrades]);

  const handleNotesClick = (trade: Trade, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTrade(trade);
    setCurrentNotes(trade.notes || "");
    setNotesDialogOpen(true);
  };

  const handleTradeClick = (trade: Trade) => {
    // Only show chart for closed trades
    if (!trade.exitTime || !trade.exitPrice) return;

    setSelectedTrade(trade);
    setChartDialogOpen(true);
  };

  const handleSaveTradeNotes = async () => {
    if (!selectedTrade) return;

    setIsSavingNotes(true);
    try {
      const response = await fetch("/api/trading-journal/trade-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeId: selectedTrade.id,
          notes: currentNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notes");
      }

      // Update local data
      selectedTrade.notes = currentNotes;

      setNotesDialogOpen(false);
    } catch (error) {
      console.error("Error saving trade notes:", error);
      alert("Failed to save notes. Please try again.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <>
      {/* Calendar Heatmap */}
      <CalendarHeatmap
        data={dailyPnLData}
        accountId={accountId}
        initialMonth={initialMonth}
        onDayClick={setSelectedDay}
        selectedDay={selectedDay}
      />

      {/* Day Stats Banner (shown when a day is selected) */}
      {dayStats && (
        <div className="relative rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-violet-500/5 backdrop-blur-xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {format(new Date(dayStats.date), "MMMM d, yyyy")}
                </h3>
                <p className="text-sm text-white/60">Daily performance breakdown</p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Clear filter ×
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">P&L</div>
                <div className={cn(
                  "text-2xl font-bold font-mono",
                  dayStats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {dayStats.pnl >= 0 ? "+" : ""}${dayStats.pnl.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Trades</div>
                <div className="text-2xl font-bold font-mono text-white">{dayStats.trades}</div>
              </div>
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">W/L</div>
                <div className="text-2xl font-bold font-mono text-white">
                  {dayStats.winners}/{dayStats.losers}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Win Rate</div>
                <div className="text-2xl font-bold font-mono text-cyan-400">
                  {dayStats.winRate.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Trades */}
      <div className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
        <div className="relative p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {selectedDay ? `Trades on ${format(new Date(selectedDay), "MMM d, yyyy")}` : "Trade History"}
              </h3>
              <p className="text-sm text-white/60">
                {selectedDay
                  ? `Showing ${filteredTrades.length} trade${filteredTrades.length === 1 ? "" : "s"} from this day`
                  : `Showing ${filteredTrades.length} of ${trades.length} trades`}
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-white/40" />

              {/* Asset Filter */}
              <select
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="all" className="bg-slate-900">All Assets</option>
                {assetTypes.map((type) => (
                  <option key={type} value={type} className="bg-slate-900">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>

              {/* Direction Filter */}
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="all" className="bg-slate-900">All Directions</option>
                <option value="long" className="bg-slate-900">Long</option>
                <option value="short" className="bg-slate-900">Short</option>
              </select>

              {/* P&L Filter */}
              <select
                value={pnlFilter}
                onChange={(e) => setPnlFilter(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="all" className="bg-slate-900">All P&L</option>
                <option value="winners" className="bg-slate-900">Winners</option>
                <option value="losers" className="bg-slate-900">Losers</option>
                <option value="breakeven" className="bg-slate-900">Break Even</option>
              </select>

              {/* Clear Filters */}
              {(assetFilter !== "all" || directionFilter !== "all" || pnlFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAssetFilter("all");
                    setDirectionFilter("all");
                    setPnlFilter("all");
                  }}
                  className="text-xs text-white/60 hover:text-white hover:bg-white/10"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          {filteredTrades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/20 hover:bg-white/5">
                  <TableHead className="text-white/90 font-semibold">Asset</TableHead>
                  <TableHead className="text-white/90 font-semibold">Direction</TableHead>
                  <TableHead className="text-white/90 font-semibold">Qty</TableHead>
                  <TableHead className="text-white/90 font-semibold">Entry</TableHead>
                  <TableHead className="text-white/90 font-semibold">Exit</TableHead>
                  <TableHead className="text-white/90 font-semibold">Time</TableHead>
                  <TableHead className="text-right text-white/90 font-semibold">P/L</TableHead>
                  <TableHead className="text-center text-white/90 font-semibold">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map((trade) => (
                  <TableRow
                    key={trade.id}
                    onClick={() => handleTradeClick(trade)}
                    className={cn(
                      trade.exitTime && trade.exitPrice && "cursor-pointer hover:bg-white/5"
                    )}
                  >
                    <TableCell>
                      <AssetBadge
                        type={trade.assetType as any}
                        symbol={trade.symbol}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {trade.direction === "long" ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-rose-400" />
                        )}
                        <span
                          className={cn(
                            "font-medium text-sm uppercase",
                            trade.direction === "long"
                              ? "text-emerald-400"
                              : "text-rose-400"
                          )}
                        >
                          {trade.direction}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">
                        {trade.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">
                        ${Number(trade.entryPrice).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">
                        {trade.exitPrice
                          ? `$${Number(trade.exitPrice).toFixed(2)}`
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(trade.entryTime), "MMM d, HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.pnl && (
                        <span
                          className={cn(
                            "font-mono text-sm font-bold",
                            Number(trade.pnl) >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          )}
                        >
                          {Number(trade.pnl) >= 0 ? "+" : ""}$
                          {Math.abs(Number(trade.pnl)).toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={(e) => handleNotesClick(trade, e)}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          trade.notes ? "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10" : "text-white/30 hover:text-white/60 hover:bg-white/5"
                        )}
                        title={trade.notes ? "View/Edit note" : "Add note"}
                      >
                        <StickyNote className={cn("h-4 w-4", trade.notes && "fill-current")} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-white/60">
              {selectedDay
                ? "No trades on this day"
                : "No trades yet. Start trading to see your history here."}
            </div>
          )}
        </div>
      </div>

      {/* Trade Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Trade Notes</DialogTitle>
            <DialogDescription>
              {selectedTrade && (
                <>
                  {selectedTrade.symbol} - {selectedTrade.direction.toUpperCase()} - {selectedTrade.quantity} @ ${Number(selectedTrade.entryPrice).toFixed(2)}
                  {selectedTrade.pnl && (
                    <span className={cn(
                      "ml-2 font-mono font-bold",
                      Number(selectedTrade.pnl) >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {Number(selectedTrade.pnl) >= 0 ? "+" : ""}
                      ${Math.abs(Number(selectedTrade.pnl)).toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={currentNotes}
              onChange={(e) => setCurrentNotes(e.target.value)}
              placeholder="Add notes about this trade... (strategy, mistakes, lessons learned, etc.)"
              className="min-h-[150px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotesDialogOpen(false)}
              disabled={isSavingNotes}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTradeNotes} disabled={isSavingNotes}>
              {isSavingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade Chart Dialog */}
      <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Trade Chart - {selectedTrade?.symbol}
            </DialogTitle>
          </DialogHeader>
          {selectedTrade && (
            <div className="flex flex-wrap items-center gap-4 text-sm -mt-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-medium uppercase",
                  selectedTrade.direction === "long" ? "text-emerald-400" : "text-rose-400"
                )}>
                  {selectedTrade.direction}
                </span>
                <span className="text-white/60">•</span>
                <span className="text-white/80">{selectedTrade.quantity} contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">Entry:</span>
                <span className="text-white/80 font-mono">${Number(selectedTrade.entryPrice).toFixed(2)}</span>
                <span className="text-white/60">@</span>
                <span className="text-white/80">{format(new Date(selectedTrade.entryTime), "HH:mm")}</span>
              </div>
              {selectedTrade.exitPrice && selectedTrade.exitTime && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Exit:</span>
                  <span className="text-white/80 font-mono">${Number(selectedTrade.exitPrice).toFixed(2)}</span>
                  <span className="text-white/60">@</span>
                  <span className="text-white/80">{format(new Date(selectedTrade.exitTime), "HH:mm")}</span>
                </div>
              )}
              {selectedTrade.pnl && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60">P&L:</span>
                  <span className={cn(
                    "font-mono font-bold",
                    Number(selectedTrade.pnl) >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {Number(selectedTrade.pnl) >= 0 ? "+" : ""}${Math.abs(Number(selectedTrade.pnl)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="py-4">
            {selectedTrade && selectedTrade.exitTime && selectedTrade.exitPrice && (
              <TradeChart
                symbol={selectedTrade.symbol}
                entryPrice={Number(selectedTrade.entryPrice)}
                exitPrice={Number(selectedTrade.exitPrice)}
                entryTime={new Date(selectedTrade.entryTime)}
                exitTime={new Date(selectedTrade.exitTime)}
                direction={selectedTrade.direction as "long" | "short"}
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setChartDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
