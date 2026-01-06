"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { bulkNotifyUsers, bulkUpdateAccountStatus } from "@/server/actions/admin";

export function BulkNotifications() {
  const [loading, setLoading] = useState(false);
  const [userIds, setUserIds] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ids = userIds.split(/[,\n]/).map((id) => id.trim()).filter(Boolean);

      if (ids.length === 0) {
        throw new Error("Please enter at least one user ID");
      }

      await bulkNotifyUsers(ids, title, message);
      toast.success(`Notifications sent to ${ids.length} users`);

      // Reset form
      setUserIds("");
      setTitle("");
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send notifications");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="userIds">User IDs</Label>
        <Textarea
          id="userIds"
          placeholder="Enter user IDs (one per line or comma-separated)&#10;e.g., uuid1, uuid2, uuid3"
          value={userIds}
          onChange={(e) => setUserIds(e.target.value)}
          rows={5}
          required
        />
        <p className="text-sm text-muted-foreground">
          Enter user IDs separated by commas or new lines
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notif-title">Notification Title</Label>
        <Input
          id="notif-title"
          placeholder="e.g., Platform Maintenance"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notif-message">Message</Label>
        <Textarea
          id="notif-message"
          placeholder="Enter your notification message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
        />
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" disabled={loading || !userIds || !title || !message}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Notifications
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Bulk Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send notifications to {userIds.split(/[,\n]/).filter(id => id.trim()).length} users.
              This action will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit({ preventDefault: () => {} } as any)}>
              Send Notifications
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

export function BulkAccountActions() {
  const [loading, setLoading] = useState(false);
  const [accountIds, setAccountIds] = useState("");
  const [action, setAction] = useState<"status" | "">("");
  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ids = accountIds.split(/[,\n]/).map((id) => id.trim()).filter(Boolean);

      if (ids.length === 0) {
        throw new Error("Please enter at least one account ID");
      }

      if (action === "status") {
        await bulkUpdateAccountStatus(ids, newStatus, reason);
        toast.success(`Updated status for ${ids.length} accounts`);
      }

      // Reset form
      setAccountIds("");
      setAction("");
      setNewStatus("");
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to perform bulk action");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="accountIds">Account IDs</Label>
        <Textarea
          id="accountIds"
          placeholder="Enter account IDs (one per line or comma-separated)&#10;e.g., uuid1, uuid2, uuid3"
          value={accountIds}
          onChange={(e) => setAccountIds(e.target.value)}
          rows={5}
          required
        />
        <p className="text-sm text-muted-foreground">
          Enter account IDs separated by commas or new lines
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="action-type">Action Type</Label>
        <Select value={action} onValueChange={(val) => setAction(val as "status")}>
          <SelectTrigger>
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Change Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {action === "status" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="new-status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="funded">Funded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-reason">Reason (optional)</Label>
            <Textarea
              id="bulk-reason"
              placeholder="Enter reason for status change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            disabled={loading || !accountIds || !action || (action === "status" && !newStatus)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Execute Bulk Action
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Execute Bulk Action?</AlertDialogTitle>
            <AlertDialogDescription>
              This will affect {accountIds.split(/[,\n]/).filter(id => id.trim()).length} accounts.
              This action will be logged in the audit trail and may not be easily reversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSubmit({ preventDefault: () => {} } as any)}
              className="bg-red-500 hover:bg-red-600"
            >
              Execute Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
