"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Layers,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  ShieldCheck,
  FileText,
  Shield,
  Zap,
  BarChart,
  Activity,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { logoutUser } from "@/server/actions/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/accounts", label: "Accounts", icon: Wallet },
  { href: "/admin/tiers", label: "Tiers", icon: Layers },
  { href: "/admin/payouts", label: "Payouts", icon: DollarSign },
  { href: "/admin/risk-management", label: "Risk Management", icon: Shield },
  { href: "/admin/reports", label: "Reports", icon: BarChart },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/admin/bulk-operations", label: "Bulk Operations", icon: Zap },
  { href: "/admin/system-health", label: "System Health", icon: Activity },
  { href: "/admin/dev-tools", label: "Dev Tools", icon: Wrench },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
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
    <aside className="hidden lg:flex h-screen w-64 flex-col fixed left-0 top-0 border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <span className="text-xl font-bold">PropFirm</span>
          <Badge variant="secondary" className="ml-2 text-[10px]">Admin</Badge>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {adminLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          asChild
        >
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            User Dashboard
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
