"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  DollarSign,
  Settings,
  TrendingUp,
  LogOut,
  ShoppingCart,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logoutUser } from "@/server/actions/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const mainLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "My Accounts", icon: Wallet },
  { href: "/accounts/purchase", label: "Purchase Account", icon: ShoppingCart },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/payouts", label: "Payouts", icon: DollarSign },
];

const bottomLinks = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await logoutUser();
      router.push("/");
      router.refresh();
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to log out");
    }
  }

  return (
    <aside className="hidden lg:flex h-screen w-72 flex-col fixed left-0 top-0 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-xl font-bold text-white">PropFirm</span>
          <p className="text-xs text-slate-500">Trading Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="mb-2 px-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Menu</p>
        </div>
        <nav className="space-y-1">
          {mainLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname.startsWith(link.href));
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-emerald-400")} />
                {link.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 mb-2 px-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Account</p>
        </div>
        <nav className="space-y-1">
          {bottomLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-emerald-400")} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Support Card */}
      <div className="px-4 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700/50 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <HelpCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Need Help?</p>
              <p className="text-xs text-slate-400">Contact support</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center border-white/20 bg-white/5 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-violet-500/20 hover:border-cyan-500/40 hover:scale-[1.02] text-white hover:text-white transition-all duration-300 cursor-pointer"
          >
            Get Support
          </Button>
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-slate-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
