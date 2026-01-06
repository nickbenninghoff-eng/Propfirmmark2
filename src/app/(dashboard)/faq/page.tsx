import { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about trading accounts and evaluation",
};

export default function FAQPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">
          Find answers to common questions about our platform and evaluation process
        </p>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Questions about setting up your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I connect my trading platform?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>
                  After purchasing an evaluation account, you'll receive credentials to connect to our supported trading platforms:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Check your email for your account credentials and login details</li>
                  <li>Download MetaTrader 4 or MetaTrader 5 (MT4/MT5) from our partner broker</li>
                  <li>Open the platform and select "File" → "Login to Trade Account"</li>
                  <li>Enter your account number, password, and select the server provided in your email</li>
                  <li>Click "Login" and you're ready to start trading!</li>
                </ol>
                <p className="text-sm pt-2">
                  <strong>Note:</strong> Connection credentials are typically sent within 24 hours of account purchase. If you haven't received them, please contact support.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>What trading platforms are supported?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">We currently support the following trading platforms:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>MetaTrader 4 (MT4)</li>
                  <li>MetaTrader 5 (MT5)</li>
                  <li>cTrader (coming soon)</li>
                </ul>
                <p className="mt-3">
                  All platforms are provided through our partner brokers with live market data and execution.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>How long does it take to get started?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>
                  After purchasing your evaluation account, you can typically start trading within 24 hours.
                  You'll receive an email confirmation immediately, and your trading platform credentials will
                  be sent to you within 1 business day.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Evaluation Process */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Process</CardTitle>
          <CardDescription>Questions about the evaluation phases</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-4">
              <AccordionTrigger>How long does the evaluation take?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>
                  There is no time limit on our evaluation phases. You can take as long as you need to hit
                  your profit targets. However, you must trade on at least 5 separate days in each phase.
                  Most traders complete Phase 1 in 2-4 weeks and Phase 2 in 1-3 weeks.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>What happens if I fail the evaluation?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">
                  If you breach the maximum drawdown rules (5% daily loss limit or 10% total drawdown),
                  your evaluation account will be terminated. However, you have options:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                  <li>Purchase a new evaluation account at any time</li>
                  <li>Take advantage of retry discounts (check your dashboard for offers)</li>
                  <li>Review your trades and develop a better risk management strategy</li>
                </ul>
                <p className="mt-3">
                  Remember, the evaluation is designed to ensure you can trade profitably while managing risk properly.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger>Can I have multiple evaluation accounts?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>
                  Yes! You can purchase and manage multiple evaluation accounts simultaneously.
                  Many traders choose to run multiple accounts with different strategies or to increase
                  their potential earning capacity once funded.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger>What instruments can I trade?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">You can trade a wide variety of instruments including:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Forex pairs (Major, Minor, and Exotic pairs)</li>
                  <li>Commodities (Gold, Silver, Oil, etc.)</li>
                  <li>Indices (US30, NAS100, SPX500, etc.)</li>
                  <li>Cryptocurrencies (Bitcoin, Ethereum, etc.)</li>
                </ul>
                <p className="mt-3">
                  The specific instruments available depend on your chosen trading platform and account tier.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Funded Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Funded Accounts</CardTitle>
          <CardDescription>Questions about getting funded and payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-8">
              <AccordionTrigger>How do payouts work?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">
                  Once you have a funded account, you can request payouts bi-weekly (every 14 days). Here's how it works:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
                  <li>Navigate to the Payouts section in your dashboard</li>
                  <li>Request a payout for your available profits (80% profit split)</li>
                  <li>We process payouts within 1-3 business days</li>
                  <li>Funds are sent via your chosen payment method (bank transfer, crypto, etc.)</li>
                </ol>
                <p className="mt-3">
                  There is no minimum payout amount, and you keep 80% of all profits you generate.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9">
              <AccordionTrigger>Can I scale up my funded account?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>
                  Yes! For every 10% profit you achieve on your funded account, you can increase your
                  account size by up to 25%. For example, if you have a $100,000 funded account and make
                  $10,000 in profit, you can scale up to a $125,000 account. This allows you to grow
                  your earning potential as you demonstrate consistent profitability.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-10">
              <AccordionTrigger>What are the rules for funded accounts?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">
                  Funded accounts have more relaxed rules compared to evaluation accounts:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Same maximum drawdown limits (5% daily, 10% total)</li>
                  <li>No minimum trading days requirement</li>
                  <li>Weekend holding is allowed</li>
                  <li>News trading is permitted</li>
                  <li>No profit targets - trade at your own pace</li>
                </ul>
                <p className="mt-3">
                  The key is to continue managing risk properly to maintain your funded status.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Technical Support */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Support</CardTitle>
          <CardDescription>Having issues? We're here to help</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-11">
              <AccordionTrigger>How do I contact support?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">You can reach our support team through multiple channels:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Email: support@yourpropfirm.com</li>
                  <li>Live chat in your dashboard (available 24/5)</li>
                  <li>Discord community server</li>
                </ul>
                <p className="mt-3">
                  Our support team typically responds within 2-4 hours during business days.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-12">
              <AccordionTrigger>My trading platform won't connect. What should I do?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="mb-2">If you're having trouble connecting to your trading platform, try these steps:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Double-check your account number, password, and server address</li>
                  <li>Ensure you have a stable internet connection</li>
                  <li>Try restarting the trading platform</li>
                  <li>Disable any VPN or firewall that might be blocking the connection</li>
                  <li>Make sure you're using the correct platform version (MT4 vs MT5)</li>
                </ol>
                <p className="mt-3">
                  If issues persist, contact our support team with your account number for assistance.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
