// User types
export type UserRole = "user" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  avatarUrl: string | null;
  kycVerified: boolean;
  createdAt: Date;
}

// Account status types
export type AccountStatus =
  | "pending_payment"
  | "pending_activation"
  | "active"
  | "passed"
  | "funded"
  | "failed"
  | "suspended"
  | "expired";

export type AccountPhase = "evaluation_1" | "evaluation_2" | "funded";

export type DrawdownType = "static" | "trailing_eod" | "trailing_realtime";

// Account tier interface
export interface AccountTier {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  accountSize: number;
  price: number;
  resetPrice: number;
  profitTarget: number;
  profitTargetPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  drawdownType: DrawdownType;
  dailyLossLimit: number | null;
  dailyLossLimitPercent: number | null;
  minTradingDays: number;
  maxTradingDays: number | null;
  profitSplit: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

// Trading account interface
export interface TradingAccount {
  id: string;
  userId: string;
  tierId: string;
  accountNumber: string | null;
  status: AccountStatus;
  phase: AccountPhase;
  initialBalance: number;
  currentBalance: number;
  highWaterMark: number;
  totalProfit: number;
  totalLoss: number;
  currentDrawdown: number;
  maxDrawdownReached: number;
  drawdownThreshold: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  tradingDaysCount: number;
  profitTargetReached: boolean;
  minTradingDaysReached: boolean;
  failureReason: string | null;
  resetCount: number;
  activatedAt: Date | null;
  createdAt: Date;
  tier?: AccountTier;
}

// Trade interface
export interface Trade {
  id: string;
  tradingAccountId: string;
  symbol: string;
  exchange: string;
  direction: "long" | "short";
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  netPnl: number | null;
  isOpen: boolean;
  entryTime: Date;
  exitTime: Date | null;
}

// Transaction types
export type TransactionType =
  | "account_purchase"
  | "account_reset"
  | "subscription"
  | "payout"
  | "refund";

export type TransactionStatus = "pending" | "completed" | "failed" | "refunded";

export interface Transaction {
  id: string;
  userId: string;
  tradingAccountId: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  description: string | null;
  createdAt: Date;
}

// Payout types
export type PayoutStatus =
  | "pending"
  | "approved"
  | "processing"
  | "completed"
  | "rejected";

export interface PayoutRequest {
  id: string;
  userId: string;
  tradingAccountId: string;
  requestedAmount: number;
  approvedAmount: number | null;
  grossProfit: number;
  profitSplitPercent: number;
  traderShare: number;
  firmShare: number;
  status: PayoutStatus;
  paymentMethod: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

// Analytics types
export interface DashboardStats {
  totalRevenue: number;
  activeAccounts: number;
  totalUsers: number;
  passRate: number;
  pendingPayouts: number;
  recentTransactions: Transaction[];
}

export interface UserDashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  totalProfit: number;
  totalPayouts: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
