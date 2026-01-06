"use server";

import { db } from "@/lib/db";
import { users, tradingAccounts, accountTiers, transactions, payoutRequests, siteSettings, announcements, auditLogs } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, sql, desc, and, gte, count, or, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// Helper to check if user is admin
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

// ==================== DASHBOARD METRICS ====================

export async function getAdminDashboardMetrics() {
  await requireAdmin();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Total users
  const [totalUsersResult] = await db
    .select({ count: count() })
    .from(users);

  // New users this month
  const [newUsersThisMonth] = await db
    .select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, startOfMonth));

  // Total accounts by status
  const accountsByStatus = await db
    .select({
      status: tradingAccounts.status,
      count: count(),
    })
    .from(tradingAccounts)
    .groupBy(tradingAccounts.status);

  // Revenue this month
  const [revenueThisMonth] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "completed"),
        gte(transactions.createdAt, startOfMonth)
      )
    );

  // Revenue last month for comparison
  const [revenueLastMonth] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "completed"),
        gte(transactions.createdAt, startOfLastMonth),
        sql`created_at < ${startOfMonth}`
      )
    );

  // Pending payouts
  const [pendingPayoutsResult] = await db
    .select({
      count: count(),
      total: sql<string>`COALESCE(SUM(CAST(${payoutRequests.requestedAmount} AS DECIMAL)), 0)`,
    })
    .from(payoutRequests)
    .where(eq(payoutRequests.status, "pending"));

  // Calculate pass rate
  const passedAccounts = accountsByStatus.find(a => a.status === "passed" || a.status === "funded")?.count || 0;
  const failedAccounts = accountsByStatus.find(a => a.status === "failed")?.count || 0;
  const totalCompleted = Number(passedAccounts) + Number(failedAccounts);
  const passRate = totalCompleted > 0 ? (Number(passedAccounts) / totalCompleted * 100) : 0;

  return {
    totalUsers: Number(totalUsersResult?.count || 0),
    newUsersThisMonth: Number(newUsersThisMonth?.count || 0),
    accountsByStatus: accountsByStatus.reduce((acc, curr) => {
      acc[curr.status] = Number(curr.count);
      return acc;
    }, {} as Record<string, number>),
    revenueThisMonth: Number(revenueThisMonth?.total || 0),
    revenueLastMonth: Number(revenueLastMonth?.total || 0),
    pendingPayoutsCount: Number(pendingPayoutsResult?.count || 0),
    pendingPayoutsAmount: Number(pendingPayoutsResult?.total || 0),
    passRate: Math.round(passRate * 10) / 10,
  };
}

export async function getRecentTransactions(limit = 10) {
  await requireAdmin();

  const recentTx = await db.query.transactions.findMany({
    orderBy: [desc(transactions.createdAt)],
    limit,
    with: {
      user: {
        columns: { firstName: true, lastName: true, email: true },
      },
      tradingAccount: {
        columns: { accountNumber: true },
        with: {
          tier: { columns: { displayName: true } },
        },
      },
    },
  });

  return recentTx;
}

export async function getPendingPayouts() {
  await requireAdmin();

  const pending = await db.query.payoutRequests.findMany({
    where: eq(payoutRequests.status, "pending"),
    orderBy: [desc(payoutRequests.createdAt)],
    with: {
      user: {
        columns: { firstName: true, lastName: true, email: true },
      },
      tradingAccount: {
        columns: { accountNumber: true },
      },
    },
  });

  return pending;
}

// ==================== TIER MANAGEMENT ====================

export async function getAllTiers() {
  await requireAdmin();

  const tiers = await db.query.accountTiers.findMany({
    orderBy: [accountTiers.sortOrder],
  });

  return tiers;
}

export async function createTier(data: {
  name: string;
  displayName: string;
  description?: string;
  accountSize: number;
  price: string;
  resetPrice: string;
  profitTarget: string;
  profitTargetPercent: string;
  maxDrawdown: string;
  maxDrawdownPercent: string;
  dailyLossLimit: string;
  dailyLossLimitPercent: string;
  minTradingDays: number;
  profitSplit: string;
  isActive?: boolean;
  isPopular?: boolean;
}) {
  await requireAdmin();

  const [newTier] = await db
    .insert(accountTiers)
    .values({
      ...data,
      drawdownType: "trailing_eod",
      payoutFrequency: "weekly",
      minPayoutAmount: "100.00",
    })
    .returning();

  revalidatePath("/admin/tiers");
  return newTier;
}

export async function updateTier(tierId: string, data: Partial<{
  name: string;
  displayName: string;
  description: string;
  accountSize: number;
  price: string;
  resetPrice: string;
  profitTarget: string;
  profitTargetPercent: string;
  maxDrawdown: string;
  maxDrawdownPercent: string;
  dailyLossLimit: string;
  dailyLossLimitPercent: string;
  minTradingDays: number;
  profitSplit: string;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}>) {
  await requireAdmin();

  const [updated] = await db
    .update(accountTiers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(accountTiers.id, tierId))
    .returning();

  revalidatePath("/admin/tiers");
  return updated;
}

export async function deleteTier(tierId: string) {
  await requireAdmin();

  // Check if tier has any accounts
  const [accountCount] = await db
    .select({ count: count() })
    .from(tradingAccounts)
    .where(eq(tradingAccounts.tierId, tierId));

  if (Number(accountCount?.count) > 0) {
    throw new Error("Cannot delete tier with existing accounts. Deactivate it instead.");
  }

  await db.delete(accountTiers).where(eq(accountTiers.id, tierId));
  revalidatePath("/admin/tiers");
}

// ==================== USER MANAGEMENT ====================

export async function getAllUsers(page = 1, limit = 20, search?: string) {
  await requireAdmin();

  const offset = (page - 1) * limit;

  let query = db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      isSuspended: users.isSuspended,
    })
    .from(users);

  if (search) {
    query = query.where(
      sql`(email ILIKE ${`%${search}%`} OR first_name ILIKE ${`%${search}%`} OR last_name ILIKE ${`%${search}%`})`
    ) as typeof query;
  }

  const allUsers = await query
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db.select({ count: count() }).from(users);

  return {
    users: allUsers,
    total: Number(totalResult?.count || 0),
    page,
    limit,
    totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
  };
}

export async function updateUserRole(userId: string, role: "user" | "admin" | "super_admin") {
  await requireAdmin();

  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  revalidatePath("/admin/users");
  return updated;
}

export async function suspendUser(userId: string, suspend: boolean) {
  await requireAdmin();

  const [updated] = await db
    .update(users)
    .set({
      isSuspended: suspend,
      suspendedAt: suspend ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  revalidatePath("/admin/users");
  return updated;
}

// ==================== PAYOUT MANAGEMENT ====================

export async function approveOrRejectPayout(payoutId: string, action: "approve" | "reject", notes?: string) {
  const admin = await requireAdmin();

  const [updated] = await db
    .update(payoutRequests)
    .set({
      status: action === "approve" ? "approved" : "rejected",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      reviewNotes: notes,
      updatedAt: new Date(),
    })
    .where(eq(payoutRequests.id, payoutId))
    .returning();

  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
  return updated;
}

// ==================== SITE SETTINGS ====================

export async function getSiteSettings() {
  await requireAdmin();

  const settings = await db.query.siteSettings.findMany();

  return settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, unknown>);
}

export async function updateSiteSetting(key: string, value: unknown, description?: string) {
  const admin = await requireAdmin();

  // Upsert the setting
  await db
    .insert(siteSettings)
    .values({
      key,
      value,
      description,
      updatedBy: admin.id,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value,
        description,
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/admin/settings");
  return { key, value };
}

// Quick setting helpers
export async function setTradingEnabled(enabled: boolean) {
  return updateSiteSetting("trading_enabled", enabled, "Whether trading is enabled platform-wide");
}

export async function setMarketsClosed(closed: boolean, reason?: string) {
  return updateSiteSetting("markets_closed", { closed, reason, closedAt: closed ? new Date().toISOString() : null }, "Emergency market closure status");
}

export async function setMaintenanceMode(enabled: boolean, message?: string) {
  return updateSiteSetting("maintenance_mode", { enabled, message }, "Platform maintenance mode");
}

// ==================== ANNOUNCEMENTS ====================

export async function getAnnouncements() {
  await requireAdmin();

  return db.query.announcements.findMany({
    orderBy: [desc(announcements.createdAt)],
  });
}

export async function createAnnouncement(data: {
  title: string;
  message: string;
  type?: string;
  startsAt?: Date;
  endsAt?: Date;
}) {
  const admin = await requireAdmin();

  const [newAnnouncement] = await db
    .insert(announcements)
    .values({
      ...data,
      createdBy: admin.id,
    })
    .returning();

  revalidatePath("/admin/announcements");
  return newAnnouncement;
}

export async function toggleAnnouncement(id: string, isActive: boolean) {
  await requireAdmin();

  const [updated] = await db
    .update(announcements)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning();

  revalidatePath("/admin/announcements");
  return updated;
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();

  await db.delete(announcements).where(eq(announcements.id, id));
  revalidatePath("/admin/announcements");
}

// ==================== AUDIT LOGGING ====================

async function createAuditLog(
  action: string,
  entityType: string,
  entityId?: string,
  previousData?: unknown,
  newData?: unknown
) {
  try {
    const session = await auth();
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
    const userAgent = headersList.get("user-agent") || null;

    await db.insert(auditLogs).values({
      userId: session?.user?.id || null,
      action,
      entityType,
      entityId: entityId || null,
      previousData: previousData ? (previousData as object) : null,
      newData: newData ? (newData as object) : null,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(page = 1, limit = 50, filters?: {
  userId?: string;
  entityType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  await requireAdmin();

  const offset = (page - 1) * limit;

  let whereConditions = [];

  if (filters?.userId) {
    whereConditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters?.entityType) {
    whereConditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters?.action) {
    whereConditions.push(like(auditLogs.action, `%${filters.action}%`));
  }
  if (filters?.startDate) {
    whereConditions.push(gte(auditLogs.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    whereConditions.push(sql`${auditLogs.createdAt} <= ${filters.endDate}`);
  }

  const logs = await db.query.auditLogs.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    orderBy: [desc(auditLogs.createdAt)],
    limit,
    offset,
    with: {
      user: {
        columns: { firstName: true, lastName: true, email: true },
      },
    },
  });

  // For each log, if it's related to a trading account, fetch the account owner
  const logsWithTraderInfo = await Promise.all(
    logs.map(async (log) => {
      if (log.entityType === "trading_account" && log.entityId) {
        const account = await db.query.tradingAccounts.findFirst({
          where: eq(tradingAccounts.id, log.entityId),
          with: {
            user: {
              columns: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        });
        return { ...log, affectedUser: account?.user || null };
      }
      return { ...log, affectedUser: null };
    })
  );

  const [totalResult] = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  return {
    logs: logsWithTraderInfo,
    total: Number(totalResult?.count || 0),
    page,
    limit,
    totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
  };
}

// ==================== ACCOUNT MANAGEMENT ====================

export async function getAllAccounts(page = 1, limit = 20, filters?: {
  status?: string;
  userId?: string;
  tierId?: string;
  search?: string;
}) {
  await requireAdmin();

  const offset = (page - 1) * limit;

  let whereConditions = [];

  if (filters?.status) {
    whereConditions.push(eq(tradingAccounts.status, filters.status as any));
  }
  if (filters?.userId) {
    whereConditions.push(eq(tradingAccounts.userId, filters.userId));
  }
  if (filters?.tierId) {
    whereConditions.push(eq(tradingAccounts.tierId, filters.tierId));
  }
  if (filters?.search) {
    whereConditions.push(
      or(
        like(tradingAccounts.accountNumber, `%${filters.search}%`),
        like(tradingAccounts.rithmicAccountId, `%${filters.search}%`)
      )
    );
  }

  const accounts = await db.query.tradingAccounts.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    orderBy: [desc(tradingAccounts.createdAt)],
    limit,
    offset,
    with: {
      user: {
        columns: { firstName: true, lastName: true, email: true },
      },
      tier: {
        columns: { displayName: true, accountSize: true },
      },
    },
  });

  const [totalResult] = await db
    .select({ count: count() })
    .from(tradingAccounts)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  return {
    accounts,
    total: Number(totalResult?.count || 0),
    page,
    limit,
    totalPages: Math.ceil(Number(totalResult?.count || 0) / limit),
  };
}

export async function changeAccountStatus(
  accountId: string,
  newStatus: string,
  reason?: string
) {
  const admin = await requireAdmin();

  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
  });

  if (!account) {
    throw new Error("Account not found");
  }

  const updateData: any = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === "failed") {
    updateData.failureReason = reason || "Manual admin action";
    updateData.failedAt = new Date();
  } else if (newStatus === "funded") {
    updateData.fundedAt = new Date();
    updateData.phase = "funded";
  } else if (newStatus === "active") {
    updateData.activatedAt = updateData.activatedAt || new Date();
  }

  const [updated] = await db
    .update(tradingAccounts)
    .set(updateData)
    .where(eq(tradingAccounts.id, accountId))
    .returning();

  await createAuditLog(
    "change_account_status",
    "trading_account",
    accountId,
    { status: account.status },
    { status: newStatus, reason }
  );

  revalidatePath("/admin/accounts");
  return updated;
}

export async function resetTradingAccount(accountId: string, reason?: string) {
  const admin = await requireAdmin();

  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
    with: { tier: true },
  });

  if (!account || !account.tier) {
    throw new Error("Account or tier not found");
  }

  const previousData = { ...account };

  const [updated] = await db
    .update(tradingAccounts)
    .set({
      status: "active",
      phase: "evaluation_1",
      currentBalance: account.tier.accountSize.toString(),
      highWaterMark: account.tier.accountSize.toString(),
      totalProfit: "0",
      totalLoss: "0",
      currentDrawdown: "0",
      maxDrawdownReached: "0",
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      tradingDaysCount: 0,
      profitTargetReached: false,
      profitTargetReachedAt: null,
      minTradingDaysReached: false,
      failureReason: null,
      failedAt: null,
      resetCount: account.resetCount + 1,
      lastResetAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId))
    .returning();

  await createAuditLog(
    "reset_account",
    "trading_account",
    accountId,
    previousData,
    { resetCount: updated.resetCount, reason }
  );

  revalidatePath("/admin/accounts");
  return updated;
}

export async function adjustAccountBalance(
  accountId: string,
  newBalance: string,
  reason: string
) {
  const admin = await requireAdmin();

  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
  });

  if (!account) {
    throw new Error("Account not found");
  }

  const [updated] = await db
    .update(tradingAccounts)
    .set({
      currentBalance: newBalance,
      highWaterMark: sql`GREATEST(high_water_mark, ${newBalance})`,
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId))
    .returning();

  await createAuditLog(
    "adjust_balance",
    "trading_account",
    accountId,
    { currentBalance: account.currentBalance },
    { currentBalance: newBalance, reason }
  );

  revalidatePath("/admin/accounts");
  return updated;
}

export async function suspendTradingAccount(accountId: string, suspend: boolean, reason?: string) {
  const admin = await requireAdmin();

  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
  });

  if (!account) {
    throw new Error("Account not found");
  }

  const [updated] = await db
    .update(tradingAccounts)
    .set({
      status: suspend ? "suspended" : account.status === "suspended" ? "active" : account.status,
      updatedAt: new Date(),
    })
    .where(eq(tradingAccounts.id, accountId))
    .returning();

  await createAuditLog(
    suspend ? "suspend_account" : "unsuspend_account",
    "trading_account",
    accountId,
    { status: account.status },
    { status: updated.status, reason }
  );

  revalidatePath("/admin/accounts");
  return updated;
}

// ==================== BULK OPERATIONS ====================

export async function bulkUpdateAccountStatus(
  accountIds: string[],
  newStatus: string,
  reason?: string
) {
  const admin = await requireAdmin();

  const updated = await db
    .update(tradingAccounts)
    .set({
      status: newStatus as any,
      updatedAt: new Date(),
      ...(newStatus === "failed" ? { failureReason: reason, failedAt: new Date() } : {}),
    })
    .where(sql`${tradingAccounts.id} = ANY(${accountIds})`)
    .returning();

  await createAuditLog(
    "bulk_update_account_status",
    "trading_account",
    undefined,
    { accountIds },
    { status: newStatus, count: updated.length, reason }
  );

  revalidatePath("/admin/accounts");
  return updated;
}

export async function bulkNotifyUsers(
  userIds: string[],
  title: string,
  message: string
) {
  const admin = await requireAdmin();

  // This would integrate with your notification system
  // For now, we'll just log it
  await createAuditLog(
    "bulk_notify_users",
    "notification",
    undefined,
    { userIds },
    { title, message, count: userIds.length }
  );

  revalidatePath("/admin/users");
  return { success: true, count: userIds.length };
}

// ==================== REPORTS ====================

export async function generateRevenueReport(startDate: Date, endDate: Date) {
  await requireAdmin();

  const report = await db
    .select({
      date: sql<string>`DATE(${transactions.createdAt})`,
      total: sql<string>`SUM(CAST(${transactions.amount} AS DECIMAL))`,
      count: count(),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "completed"),
        gte(transactions.createdAt, startDate),
        sql`${transactions.createdAt} <= ${endDate}`
      )
    )
    .groupBy(sql`DATE(${transactions.createdAt})`)
    .orderBy(sql`DATE(${transactions.createdAt})`);

  return report;
}

export async function generateUserReport() {
  await requireAdmin();

  const report = await db
    .select({
      total: count(),
      active: sql<number>`COUNT(CASE WHEN is_suspended = false THEN 1 END)`,
      suspended: sql<number>`COUNT(CASE WHEN is_suspended = true THEN 1 END)`,
      withAccounts: sql<number>`COUNT(DISTINCT ${tradingAccounts.userId})`,
    })
    .from(users)
    .leftJoin(tradingAccounts, eq(users.id, tradingAccounts.userId));

  return report[0];
}

export async function generateAccountPerformanceReport(tierId?: string) {
  await requireAdmin();

  let whereCondition = tierId ? eq(tradingAccounts.tierId, tierId) : undefined;

  const report = await db
    .select({
      status: tradingAccounts.status,
      count: count(),
      avgTrades: sql<number>`AVG(${tradingAccounts.totalTrades})`,
      avgProfit: sql<string>`AVG(CAST(${tradingAccounts.totalProfit} AS DECIMAL))`,
      passRate: sql<number>`
        COUNT(CASE WHEN status IN ('passed', 'funded') THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)
      `,
    })
    .from(tradingAccounts)
    .where(whereCondition)
    .groupBy(tradingAccounts.status);

  return report;
}

// ==================== SYSTEM HEALTH ====================

export async function getSystemHealth() {
  await requireAdmin();

  try {
    // Test database connection
    const [dbTest] = await db.select({ count: count() }).from(users);
    const dbHealth = dbTest ? "healthy" : "unhealthy";

    // Check Stripe
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

    // Check Rithmic
    const rithmicConfigured = !!process.env.RITHMIC_API_KEY;

    // Check email service
    const emailConfigured = !!process.env.RESEND_API_KEY;

    // Get recent activity
    const [recentActivity] = await db
      .select({ count: count() })
      .from(transactions)
      .where(gte(transactions.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

    const [recentUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.lastLoginAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

    return {
      database: {
        status: dbHealth,
        message: dbHealth === "healthy" ? "Connected" : "Connection failed",
      },
      stripe: {
        status: stripeConfigured ? "configured" : "not_configured",
        message: stripeConfigured ? "API key configured" : "No API key found",
      },
      rithmic: {
        status: rithmicConfigured ? "configured" : "not_configured",
        message: rithmicConfigured ? "API key configured" : "No API key found",
      },
      email: {
        status: emailConfigured ? "configured" : "not_configured",
        message: emailConfigured ? "Resend API key configured" : "No API key found",
      },
      activity: {
        transactionsLast24h: Number(recentActivity?.count || 0),
        activeUsersLast24h: Number(recentUsers?.count || 0),
      },
    };
  } catch (error) {
    console.error("System health check failed:", error);
    throw new Error("Failed to check system health");
  }
}

// Update existing functions to include audit logging

export async function updateTierWithAudit(tierId: string, data: Parameters<typeof updateTier>[1]) {
  const tier = await db.query.accountTiers.findFirst({
    where: eq(accountTiers.id, tierId),
  });

  const result = await updateTier(tierId, data);

  await createAuditLog(
    "update_tier",
    "account_tier",
    tierId,
    tier,
    data
  );

  return result;
}

export async function updateUserRoleWithAudit(userId: string, role: "user" | "admin" | "super_admin") {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const result = await updateUserRole(userId, role);

  await createAuditLog(
    "update_user_role",
    "user",
    userId,
    { role: user?.role },
    { role }
  );

  return result;
}

export async function approveOrRejectPayoutWithAudit(
  payoutId: string,
  action: "approve" | "reject",
  notes?: string
) {
  const payout = await db.query.payoutRequests.findFirst({
    where: eq(payoutRequests.id, payoutId),
  });

  const result = await approveOrRejectPayout(payoutId, action, notes);

  await createAuditLog(
    `${action}_payout`,
    "payout_request",
    payoutId,
    { status: payout?.status },
    { status: action === "approve" ? "approved" : "rejected", notes }
  );

  return result;
}
