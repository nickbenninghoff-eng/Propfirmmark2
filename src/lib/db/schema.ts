import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  pgEnum,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "super_admin"]);

export const accountStatusEnum = pgEnum("account_status", [
  "pending_payment",
  "pending_activation",
  "active",
  "passed",
  "funded",
  "failed",
  "suspended",
  "expired",
]);

export const accountPhaseEnum = pgEnum("account_phase", [
  "evaluation_1",
  "evaluation_2",
  "funded",
]);

export const drawdownTypeEnum = pgEnum("drawdown_type", [
  "static",
  "trailing_eod",
  "trailing_realtime",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "account_purchase",
  "account_reset",
  "subscription",
  "payout",
  "refund",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "approved",
  "processing",
  "completed",
  "rejected",
]);

export const tradeDirectionEnum = pgEnum("trade_direction", ["long", "short"]);

export const accountTypeEnum = pgEnum("account_type", [
  "prop_firm",
  "external_journal",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "stock",
  "option",
  "futures",
  "forex",
  "crypto",
]);

export const optionTypeEnum = pgEnum("option_type", ["call", "put"]);

export const brokerConnectionTypeEnum = pgEnum("broker_connection_type", [
  "mt4",
  "mt5",
  "manual",
]);

export const connectionStatusEnum = pgEnum("connection_status", [
  "pending",
  "connected",
  "disconnected",
  "error",
]);

// Users table
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Auth.js required fields
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    // Custom fields
    passwordHash: text("password_hash"),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    phone: varchar("phone", { length: 20 }),
    avatarUrl: text("avatar_url"),
    addressLine1: varchar("address_line_1", { length: 255 }),
    addressLine2: varchar("address_line_2", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    country: varchar("country", { length: 2 }),
    role: userRoleEnum("role").notNull().default("user"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    kycVerified: boolean("kyc_verified").notNull().default(false),
    kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),
    timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
    notificationPreferences: jsonb("notification_preferences").default({
      email: true,
      sms: false,
      accountUpdates: true,
      marketingEmails: false,
    }),
    referralCode: varchar("referral_code", { length: 20 }).unique(),
    referredBy: uuid("referred_by"),
    isSuspended: boolean("is_suspended").notNull().default(false),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_stripe_customer_idx").on(table.stripeCustomerId),
    index("users_referral_code_idx").on(table.referralCode),
  ]
);

// Auth.js accounts table (for OAuth)
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_idx").on(table.userId),
  ]
);

// Auth.js sessions table
export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

// Auth.js verification tokens
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// Account tiers
export const accountTiers = pgTable(
  "account_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    description: text("description"),
    accountSize: integer("account_size").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    resetPrice: decimal("reset_price", { precision: 10, scale: 2 }).notNull(),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    stripeResetPriceId: varchar("stripe_reset_price_id", { length: 255 }),
    profitTarget: decimal("profit_target", { precision: 10, scale: 2 }).notNull(),
    profitTargetPercent: decimal("profit_target_percent", { precision: 5, scale: 2 }).notNull(),
    maxDrawdown: decimal("max_drawdown", { precision: 10, scale: 2 }).notNull(),
    maxDrawdownPercent: decimal("max_drawdown_percent", { precision: 5, scale: 2 }).notNull(),
    drawdownType: drawdownTypeEnum("drawdown_type").notNull().default("trailing_eod"),
    dailyLossLimit: decimal("daily_loss_limit", { precision: 10, scale: 2 }),
    dailyLossLimitPercent: decimal("daily_loss_limit_percent", { precision: 5, scale: 2 }),
    minTradingDays: integer("min_trading_days").notNull().default(0),
    maxTradingDays: integer("max_trading_days"),
    allowWeekendHolding: boolean("allow_weekend_holding").notNull().default(false),
    allowNewsTrading: boolean("allow_news_trading").notNull().default(true),
    maxContractsPerTrade: integer("max_contracts_per_trade"),
    maxOpenContracts: integer("max_open_contracts"),
    profitSplit: decimal("profit_split", { precision: 5, scale: 2 }).notNull().default("80.00"),
    minPayoutAmount: decimal("min_payout_amount", { precision: 10, scale: 2 }).default("100.00"),
    payoutFrequency: varchar("payout_frequency", { length: 50 }).default("weekly"),
    hasSecondPhase: boolean("has_second_phase").notNull().default(false),
    phase2ProfitTarget: decimal("phase2_profit_target", { precision: 10, scale: 2 }),
    phase2ProfitTargetPercent: decimal("phase2_profit_target_percent", { precision: 5, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    isPopular: boolean("is_popular").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("account_tiers_active_sort_idx").on(table.isActive, table.sortOrder)]
);

// Trading accounts
export const tradingAccounts = pgTable(
  "trading_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tierId: uuid("tier_id")
      .notNull()
      .references(() => accountTiers.id),
    accountNumber: varchar("account_number", { length: 50 }).unique(),
    rithmicAccountId: varchar("rithmic_account_id", { length: 100 }),
    rithmicUsername: varchar("rithmic_username", { length: 100 }),
    accountType: accountTypeEnum("account_type").notNull().default("prop_firm"),
    status: accountStatusEnum("status").notNull().default("pending_payment"),
    phase: accountPhaseEnum("phase").notNull().default("evaluation_1"),
    initialBalance: decimal("initial_balance", { precision: 12, scale: 2 }).notNull(),
    currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).notNull(),
    highWaterMark: decimal("high_water_mark", { precision: 12, scale: 2 }).notNull(),
    totalProfit: decimal("total_profit", { precision: 12, scale: 2 }).notNull().default("0"),
    totalLoss: decimal("total_loss", { precision: 12, scale: 2 }).notNull().default("0"),
    currentDrawdown: decimal("current_drawdown", { precision: 12, scale: 2 }).notNull().default("0"),
    maxDrawdownReached: decimal("max_drawdown_reached", { precision: 12, scale: 2 }).notNull().default("0"),
    drawdownThreshold: decimal("drawdown_threshold", { precision: 12, scale: 2 }).notNull(),
    totalTrades: integer("total_trades").notNull().default(0),
    winningTrades: integer("winning_trades").notNull().default(0),
    losingTrades: integer("losing_trades").notNull().default(0),
    tradingDaysCount: integer("trading_days_count").notNull().default(0),
    profitTargetReached: boolean("profit_target_reached").notNull().default(false),
    profitTargetReachedAt: timestamp("profit_target_reached_at", { withTimezone: true }),
    minTradingDaysReached: boolean("min_trading_days_reached").notNull().default(false),
    failureReason: varchar("failure_reason", { length: 255 }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    resetCount: integer("reset_count").notNull().default(0),
    lastResetAt: timestamp("last_reset_at", { withTimezone: true }),
    fundedAt: timestamp("funded_at", { withTimezone: true }),
    totalPayouts: decimal("total_payouts", { precision: 12, scale: 2 }).default("0"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("trading_accounts_user_idx").on(table.userId),
    index("trading_accounts_status_idx").on(table.status),
    index("trading_accounts_rithmic_idx").on(table.rithmicAccountId),
  ]
);

// Trades
export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradingAccountId: uuid("trading_account_id")
      .notNull()
      .references(() => tradingAccounts.id),
    rithmicTradeId: varchar("rithmic_trade_id", { length: 100 }),
    rithmicOrderId: varchar("rithmic_order_id", { length: 100 }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    exchange: varchar("exchange", { length: 20 }).notNull(),
    direction: tradeDirectionEnum("direction").notNull(),
    quantity: integer("quantity").notNull(),
    entryPrice: decimal("entry_price", { precision: 12, scale: 6 }).notNull(),
    exitPrice: decimal("exit_price", { precision: 12, scale: 6 }),
    commission: decimal("commission", { precision: 10, scale: 2 }).default("0"),
    fees: decimal("fees", { precision: 10, scale: 2 }).default("0"),
    pnl: decimal("pnl", { precision: 12, scale: 2 }),
    netPnl: decimal("net_pnl", { precision: 12, scale: 2 }),
    isOpen: boolean("is_open").notNull().default(true),
    entryTime: timestamp("entry_time", { withTimezone: true }).notNull(),
    exitTime: timestamp("exit_time", { withTimezone: true }),
    // Multi-asset support
    assetType: assetTypeEnum("asset_type").notNull().default("futures"),
    // Options fields
    optionType: optionTypeEnum("option_type"),
    strikePrice: decimal("strike_price", { precision: 12, scale: 2 }),
    expirationDate: timestamp("expiration_date", { withTimezone: true }),
    underlyingSymbol: varchar("underlying_symbol", { length: 20 }),
    // Forex fields
    currencyPair: varchar("currency_pair", { length: 10 }),
    pipValue: decimal("pip_value", { precision: 12, scale: 6 }),
    // Futures fields
    contractMonth: varchar("contract_month", { length: 10 }),
    contractSize: integer("contract_size"),
    // Crypto fields
    cryptoPair: varchar("crypto_pair", { length: 20 }),
    exchangeName: varchar("exchange_name", { length: 50 }),
    // Journal fields
    notes: text("notes"),
    tags: jsonb("tags").default([]),
    setupType: varchar("setup_type", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("trades_account_idx").on(table.tradingAccountId),
    index("trades_symbol_idx").on(table.symbol),
    index("trades_entry_time_idx").on(table.entryTime),
    index("trades_asset_type_idx").on(table.assetType),
    index("trades_underlying_symbol_idx").on(table.underlyingSymbol),
  ]
);

// Daily snapshots
export const dailySnapshots = pgTable(
  "daily_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradingAccountId: uuid("trading_account_id")
      .notNull()
      .references(() => tradingAccounts.id),
    snapshotDate: timestamp("snapshot_date", { withTimezone: true }).notNull(),
    openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).notNull(),
    closingBalance: decimal("closing_balance", { precision: 12, scale: 2 }).notNull(),
    highBalance: decimal("high_balance", { precision: 12, scale: 2 }).notNull(),
    lowBalance: decimal("low_balance", { precision: 12, scale: 2 }).notNull(),
    dailyPnl: decimal("daily_pnl", { precision: 12, scale: 2 }).notNull(),
    tradesCount: integer("trades_count").notNull().default(0),
    winnersCount: integer("winners_count").notNull().default(0),
    losersCount: integer("losers_count").notNull().default(0),
    maxDrawdownToday: decimal("max_drawdown_today", { precision: 12, scale: 2 }),
    dailyLossLimitHit: boolean("daily_loss_limit_hit").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("daily_snapshots_account_date_idx").on(table.tradingAccountId, table.snapshotDate),
  ]
);

// Account equity snapshots
export const accountEquitySnapshots = pgTable(
  "account_equity_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tradingAccountId: uuid("trading_account_id")
      .notNull()
      .references(() => tradingAccounts.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
    equity: decimal("equity", { precision: 12, scale: 2 }).notNull(),
    unrealizedPnl: decimal("unrealized_pnl", { precision: 12, scale: 2 }).default("0"),
    snapshotType: varchar("snapshot_type", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("equity_snapshots_account_time_idx").on(table.tradingAccountId, table.timestamp),
  ]
);

// External broker connections
export const externalBrokerConnections = pgTable(
  "external_broker_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tradingAccountId: uuid("trading_account_id")
      .notNull()
      .references(() => tradingAccounts.id, { onDelete: "cascade" }),
    connectionType: brokerConnectionTypeEnum("connection_type").notNull(),
    brokerName: varchar("broker_name", { length: 100 }),
    accountNumber: varchar("account_number", { length: 100 }),
    apiCredentials: jsonb("api_credentials"),
    status: connectionStatusEnum("status").notNull().default("pending"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    autoSync: boolean("auto_sync").notNull().default(true),
    syncFrequency: integer("sync_frequency").default(300),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("broker_connections_user_idx").on(table.userId),
    index("broker_connections_account_idx").on(table.tradingAccountId),
  ]
);

// Transactions
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tradingAccountId: uuid("trading_account_id").references(() => tradingAccounts.id),
    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").notNull().default("pending"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
    description: text("description"),
    metadata: jsonb("metadata"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transactions_user_idx").on(table.userId),
    index("transactions_stripe_payment_idx").on(table.stripePaymentIntentId),
  ]
);

// Payout requests
export const payoutRequests = pgTable(
  "payout_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tradingAccountId: uuid("trading_account_id")
      .notNull()
      .references(() => tradingAccounts.id),
    requestedAmount: decimal("requested_amount", { precision: 12, scale: 2 }).notNull(),
    approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
    grossProfit: decimal("gross_profit", { precision: 12, scale: 2 }).notNull(),
    profitSplitPercent: decimal("profit_split_percent", { precision: 5, scale: 2 }).notNull(),
    traderShare: decimal("trader_share", { precision: 12, scale: 2 }).notNull(),
    firmShare: decimal("firm_share", { precision: 12, scale: 2 }).notNull(),
    status: payoutStatusEnum("status").notNull().default("pending"),
    paymentMethod: varchar("payment_method", { length: 50 }),
    paymentDetails: jsonb("payment_details"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),
    rejectionReason: text("rejection_reason"),
    paymentReference: varchar("payment_reference", { length: 255 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payout_requests_user_idx").on(table.userId),
    index("payout_requests_status_idx").on(table.status),
  ]
);

// Promo codes
export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),
    discountType: varchar("discount_type", { length: 20 }).notNull(),
    discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
    applicableTierIds: jsonb("applicable_tier_ids"),
    minPurchaseAmount: decimal("min_purchase_amount", { precision: 10, scale: 2 }),
    maxUses: integer("max_uses"),
    maxUsesPerUser: integer("max_uses_per_user").default(1),
    currentUses: integer("current_uses").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("promo_codes_code_idx").on(table.code)]
);

// Promo code uses
export const promoCodeUses = pgTable(
  "promo_code_uses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    promoCodeId: uuid("promo_code_id")
      .notNull()
      .references(() => promoCodes.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    transactionId: uuid("transaction_id").references(() => transactions.id),
    discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("promo_code_uses_promo_user_idx").on(table.promoCodeId, table.userId)]
);

// Audit logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    previousData: jsonb("previous_data"),
    newData: jsonb("new_data"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);

// Site Settings for admin controls
export const siteSettings = pgTable("site_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Announcements/Alerts for users
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // info, warning, error, success
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  tradingAccounts: many(tradingAccounts),
  transactions: many(transactions),
  payoutRequests: many(payoutRequests),
  oauthAccounts: many(accounts),
  referrer: one(users, {
    fields: [users.referredBy],
    references: [users.id],
  }),
}));

export const accountTiersRelations = relations(accountTiers, ({ many }) => ({
  tradingAccounts: many(tradingAccounts),
}));

export const tradingAccountsRelations = relations(tradingAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [tradingAccounts.userId],
    references: [users.id],
  }),
  tier: one(accountTiers, {
    fields: [tradingAccounts.tierId],
    references: [accountTiers.id],
  }),
  trades: many(trades),
  dailySnapshots: many(dailySnapshots),
  payoutRequests: many(payoutRequests),
  equitySnapshots: many(accountEquitySnapshots),
  brokerConnections: many(externalBrokerConnections),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  tradingAccount: one(tradingAccounts, {
    fields: [trades.tradingAccountId],
    references: [tradingAccounts.id],
  }),
}));

export const dailySnapshotsRelations = relations(dailySnapshots, ({ one }) => ({
  tradingAccount: one(tradingAccounts, {
    fields: [dailySnapshots.tradingAccountId],
    references: [tradingAccounts.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  tradingAccount: one(tradingAccounts, {
    fields: [transactions.tradingAccountId],
    references: [tradingAccounts.id],
  }),
}));

export const payoutRequestsRelations = relations(payoutRequests, ({ one }) => ({
  user: one(users, {
    fields: [payoutRequests.userId],
    references: [users.id],
  }),
  tradingAccount: one(tradingAccounts, {
    fields: [payoutRequests.tradingAccountId],
    references: [tradingAccounts.id],
  }),
  reviewer: one(users, {
    fields: [payoutRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const accountEquitySnapshotsRelations = relations(accountEquitySnapshots, ({ one }) => ({
  tradingAccount: one(tradingAccounts, {
    fields: [accountEquitySnapshots.tradingAccountId],
    references: [tradingAccounts.id],
  }),
}));

export const externalBrokerConnectionsRelations = relations(externalBrokerConnections, ({ one }) => ({
  user: one(users, {
    fields: [externalBrokerConnections.userId],
    references: [users.id],
  }),
  tradingAccount: one(tradingAccounts, {
    fields: [externalBrokerConnections.tradingAccountId],
    references: [tradingAccounts.id],
  }),
}));
