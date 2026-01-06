import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountCard } from "@/components/dashboard/account-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { tradingAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "My Accounts",
  description: "Manage your trading accounts",
};

export default async function AccountsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch real accounts from database
  const rawAccounts = await db.query.tradingAccounts.findMany({
    where: eq(tradingAccounts.userId, session.user.id),
    with: {
      tier: {
        columns: {
          displayName: true,
          accountSize: true,
          profitTarget: true,
          maxDrawdown: true,
        },
      },
    },
    orderBy: (accounts, { desc }) => [desc(accounts.createdAt)],
  });

  // Transform accounts to match AccountCard expectations
  const userAccounts = rawAccounts.map(account => ({
    ...account,
    profitTarget: Number(account.tier?.profitTarget || 0),
    maxDrawdown: Number(account.tier?.maxDrawdown || 0),
    currentBalance: Number(account.currentBalance),
    initialBalance: Number(account.initialBalance),
    currentDrawdown: Number(account.currentDrawdown),
  }));

  const activeAccounts = userAccounts.filter(
    (a) => a.status === "active" || a.status === "funded"
  );
  const completedAccounts = userAccounts.filter(
    (a) => a.status === "passed" || a.status === "failed"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Accounts</h1>
          <p className="text-muted-foreground">
            Manage and track all your trading accounts
          </p>
        </div>
        <Button asChild>
          <Link href="/accounts/purchase">
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({userAccounts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeAccounts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeAccounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedAccounts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedAccounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader className="text-center">
                <CardTitle>No completed accounts</CardTitle>
                <CardDescription>
                  Your passed and failed accounts will appear here
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all">
          {userAccounts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userAccounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>No active accounts</CardTitle>
        <CardDescription>
          Get started by purchasing your first evaluation account
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild>
          <Link href="/accounts/purchase">
            <Plus className="mr-2 h-4 w-4" />
            Purchase Account
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
