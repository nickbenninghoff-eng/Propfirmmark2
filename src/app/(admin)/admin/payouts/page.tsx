import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Payout Management",
  description: "Manage payout requests",
};

// Mock data
const stats = {
  pendingTotal: 15750,
  pendingCount: 8,
  approvedThisMonth: 45250,
  approvedCount: 32,
  averagePayout: 1415,
};

const mockPayouts = [
  {
    id: "1",
    user: "Alex Turner",
    email: "alex@example.com",
    account: "PF-100K-12345",
    requestedAmount: 2500,
    profitSplit: 80,
    traderShare: 2000,
    firmShare: 500,
    status: "pending",
    paymentMethod: "Bank Transfer",
    createdAt: "2024-01-20T10:00:00Z",
  },
  {
    id: "2",
    user: "Emma Davis",
    email: "emma@example.com",
    account: "PF-50K-67890",
    requestedAmount: 1800,
    profitSplit: 80,
    traderShare: 1440,
    firmShare: 360,
    status: "pending",
    paymentMethod: "PayPal",
    createdAt: "2024-01-19T14:30:00Z",
  },
  {
    id: "3",
    user: "Ryan Miller",
    email: "ryan@example.com",
    account: "PF-150K-11111",
    requestedAmount: 3200,
    profitSplit: 80,
    traderShare: 2560,
    firmShare: 640,
    status: "pending",
    paymentMethod: "Crypto",
    createdAt: "2024-01-18T09:15:00Z",
  },
  {
    id: "4",
    user: "John Doe",
    email: "john@example.com",
    account: "PF-100K-22222",
    requestedAmount: 4500,
    approvedAmount: 4500,
    profitSplit: 80,
    traderShare: 3600,
    firmShare: 900,
    status: "completed",
    paymentMethod: "Bank Transfer",
    createdAt: "2024-01-15T11:00:00Z",
    paidAt: "2024-01-16T16:00:00Z",
  },
  {
    id: "5",
    user: "Jane Smith",
    email: "jane@example.com",
    account: "PF-50K-33333",
    requestedAmount: 1200,
    approvedAmount: 1000,
    profitSplit: 80,
    traderShare: 800,
    firmShare: 200,
    status: "completed",
    paymentMethod: "PayPal",
    createdAt: "2024-01-12T08:30:00Z",
    paidAt: "2024-01-13T10:00:00Z",
  },
];

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  pending: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  approved: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: CheckCircle },
  processing: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertCircle },
  completed: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle },
  rejected: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
};

export default function PayoutsPage() {
  const pendingPayouts = mockPayouts.filter((p) => p.status === "pending");
  const completedPayouts = mockPayouts.filter((p) => p.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payout Management</h1>
        <p className="text-muted-foreground">
          Review and process payout requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Pending Amount"
          value={`$${stats.pendingTotal.toLocaleString()}`}
          description={`${stats.pendingCount} requests`}
          icon={Clock}
        />
        <StatCard
          title="Paid This Month"
          value={`$${stats.approvedThisMonth.toLocaleString()}`}
          description={`${stats.approvedCount} payouts`}
          icon={DollarSign}
        />
        <StatCard
          title="Average Payout"
          value={`$${stats.averagePayout.toLocaleString()}`}
          description="Per request"
          icon={DollarSign}
        />
        <StatCard
          title="Processing Time"
          value="< 24h"
          description="Average approval"
          icon={CheckCircle}
        />
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({mockPayouts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payouts</CardTitle>
              <CardDescription>Requests awaiting your approval</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trader</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Trader Share (80%)</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payout.user}</p>
                          <p className="text-sm text-muted-foreground">{payout.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{payout.account}</TableCell>
                      <TableCell className="font-semibold">
                        ${payout.requestedAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-green-500 font-medium">
                        ${payout.traderShare.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payout.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 border-red-500">
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Payouts</CardTitle>
              <CardDescription>Successfully processed payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trader</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedPayouts.map((payout) => {
                    const config = statusConfig[payout.status];
                    return (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payout.user}</p>
                            <p className="text-sm text-muted-foreground">{payout.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{payout.account}</TableCell>
                        <TableCell className="font-semibold text-green-500">
                          ${payout.approvedAmount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payout.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {payout.paidAt && new Date(payout.paidAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(config.color)}>
                            {payout.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Payouts</CardTitle>
              <CardDescription>Complete payout history</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trader</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPayouts.map((payout) => {
                    const config = statusConfig[payout.status];
                    return (
                      <TableRow key={payout.id}>
                        <TableCell className="font-medium">{payout.user}</TableCell>
                        <TableCell className="font-mono text-sm">{payout.account}</TableCell>
                        <TableCell className="font-semibold">
                          ${(payout.approvedAmount || payout.requestedAmount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payout.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(config.color)}>
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
