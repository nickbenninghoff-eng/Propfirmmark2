CREATE TYPE "public"."account_phase" AS ENUM('evaluation_1', 'evaluation_2', 'funded');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('pending_payment', 'pending_activation', 'active', 'passed', 'funded', 'failed', 'suspended', 'expired');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('prop_firm', 'external_journal');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('stock', 'option', 'futures', 'forex', 'crypto');--> statement-breakpoint
CREATE TYPE "public"."broker_connection_type" AS ENUM('mt4', 'mt5', 'manual');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('pending', 'connected', 'disconnected', 'error');--> statement-breakpoint
CREATE TYPE "public"."drawdown_type" AS ENUM('static', 'trailing_eod', 'trailing_realtime');--> statement-breakpoint
CREATE TYPE "public"."option_type" AS ENUM('call', 'put');--> statement-breakpoint
CREATE TYPE "public"."order_side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'submitted', 'working', 'partial', 'filled', 'cancelled', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('market', 'limit', 'stop', 'stop_limit', 'trailing_stop');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'approved', 'processing', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."time_in_force" AS ENUM('day', 'gtc', 'ioc', 'fok');--> statement-breakpoint
CREATE TYPE "public"."trade_direction" AS ENUM('long', 'short');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('account_purchase', 'account_reset', 'subscription', 'payout', 'refund');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'super_admin');--> statement-breakpoint
CREATE TABLE "account_equity_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"equity" numeric(12, 2) NOT NULL,
	"unrealized_pnl" numeric(12, 2) DEFAULT '0',
	"snapshot_type" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"account_size" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"reset_price" numeric(10, 2) NOT NULL,
	"stripe_price_id" varchar(255),
	"stripe_reset_price_id" varchar(255),
	"profit_target" numeric(10, 2) NOT NULL,
	"profit_target_percent" numeric(5, 2) NOT NULL,
	"max_drawdown" numeric(10, 2) NOT NULL,
	"max_drawdown_percent" numeric(5, 2) NOT NULL,
	"drawdown_type" "drawdown_type" DEFAULT 'trailing_eod' NOT NULL,
	"daily_loss_limit" numeric(10, 2),
	"daily_loss_limit_percent" numeric(5, 2),
	"min_trading_days" integer DEFAULT 0 NOT NULL,
	"max_trading_days" integer,
	"allow_weekend_holding" boolean DEFAULT false NOT NULL,
	"allow_news_trading" boolean DEFAULT true NOT NULL,
	"max_contracts_per_trade" integer,
	"max_open_contracts" integer,
	"profit_split" numeric(5, 2) DEFAULT '80.00' NOT NULL,
	"min_payout_amount" numeric(10, 2) DEFAULT '100.00',
	"payout_frequency" varchar(50) DEFAULT 'weekly',
	"has_second_phase" boolean DEFAULT false NOT NULL,
	"phase2_profit_target" numeric(10, 2),
	"phase2_profit_target_percent" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) DEFAULT 'info' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"previous_data" jsonb,
	"new_data" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"snapshot_date" timestamp with time zone NOT NULL,
	"opening_balance" numeric(12, 2) NOT NULL,
	"closing_balance" numeric(12, 2) NOT NULL,
	"high_balance" numeric(12, 2) NOT NULL,
	"low_balance" numeric(12, 2) NOT NULL,
	"daily_pnl" numeric(12, 2) NOT NULL,
	"trades_count" integer DEFAULT 0 NOT NULL,
	"winners_count" integer DEFAULT 0 NOT NULL,
	"losers_count" integer DEFAULT 0 NOT NULL,
	"max_drawdown_today" numeric(12, 2),
	"daily_loss_limit_hit" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"execution_id" varchar(100) NOT NULL,
	"external_execution_id" varchar(100),
	"symbol" varchar(20) NOT NULL,
	"side" "order_side" NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(12, 6) NOT NULL,
	"commission" numeric(10, 2) DEFAULT '0',
	"fees" numeric(10, 2) DEFAULT '0',
	"is_simulated" boolean DEFAULT true NOT NULL,
	"simulated_slippage" numeric(12, 6),
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "executions_execution_id_unique" UNIQUE("execution_id")
);
--> statement-breakpoint
CREATE TABLE "external_broker_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"connection_type" "broker_connection_type" NOT NULL,
	"broker_name" varchar(100),
	"account_number" varchar(100),
	"api_credentials" jsonb,
	"status" "connection_status" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_sync_error" text,
	"auto_sync" boolean DEFAULT true NOT NULL,
	"sync_frequency" integer DEFAULT 300,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_rule_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"passed" boolean NOT NULL,
	"check_type" varchar(50) NOT NULL,
	"check_details" jsonb NOT NULL,
	"failure_reason" text,
	"account_snapshot" jsonb NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"client_order_id" varchar(100) NOT NULL,
	"external_order_id" varchar(100),
	"symbol" varchar(20) NOT NULL,
	"order_type" "order_type" NOT NULL,
	"side" "order_side" NOT NULL,
	"quantity" integer NOT NULL,
	"limit_price" numeric(12, 6),
	"stop_price" numeric(12, 6),
	"trail_amount" numeric(12, 6),
	"trail_percent" numeric(5, 2),
	"filled_quantity" integer DEFAULT 0 NOT NULL,
	"remaining_quantity" integer NOT NULL,
	"avg_fill_price" numeric(12, 6),
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"time_in_force" time_in_force DEFAULT 'day' NOT NULL,
	"pre_trade_check_passed" boolean DEFAULT false NOT NULL,
	"pre_trade_check_details" jsonb,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"first_fill_at" timestamp with time zone,
	"last_fill_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"placed_from_ip" varchar(45),
	"notes" text,
	CONSTRAINT "orders_client_order_id_unique" UNIQUE("client_order_id")
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"requested_amount" numeric(12, 2) NOT NULL,
	"approved_amount" numeric(12, 2),
	"gross_profit" numeric(12, 2) NOT NULL,
	"profit_split_percent" numeric(5, 2) NOT NULL,
	"trader_share" numeric(12, 2) NOT NULL,
	"firm_share" numeric(12, 2) NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(50),
	"payment_details" jsonb,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"rejection_reason" text,
	"payment_reference" varchar(255),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"avg_entry_price" numeric(12, 6) NOT NULL,
	"realized_pnl" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unrealized_pnl" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_pnl" numeric(12, 2) DEFAULT '0' NOT NULL,
	"current_price" numeric(12, 6),
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"total_bought" integer DEFAULT 0 NOT NULL,
	"total_sold" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_code_uses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_code_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_id" uuid,
	"discount_applied" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"discount_type" varchar(20) NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"applicable_tier_ids" jsonb,
	"min_purchase_amount" numeric(10, 2),
	"max_uses" integer,
	"max_uses_per_user" integer DEFAULT 1,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"rithmic_trade_id" varchar(100),
	"rithmic_order_id" varchar(100),
	"symbol" varchar(20) NOT NULL,
	"exchange" varchar(20) NOT NULL,
	"direction" "trade_direction" NOT NULL,
	"quantity" integer NOT NULL,
	"entry_price" numeric(12, 6) NOT NULL,
	"exit_price" numeric(12, 6),
	"commission" numeric(10, 2) DEFAULT '0',
	"fees" numeric(10, 2) DEFAULT '0',
	"pnl" numeric(12, 2),
	"net_pnl" numeric(12, 2),
	"is_open" boolean DEFAULT true NOT NULL,
	"entry_time" timestamp with time zone NOT NULL,
	"exit_time" timestamp with time zone,
	"asset_type" "asset_type" DEFAULT 'futures' NOT NULL,
	"option_type" "option_type",
	"strike_price" numeric(12, 2),
	"expiration_date" timestamp with time zone,
	"underlying_symbol" varchar(20),
	"currency_pair" varchar(10),
	"pip_value" numeric(12, 6),
	"contract_month" varchar(10),
	"contract_size" integer,
	"crypto_pair" varchar(20),
	"exchange_name" varchar(50),
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"setup_type" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"account_number" varchar(50),
	"rithmic_account_id" varchar(100),
	"rithmic_username" varchar(100),
	"account_type" "account_type" DEFAULT 'prop_firm' NOT NULL,
	"status" "account_status" DEFAULT 'pending_payment' NOT NULL,
	"phase" "account_phase" DEFAULT 'evaluation_1' NOT NULL,
	"initial_balance" numeric(12, 2) NOT NULL,
	"current_balance" numeric(12, 2) NOT NULL,
	"high_water_mark" numeric(12, 2) NOT NULL,
	"total_profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_loss" numeric(12, 2) DEFAULT '0' NOT NULL,
	"current_drawdown" numeric(12, 2) DEFAULT '0' NOT NULL,
	"max_drawdown_reached" numeric(12, 2) DEFAULT '0' NOT NULL,
	"drawdown_threshold" numeric(12, 2) NOT NULL,
	"total_trades" integer DEFAULT 0 NOT NULL,
	"winning_trades" integer DEFAULT 0 NOT NULL,
	"losing_trades" integer DEFAULT 0 NOT NULL,
	"trading_days_count" integer DEFAULT 0 NOT NULL,
	"profit_target_reached" boolean DEFAULT false NOT NULL,
	"profit_target_reached_at" timestamp with time zone,
	"min_trading_days_reached" boolean DEFAULT false NOT NULL,
	"failure_reason" varchar(255),
	"failed_at" timestamp with time zone,
	"reset_count" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp with time zone,
	"funded_at" timestamp with time zone,
	"total_payouts" numeric(12, 2) DEFAULT '0',
	"activated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_simulated" boolean DEFAULT true NOT NULL,
	"available_margin" numeric(12, 2) DEFAULT '0' NOT NULL,
	"used_margin" numeric(12, 2) DEFAULT '0' NOT NULL,
	"margin_utilization" numeric(5, 2) DEFAULT '0' NOT NULL,
	"open_positions_count" integer DEFAULT 0 NOT NULL,
	"open_orders_count" integer DEFAULT 0 NOT NULL,
	"daily_pnl" numeric(12, 2) DEFAULT '0' NOT NULL,
	"daily_loss_limit_hit" boolean DEFAULT false NOT NULL,
	"last_daily_reset_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trading_accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trading_account_id" uuid,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_invoice_id" varchar(255),
	"description" text,
	"metadata" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(20),
	"avatar_url" text,
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(2),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"stripe_customer_id" varchar(255),
	"kyc_verified" boolean DEFAULT false NOT NULL,
	"kyc_verified_at" timestamp with time zone,
	"timezone" varchar(50) DEFAULT 'America/New_York',
	"notification_preferences" jsonb DEFAULT '{"email":true,"sms":false,"accountUpdates":true,"marketingEmails":false}'::jsonb,
	"referral_code" varchar(20),
	"referred_by" uuid,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account_equity_snapshots" ADD CONSTRAINT "account_equity_snapshots_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD CONSTRAINT "daily_snapshots_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_broker_connections" ADD CONSTRAINT "external_broker_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_broker_connections" ADD CONSTRAINT "external_broker_connections_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_rule_checks" ADD CONSTRAINT "order_rule_checks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_rule_checks" ADD CONSTRAINT "order_rule_checks_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_uses" ADD CONSTRAINT "promo_code_uses_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_uses" ADD CONSTRAINT "promo_code_uses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_uses" ADD CONSTRAINT "promo_code_uses_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_tier_id_account_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."account_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_trading_account_id_trading_accounts_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equity_snapshots_account_time_idx" ON "account_equity_snapshots" USING btree ("trading_account_id","timestamp");--> statement-breakpoint
CREATE INDEX "account_tiers_active_sort_idx" ON "account_tiers" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "daily_snapshots_account_date_idx" ON "daily_snapshots" USING btree ("trading_account_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "executions_order_idx" ON "executions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "executions_account_idx" ON "executions" USING btree ("trading_account_id");--> statement-breakpoint
CREATE INDEX "executions_executed_at_idx" ON "executions" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "broker_connections_user_idx" ON "external_broker_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "broker_connections_account_idx" ON "external_broker_connections" USING btree ("trading_account_id");--> statement-breakpoint
CREATE INDEX "rule_checks_order_idx" ON "order_rule_checks" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "rule_checks_account_idx" ON "order_rule_checks" USING btree ("trading_account_id");--> statement-breakpoint
CREATE INDEX "orders_account_idx" ON "orders" USING btree ("trading_account_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_symbol_idx" ON "orders" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payout_requests_user_idx" ON "payout_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payout_requests_status_idx" ON "payout_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "positions_account_idx" ON "positions" USING btree ("trading_account_id");--> statement-breakpoint
CREATE INDEX "positions_symbol_idx" ON "positions" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "positions_is_open_idx" ON "positions" USING btree ("is_open");--> statement-breakpoint
CREATE INDEX "positions_account_symbol_unique_idx" ON "positions" USING btree ("trading_account_id","symbol");--> statement-breakpoint
CREATE INDEX "promo_code_uses_promo_user_idx" ON "promo_code_uses" USING btree ("promo_code_id","user_id");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "trades_account_idx" ON "trades" USING btree ("trading_account_id");--> statement-breakpoint
CREATE INDEX "trades_symbol_idx" ON "trades" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "trades_entry_time_idx" ON "trades" USING btree ("entry_time");--> statement-breakpoint
CREATE INDEX "trades_asset_type_idx" ON "trades" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "trades_underlying_symbol_idx" ON "trades" USING btree ("underlying_symbol");--> statement-breakpoint
CREATE INDEX "trading_accounts_user_idx" ON "trading_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trading_accounts_status_idx" ON "trading_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trading_accounts_rithmic_idx" ON "trading_accounts" USING btree ("rithmic_account_id");--> statement-breakpoint
CREATE INDEX "transactions_user_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_stripe_payment_idx" ON "transactions" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_stripe_customer_idx" ON "users" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "users_referral_code_idx" ON "users" USING btree ("referral_code");