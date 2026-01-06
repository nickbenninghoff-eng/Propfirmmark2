"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";

export function AuditLogFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [action, setAction] = useState(searchParams.get("action") || "");
  const [entityType, setEntityType] = useState(searchParams.get("entityType") || "all");

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (entityType && entityType !== "all") params.set("entityType", entityType);
    router.push(`?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setAction("");
    setEntityType("all");
    router.push("/admin/audit-logs");
  };

  const hasFilters = action || (entityType && entityType !== "all");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="action">Action</Label>
            <Input
              id="action"
              placeholder="e.g., update_tier, suspend_account"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entityType">Entity Type</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="trading_account">Trading Account</SelectItem>
                <SelectItem value="account_tier">Account Tier</SelectItem>
                <SelectItem value="payout_request">Payout Request</SelectItem>
                <SelectItem value="notification">Notification</SelectItem>
                <SelectItem value="site_settings">Site Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleApplyFilters} className="w-full">
              Apply Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
