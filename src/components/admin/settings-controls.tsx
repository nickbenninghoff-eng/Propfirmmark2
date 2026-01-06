"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, Power, Shield, Bell } from "lucide-react";
import { toast } from "sonner";
import {
  setTradingEnabled,
  setMarketsClosed,
  setMaintenanceMode,
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
} from "@/server/actions/admin";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface EmergencyControlsProps {
  initialSettings: Record<string, unknown>;
}

export function EmergencyControls({ initialSettings }: EmergencyControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const tradingEnabled = (initialSettings.trading_enabled as boolean) ?? true;
  const marketsClosed = initialSettings.markets_closed as { closed: boolean; reason?: string } | undefined;
  const maintenanceMode = initialSettings.maintenance_mode as { enabled: boolean; message?: string } | undefined;

  const handleTradingToggle = async () => {
    setLoading("trading");
    try {
      await setTradingEnabled(!tradingEnabled);
      toast.success(tradingEnabled ? "Trading disabled" : "Trading enabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update setting");
    } finally {
      setLoading(null);
    }
  };

  const handleMarketsClose = async (close: boolean, reason?: string) => {
    setLoading("markets");
    try {
      await setMarketsClosed(close, reason);
      toast.success(close ? "Markets closed" : "Markets reopened");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update setting");
    } finally {
      setLoading(null);
    }
  };

  const handleMaintenanceToggle = async (enable: boolean, message?: string) => {
    setLoading("maintenance");
    try {
      await setMaintenanceMode(enable, message);
      toast.success(enable ? "Maintenance mode enabled" : "Maintenance mode disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update setting");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3" id="emergency">
      {/* Trading Control */}
      <Card className={!tradingEnabled ? "border-red-500/50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Trading Status
          </CardTitle>
          <CardDescription>
            Enable or disable all trading platform-wide
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{tradingEnabled ? "Trading Enabled" : "Trading Disabled"}</p>
              <p className="text-sm text-muted-foreground">
                {tradingEnabled ? "Users can place trades" : "All trading is paused"}
              </p>
            </div>
            <Switch
              checked={tradingEnabled}
              onCheckedChange={handleTradingToggle}
              disabled={loading === "trading"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Markets Control */}
      <Card className={marketsClosed?.closed ? "border-orange-500/50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Markets Status
          </CardTitle>
          <CardDescription>
            Emergency market closure control
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{marketsClosed?.closed ? "Markets Closed" : "Markets Open"}</p>
              <p className="text-sm text-muted-foreground">
                {marketsClosed?.reason || "Normal operation"}
              </p>
            </div>
            {marketsClosed?.closed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarketsClose(false)}
                disabled={loading === "markets"}
              >
                {loading === "markets" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reopen
              </Button>
            ) : (
              <CloseMarketsDialog onClose={(reason) => handleMarketsClose(true, reason)} loading={loading === "markets"} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card className={maintenanceMode?.enabled ? "border-yellow-500/50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>
            Put the platform in maintenance mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{maintenanceMode?.enabled ? "Maintenance Active" : "Normal Mode"}</p>
              <p className="text-sm text-muted-foreground">
                {maintenanceMode?.message || "Platform operating normally"}
              </p>
            </div>
            {maintenanceMode?.enabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMaintenanceToggle(false)}
                disabled={loading === "maintenance"}
              >
                {loading === "maintenance" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable
              </Button>
            ) : (
              <MaintenanceDialog onEnable={(message) => handleMaintenanceToggle(true, message)} loading={loading === "maintenance"} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CloseMarketsDialog({ onClose, loading }: { onClose: (reason: string) => void; loading: boolean }) {
  const [reason, setReason] = useState("");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Close Markets
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close Markets?</AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately close all markets and prevent new trades from being placed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="reason">Reason for closure</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Technical issues, Market volatility"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onClose(reason)}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Close Markets
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MaintenanceDialog({ onEnable, loading }: { onEnable: (message: string) => void; loading: boolean }) {
  const [message, setMessage] = useState("");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Enable
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enable Maintenance Mode?</AlertDialogTitle>
          <AlertDialogDescription>
            Users will see a maintenance page instead of the normal platform.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="message">Maintenance message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g., We're performing scheduled maintenance. Please check back soon."
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onEnable(message)} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enable Maintenance
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
}

interface AnnouncementsManagerProps {
  announcements: Announcement[];
}

export function AnnouncementsManager({ announcements }: AnnouncementsManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggle = async (id: string, isActive: boolean) => {
    setLoading(id);
    try {
      await toggleAnnouncement(id, !isActive);
      toast.success(isActive ? "Announcement hidden" : "Announcement shown");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(id);
    try {
      await deleteAnnouncement(id);
      toast.success("Announcement deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Announcements
          </CardTitle>
          <CardDescription>Manage platform-wide announcements</CardDescription>
        </div>
        <CreateAnnouncementDialog />
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No announcements yet</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="flex items-start justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{announcement.title}</h4>
                    <Badge variant={announcement.isActive ? "default" : "secondary"}>
                      {announcement.isActive ? "Active" : "Hidden"}
                    </Badge>
                    <Badge variant="outline">{announcement.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{announcement.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(announcement.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(announcement.id, announcement.isActive)}
                    disabled={loading === announcement.id}
                  >
                    {loading === announcement.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : announcement.isActive ? (
                      "Hide"
                    ) : (
                      "Show"
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(announcement.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateAnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createAnnouncement(formData);
      toast.success("Announcement created");
      setOpen(false);
      setFormData({ title: "", message: "", type: "info" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Announcement</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
          <DialogDescription>
            Create a new platform-wide announcement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
