import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getAllTiers } from "@/server/actions/admin";
import { CreateTierButton, EditTierButton, ToggleTierButton, DeleteTierButton } from "@/components/admin/tier-actions";

export const metadata: Metadata = {
  title: "Tier Management",
  description: "Manage account tiers",
};

export default async function TiersPage() {
  const tiers = await getAllTiers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tier Management</h1>
          <p className="text-muted-foreground">
            Create and manage evaluation account tiers
          </p>
        </div>
        <CreateTierButton />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tiers.length}</div>
            <p className="text-xs text-muted-foreground">
              {tiers.filter(t => t.isActive).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lowest Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${tiers.length > 0 ? Math.min(...tiers.map(t => Number(t.price))).toFixed(0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Entry tier</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highest Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${tiers.length > 0 ? Math.max(...tiers.map(t => Number(t.price))).toFixed(0) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Premium tier</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Max Account Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${tiers.length > 0 ? Math.max(...tiers.map(t => t.accountSize)).toLocaleString() : 0}
            </div>
            <p className="text-xs text-muted-foreground">Largest evaluation</p>
          </CardContent>
        </Card>
      </div>

      {/* Tiers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tiers</CardTitle>
          <CardDescription>Click on the edit button to modify tier settings</CardDescription>
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tiers created yet. Create your first tier to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Profit Target</TableHead>
                  <TableHead>Max Drawdown</TableHead>
                  <TableHead>Daily Limit</TableHead>
                  <TableHead>Min Days</TableHead>
                  <TableHead>Profit Split</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tier.displayName}</span>
                        {tier.isPopular && (
                          <Badge className="text-xs">Popular</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">${Number(tier.price).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">
                          Reset: ${Number(tier.resetPrice).toFixed(0)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-green-500 font-medium">
                        ${Number(tier.profitTarget).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-sm ml-1">
                        ({tier.profitTargetPercent}%)
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-red-500 font-medium">
                        ${Number(tier.maxDrawdown).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-sm ml-1">
                        ({tier.maxDrawdownPercent}%)
                      </span>
                    </TableCell>
                    <TableCell>${Number(tier.dailyLossLimit || 0).toLocaleString()}</TableCell>
                    <TableCell>{tier.minTradingDays} days</TableCell>
                    <TableCell>{tier.profitSplit}%</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          tier.isActive
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                        )}
                      >
                        {tier.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <EditTierButton tier={tier} />
                        <ToggleTierButton tier={tier} />
                        <DeleteTierButton tier={tier} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rules Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Default Rules</CardTitle>
          <CardDescription>These rules apply to all tiers unless overridden</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Trading Rules</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Minimum 5 trading days</li>
                <li>No weekend holding</li>
                <li>News trading allowed</li>
                <li>Trailing drawdown (EOD)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Payout Rules</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>80% profit split</li>
                <li>Weekly payout frequency</li>
                <li>$100 minimum payout</li>
                <li>Multiple payment methods</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Account Rules</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>No time limit on evaluation</li>
                <li>Single phase evaluation</li>
                <li>Instant reset available</li>
                <li>24/7 dashboard access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
