/**
 * Tradovate API Client
 * Documentation: https://api.tradovate.com/
 */

export interface TradovateConfig {
  username: string;
  password: string;
  deviceId: string;
  environment: "demo" | "live";
}

export interface TradovateAuthResponse {
  accessToken: string;
  expirationTime: string;
  userId: number;
  userStatus: string;
}

export interface TradovateBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TradovatePosition {
  id: number;
  accountId: number;
  contractId: number;
  timestamp: string;
  netPos: number;
  netPrice: number;
  bought: number;
  sold: number;
}

export interface TradovateAccount {
  id: number;
  name: string;
  userId: number;
  accountType: string;
  active: boolean;
  balance: number;
  cashBalance: number;
  realizedPnL: number;
  unrealizedPnL: number;
}

class TradovateClient {
  private config: TradovateConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private baseUrl: string;

  constructor(config: TradovateConfig) {
    this.config = config;
    this.baseUrl = config.environment === "demo"
      ? "https://demo.tradovateapi.com/v1"
      : "https://live.tradovateapi.com/v1";
  }

  /**
   * Authenticate with Tradovate API
   */
  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/accesstokenrequest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: this.config.username,
          password: this.config.password,
          appId: "PropFirm",
          appVersion: "1.0",
          deviceId: this.config.deviceId,
          cid: 0,
          sec: "",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Tradovate authentication failed:", error);
        return false;
      }

      const data: TradovateAuthResponse = await response.json();
      this.accessToken = data.accessToken;
      this.tokenExpiry = new Date(data.expirationTime);

      console.log("Successfully authenticated with Tradovate");
      return true;
    } catch (error) {
      console.error("Error authenticating with Tradovate:", error);
      return false;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<boolean> {
    // Check if token exists and is not expired
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return true;
    }

    // Token expired or doesn't exist, authenticate
    return await this.authenticate();
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${this.accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tradovate API error: ${error}`);
    }

    return await response.json();
  }

  /**
   * Get user accounts
   */
  async getAccounts(): Promise<TradovateAccount[]> {
    try {
      // Try multiple endpoints to find accounts
      try {
        const accounts = await this.request<TradovateAccount[]>("/account/list");
        if (accounts && accounts.length > 0) return accounts;
      } catch (e) {
        console.log("account/list failed, trying deps...");
      }

      // Try the dependencies endpoint
      try {
        const deps = await this.request<any>("/account/deps");
        if (deps && deps.accounts && deps.accounts.length > 0) {
          return deps.accounts;
        }
      } catch (e) {
        console.log("account/deps failed, trying find...");
      }

      // Try finding by name if we have it
      if (process.env.TRADOVATE_DEMO_ACCOUNT) {
        try {
          const account = await this.request<TradovateAccount>(
            `/account/find?name=${process.env.TRADOVATE_DEMO_ACCOUNT}`
          );
          if (account) return [account];
        } catch (e) {
          console.log("account/find failed");
        }
      }

      return [];
    } catch (error) {
      console.error("Error fetching accounts:", error);
      return [];
    }
  }

  /**
   * Get historical bars/candles
   */
  async getHistoricalBars(
    symbol: string,
    timeframe: string = "1Min",
    barsBack: number = 100
  ): Promise<TradovateBar[]> {
    try {
      // First, find the contract by symbol
      const contracts = await this.request<any[]>(`/contract/find?name=${symbol}`);

      if (!contracts || contracts.length === 0) {
        console.error(`Contract not found for symbol: ${symbol}`);
        return [];
      }

      const contractId = contracts[0].id;

      // Get historical bars
      const bars = await this.request<any>(
        `/md/getcharthistory?symbol=${symbol}&chartDescription=${timeframe}&barsBack=${barsBack}`
      );

      if (!bars || !bars.bars) {
        return [];
      }

      // Convert to our format
      return bars.bars.map((bar: any) => ({
        timestamp: new Date(bar.timestamp).toISOString(),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }));
    } catch (error) {
      console.error("Error fetching historical bars:", error);
      return [];
    }
  }

  /**
   * Get current positions
   */
  async getPositions(accountId: number): Promise<TradovatePosition[]> {
    try {
      const positions = await this.request<TradovatePosition[]>(
        `/position/list?accountId=${accountId}`
      );
      return positions || [];
    } catch (error) {
      console.error("Error fetching positions:", error);
      return [];
    }
  }

  /**
   * Get account details
   */
  async getAccountById(accountId: number): Promise<TradovateAccount | null> {
    try {
      const account = await this.request<TradovateAccount>(`/account/item?id=${accountId}`);
      return account;
    } catch (error) {
      console.error("Error fetching account:", error);
      return null;
    }
  }

  /**
   * Search for contracts/symbols
   */
  async searchContracts(query: string): Promise<any[]> {
    try {
      const contracts = await this.request<any[]>(`/contract/suggest?t=${query}&l=10`);
      return contracts || [];
    } catch (error) {
      console.error("Error searching contracts:", error);
      return [];
    }
  }
}

// Create singleton instance with demo credentials
export const tradovateClient = new TradovateClient({
  username: process.env.TRADOVATE_DEMO_USERNAME || "realreturnsacedemy",
  password: process.env.TRADOVATE_DEMO_PASSWORD || "Heirloom1!?",
  deviceId: process.env.TRADOVATE_DEVICE_ID || "propfirm-dev-" + Math.random().toString(36).substring(7),
  environment: "demo",
});

export default tradovateClient;
