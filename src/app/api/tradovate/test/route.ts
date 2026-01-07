import { NextResponse } from "next/server";
import { tradovateClient } from "@/lib/tradovate/client";

export async function GET() {
  try {
    console.log("Testing Tradovate connection...");

    // Test authentication
    const authenticated = await tradovateClient.authenticate();
    if (!authenticated) {
      return NextResponse.json(
        { error: "Failed to authenticate with Tradovate" },
        { status: 401 }
      );
    }

    // Get accounts
    const accounts = await tradovateClient.getAccounts();
    console.log("All Accounts:", accounts);

    // Try to find the specific demo account
    let demoAccount = null;
    if (accounts.length > 0) {
      demoAccount = accounts.find(acc => acc.name === "DEMO632827") || accounts[0];
      console.log("Using account:", demoAccount);
    }

    // Search for active ES contract
    const esContracts = await tradovateClient.searchContracts("ES");
    console.log("ES Contracts found:", esContracts.slice(0, 3));

    // Get some sample market data for the first ES contract found
    let bars: any[] = [];
    if (esContracts && esContracts.length > 0) {
      const firstContract = esContracts[0];
      console.log("Using contract:", firstContract.name);
      bars = await tradovateClient.getHistoricalBars(firstContract.name, "1Min", 50);
      console.log("Sample bars:", bars.slice(0, 5));
    }

    return NextResponse.json({
      success: true,
      message: "Successfully connected to Tradovate Demo API",
      data: {
        authenticated: true,
        accountsCount: accounts.length,
        accounts: accounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          balance: acc.balance,
          realizedPnL: acc.realizedPnL,
        })),
        demoAccount: demoAccount,
        availableContracts: esContracts.slice(0, 5).map(c => c.name),
        sampleBars: bars.slice(0, 5),
        barsCount: bars.length,
      },
    });
  } catch (error) {
    console.error("Tradovate test error:", error);
    return NextResponse.json(
      {
        error: "Failed to connect to Tradovate",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
