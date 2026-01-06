import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Payouts",
  description: "View and request payouts",
};

// Mock data
const mockPayouts = [
  {
    id: "1",
    requestedAmount: 2500,
    approvedAmount: 2000,
    status: "completed",
    accountNumber: "PF-100K-67890",
    profitSplit: 80,
    createdAt: "2024-01-15T10:00:00Z",
    paidAt: "2024-01-17T14:30:00Z",
  },
  {
    id: "2",
    requestedAmount: 1500,
    approvedAmount: null,
    status: "pending",
    accountNumber: "PF-100K-67890",
    profitSplit: 80,
    createdAt: "2024-01-20T09:00:00Z",
    paidAt: null,
  },
  {
    id: "3",
    requestedAmount: 3000,
    approvedAmount: 2500,
    status: "completed",
    accountNumber: "PF-100K-67890",
    profitSplit: 80,
    createdAt: "2024-01-05T11:00:00Z",
    paidAt: "2024-01-07T16:00:00Z",
  },
];

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  pending: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  approved: { color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", icon: CheckCircle },
  processing: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Clock },
  completed: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle },
  rejected: { color: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: XCircle },
};

export default async function PayoutsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const totalPaid = mockPayouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (p.approvedAmount || 0), 0);

  const pendingAmount = mockPayouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.requestedAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
          <p className="text-muted-foreground">
            View your payout history and request withdrawals
          </p>
        </div>
        <Button>Request Payout</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Paid"
          value={`$${totalPaid.toLocaleString()}`}
          description="Lifetime payouts"
          icon={DollarSign}
        />
        <StatCard
          title="Pending"
          value={`$${pendingAmount.toLocaleString()}`}
          description="Awaiting approval"
          icon={Clock}
        />
        <StatCard
          title="Profit Split"
          value="80%"
          description="Your share of profits"
          icon={CheckCircle}
        />
      </div>

      {/* How Payouts Work */}
      <div className="relative rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-cyan-500/5 backdrop-blur-xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
        <div className="relative">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-1">How Payouts Work</h3>
            <p className="text-sm text-white/60">Understanding the payout process</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-violet-500/20 border border-violet-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-violet-400 font-bold">1</span>
              </div>
              <h4 className="font-medium text-white mb-1">Request Payout</h4>
              <p className="text-sm text-white/60">
                Submit a payout request from your funded account
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-cyan-400 font-bold">2</span>
              </div>
              <h4 className="font-medium text-white mb-1">Review</h4>
              <p className="text-sm text-white/60">
                We review and approve your request within 24-48 hours
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-emerald-400 font-bold">3</span>
              </div>
              <h4 className="font-medium text-white mb-1">Get Paid</h4>
              <p className="text-sm text-white/60">
                Receive 80% of your profits via your preferred method
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-cyan-500/5 backdrop-blur-xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
        <div className="relative">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-1">Payout History</h3>
            <p className="text-sm text-white/60">Your past and pending payout requests</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/80">Account</TableHead>
                <TableHead className="text-white/80">Requested</TableHead>
                <TableHead className="text-white/80">Approved</TableHead>
                <TableHead className="text-white/80">Status</TableHead>
                <TableHead className="text-white/80">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPayouts.map((payout) => {
                const config = statusConfig[payout.status];
                return (
                  <TableRow key={payout.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      {payout.accountNumber}
                    </TableCell>
                    <TableCell className="text-white/80">${payout.requestedAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-white/80">
                      {payout.approvedAmount
                        ? `$${payout.approvedAmount.toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(config.color)}>
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/80">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
