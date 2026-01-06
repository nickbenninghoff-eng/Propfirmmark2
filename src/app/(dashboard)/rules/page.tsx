import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Evaluation Rules",
  description: "Trading account evaluation rules and requirements",
};

export default function RulesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evaluation Rules</h1>
        <p className="text-muted-foreground">
          Understand the requirements to pass each evaluation phase
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Overview</CardTitle>
          <CardDescription>
            Our evaluation process consists of two phases before you receive a funded account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Phase 1: Evaluation</h3>
              <p className="text-sm text-muted-foreground">
                Demonstrate your ability to generate profits while managing risk
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Phase 2: Verification</h3>
              <p className="text-sm text-muted-foreground">
                Confirm your trading consistency and discipline
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Targets</CardTitle>
          <CardDescription>Required profit goals for each phase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Phase 1: 8% Profit Target</p>
                <p className="text-sm text-muted-foreground">
                  You must achieve an 8% profit on your initial balance to advance to Phase 2
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Phase 2: 5% Profit Target</p>
                <p className="text-sm text-muted-foreground">
                  Achieve a 5% profit to qualify for a funded account
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drawdown Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Maximum Drawdown</CardTitle>
          <CardDescription>Risk management limits you must follow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium">Daily Loss Limit: 5%</p>
                <p className="text-sm text-muted-foreground">
                  Your daily loss cannot exceed 5% of your starting balance for the day. If you breach this limit, your account will be terminated.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium">Maximum Drawdown: 10%</p>
                <p className="text-sm text-muted-foreground">
                  Your account balance cannot drop more than 10% from the initial balance or highest balance achieved (high-water mark). Breaching this rule results in account termination.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Requirements</CardTitle>
          <CardDescription>Additional rules you must follow during evaluation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Minimum Trading Days</p>
                <p className="text-sm text-muted-foreground">
                  You must trade on at least 5 separate days in each phase. A trading day is any day where you open at least one position.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">No Time Limit</p>
                <p className="text-sm text-muted-foreground">
                  Take as long as you need to reach your profit target. There is no time limit on evaluation phases.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium">No Weekend Holding</p>
                <p className="text-sm text-muted-foreground">
                  All positions must be closed before the weekend. Holding positions over the weekend is not permitted during evaluation.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium">No News Trading</p>
                <p className="text-sm text-muted-foreground">
                  Trading during major news events (within 2 minutes before and 5 minutes after) is prohibited.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funded Account */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-green-900">Funded Account</CardTitle>
          <CardDescription className="text-green-700">
            What happens after you pass both evaluation phases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Profit Split</p>
                <p className="text-sm text-green-700">
                  Keep 80% of all profits you generate with your funded account
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Bi-Weekly Payouts</p>
                <p className="text-sm text-green-700">
                  Request payouts every two weeks once you're funded
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Scale Up</p>
                <p className="text-sm text-green-700">
                  Increase your account size by up to 25% for every 10% profit milestone
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
