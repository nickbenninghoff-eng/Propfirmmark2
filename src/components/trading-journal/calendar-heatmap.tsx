"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, StickyNote } from "lucide-react";
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

interface DailyPnL {
  date: string;
  pnl: number;
  trades: number;
  notes?: string | null;
}

interface CalendarHeatmapProps {
  data: DailyPnL[];
  accountId: string;
  initialMonth?: Date;
  onDayClick?: (date: string | null) => void;
  selectedDay?: string | null;
}

export function CalendarHeatmap({ data, accountId, initialMonth = new Date(), onDayClick, selectedDay }: CalendarHeatmapProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [isLoading, setIsLoading] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const handleDayClick = (dateStr: string, hasData: boolean) => {
    if (!hasData || !onDayClick) return;

    // Toggle: if clicking the same day, deselect it
    if (selectedDay === dateStr) {
      onDayClick(null);
    } else {
      onDayClick(dateStr);
    }
  };

  const handlePrevMonth = async () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    // In a real implementation, you would fetch new data here
    // For now, we'll just update the display
  };

  const handleNextMonth = async () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    // In a real implementation, you would fetch new data here
  };

  const handleNotesClick = (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const dayData = dataMap.get(dateStr);
    if (!dayData) return;

    setSelectedDate(dateStr);
    setCurrentNotes(dayData.notes || "");
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedDate) return;

    setIsSavingNotes(true);
    try {
      const response = await fetch("/api/trading-journal/daily-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          date: selectedDate,
          notes: currentNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notes");
      }

      // Update local data
      const dayData = dataMap.get(selectedDate);
      if (dayData) {
        dayData.notes = currentNotes;
      }

      setNotesDialogOpen(false);
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes. Please try again.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const month = currentMonth;
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  // Get the full week range to show complete calendar
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getPnLColor = (pnl: number) => {
    // Pure green/red gradient with clear visual separation
    if (pnl === 0) return "bg-zinc-500/15 border-zinc-400/20"; // Neutral cool gray

    if (pnl > 0) {
      // Profit gradient: Light lime -> Medium green -> Forest green -> Deep emerald
      if (pnl <= 100) return "bg-zinc-500/15 border-zinc-400/20"; // Small wins - neutral
      if (pnl <= 300) return "bg-lime-500/30 border-lime-400/35"; // Good - light lime
      if (pnl <= 500) return "bg-green-500/45 border-green-400/50"; // Very good - medium green
      return "bg-emerald-600/65 border-emerald-500/70"; // Best - deep emerald
    } else {
      // Loss gradient: Light coral -> Medium red -> Dark red -> Deep crimson
      if (pnl >= -100) return "bg-zinc-500/15 border-zinc-400/20"; // Small losses - neutral
      if (pnl >= -300) return "bg-red-400/30 border-red-300/35"; // Bad - light coral
      if (pnl >= -500) return "bg-red-500/45 border-red-400/50"; // Very bad - medium red
      return "bg-red-600/65 border-red-500/70"; // Worst - deep crimson
    }
  };

  const dataMap = new Map(data.map(d => [d.date, d]));

  // Group days by week
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  days.forEach((day, index) => {
    currentWeek.push(day);
    if (getDay(day) === 6 || index === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div className="w-full flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="relative rounded-2xl border border-white/5 overflow-hidden w-[75%]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />

        <div className="relative backdrop-blur-sm p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {format(month, "MMMM yyyy")}
            </h3>
            <p className="text-sm text-white/60">Daily profit & loss heatmap</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="text-xs text-white/60 hover:text-white hover:bg-white/10"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-white/40">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((day, dayIndex) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayData = dataMap.get(dateStr);
                const pnl = dayData?.pnl ?? 0;
                const isCurrentMonth = day >= monthStart && day <= monthEnd;
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                const isSelected = selectedDay === dateStr;

                return (
                  <motion.div
                    key={dateStr}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: (weekIndex * 7 + dayIndex) * 0.01 }}
                    whileHover={{ scale: dayData ? 1.1 : 1, zIndex: 10 }}
                    className="group relative aspect-square"
                    onClick={() => handleDayClick(dateStr, !!dayData)}
                  >
                    <div className={cn(
                      "absolute inset-0 rounded-lg border backdrop-blur-sm transition-all duration-200",
                      !isCurrentMonth && "opacity-30",
                      isToday && "ring-2 ring-cyan-400/50",
                      isSelected && "ring-2 ring-violet-400 ring-offset-2 ring-offset-black/50",
                      isCurrentMonth ? getPnLColor(pnl) : "bg-white/5 border-white/10",
                      dayData && "cursor-pointer hover:ring-2 hover:ring-white/30"
                    )}>
                      <div className="flex flex-col h-full p-2">
                        <div className="flex justify-between items-start mb-auto">
                          <span className={cn(
                            "text-lg font-medium leading-none",
                            isCurrentMonth ? "text-white/70" : "text-white/40"
                          )}>
                            {format(day, "d")}
                          </span>
                          {dayData && isCurrentMonth && (
                            <button
                              onClick={(e) => handleNotesClick(dateStr, e)}
                              className={cn(
                                "p-0.5 rounded transition-colors",
                                dayData.notes ? "text-amber-400 hover:text-amber-300" : "text-white/30 hover:text-white/60"
                              )}
                              title={dayData.notes ? "View/Edit note" : "Add note"}
                            >
                              <StickyNote className={cn("h-3.5 w-3.5", dayData.notes && "fill-current")} />
                            </button>
                          )}
                        </div>
                        {dayData && isCurrentMonth && (
                          <div className="flex-1 flex items-center justify-center">
                            <span className={cn(
                              "text-2xl font-mono font-bold leading-none",
                              pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                            )}>
                              {pnl >= 0 ? "+" : ""}{pnl > 999 || pnl < -999 ? `${(pnl / 1000).toFixed(1)}k` : pnl.toFixed(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tooltip */}
                    {dayData && isCurrentMonth && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        <div className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg px-3 py-2 shadow-2xl whitespace-nowrap">
                          <div className="text-xs text-white/60 mb-1">
                            {format(day, "MMM d, yyyy")}
                          </div>
                          <div className={cn(
                            "text-sm font-mono font-bold",
                            pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                          </div>
                          <div className="text-xs text-white/60">
                            {dayData.trades} {dayData.trades === 1 ? "trade" : "trades"}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-white/40">
            Click on days to filter trades
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/40">Loss</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded bg-red-600/65 border border-red-500/70" />
                <div className="w-3 h-3 rounded bg-red-500/45 border border-red-400/50" />
                <div className="w-3 h-3 rounded bg-red-400/30 border border-red-300/35" />
                <div className="w-3 h-3 rounded bg-zinc-500/15 border border-zinc-400/20" />
                <div className="w-3 h-3 rounded bg-lime-500/30 border border-lime-400/35" />
                <div className="w-3 h-3 rounded bg-green-500/45 border border-green-400/50" />
                <div className="w-3 h-3 rounded bg-emerald-600/65 border border-emerald-500/70" />
              </div>
              <span className="text-xs text-white/40">Profit</span>
            </div>
          </div>
        </div>
      </div>
      </motion.div>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Daily Notes</DialogTitle>
            <DialogDescription>
              {selectedDate && format(new Date(selectedDate), "MMMM d, yyyy")}
              {selectedDate && dataMap.get(selectedDate) && (
                <span className={cn(
                  "ml-2 font-mono font-bold",
                  (dataMap.get(selectedDate)?.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {(dataMap.get(selectedDate)?.pnl ?? 0) >= 0 ? "+" : ""}
                  ${dataMap.get(selectedDate)?.pnl.toFixed(2)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={currentNotes}
              onChange={(e) => setCurrentNotes(e.target.value)}
              placeholder="Add notes about your trading day..."
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
            <Button onClick={handleSaveNotes} disabled={isSavingNotes}>
              {isSavingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
