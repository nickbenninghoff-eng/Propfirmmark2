"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createTier, updateTier, deleteTier } from "@/server/actions/admin";

type Tier = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  accountSize: number;
  price: string;
  resetPrice: string;
  profitTarget: string;
  profitTargetPercent: string;
  maxDrawdown: string;
  maxDrawdownPercent: string;
  dailyLossLimit: string | null;
  dailyLossLimitPercent: string | null;
  minTradingDays: number;
  profitSplit: string;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
};

interface TierFormData {
  name: string;
  displayName: string;
  description: string;
  accountSize: number;
  price: string;
  resetPrice: string;
  profitTarget: string;
  profitTargetPercent: string;
  maxDrawdown: string;
  maxDrawdownPercent: string;
  dailyLossLimit: string;
  dailyLossLimitPercent: string;
  minTradingDays: number;
  profitSplit: string;
  isActive: boolean;
  isPopular: boolean;
}

const defaultFormData: TierFormData = {
  name: "",
  displayName: "",
  description: "",
  accountSize: 25000,
  price: "149.00",
  resetPrice: "49.00",
  profitTarget: "1500.00",
  profitTargetPercent: "6.00",
  maxDrawdown: "1500.00",
  maxDrawdownPercent: "6.00",
  dailyLossLimit: "500.00",
  dailyLossLimitPercent: "2.00",
  minTradingDays: 5,
  profitSplit: "80.00",
  isActive: true,
  isPopular: false,
};

export function CreateTierButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TierFormData>(defaultFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createTier(formData);
      toast.success("Tier created successfully");
      setOpen(false);
      setFormData(defaultFormData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create tier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Tier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tier</DialogTitle>
          <DialogDescription>
            Add a new evaluation account tier to your platform.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Internal Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 25k"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g., $25,000 Account"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this tier..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountSize">Account Size ($)</Label>
                <Input
                  id="accountSize"
                  type="number"
                  value={formData.accountSize}
                  onChange={(e) => setFormData({ ...formData, accountSize: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetPrice">Reset Price ($)</Label>
                <Input
                  id="resetPrice"
                  value={formData.resetPrice}
                  onChange={(e) => setFormData({ ...formData, resetPrice: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profitTarget">Profit Target ($)</Label>
                <Input
                  id="profitTarget"
                  value={formData.profitTarget}
                  onChange={(e) => setFormData({ ...formData, profitTarget: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profitTargetPercent">Profit Target (%)</Label>
                <Input
                  id="profitTargetPercent"
                  value={formData.profitTargetPercent}
                  onChange={(e) => setFormData({ ...formData, profitTargetPercent: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxDrawdown">Max Drawdown ($)</Label>
                <Input
                  id="maxDrawdown"
                  value={formData.maxDrawdown}
                  onChange={(e) => setFormData({ ...formData, maxDrawdown: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDrawdownPercent">Max Drawdown (%)</Label>
                <Input
                  id="maxDrawdownPercent"
                  value={formData.maxDrawdownPercent}
                  onChange={(e) => setFormData({ ...formData, maxDrawdownPercent: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyLossLimit">Daily Loss Limit ($)</Label>
                <Input
                  id="dailyLossLimit"
                  value={formData.dailyLossLimit}
                  onChange={(e) => setFormData({ ...formData, dailyLossLimit: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyLossLimitPercent">Daily Loss Limit (%)</Label>
                <Input
                  id="dailyLossLimitPercent"
                  value={formData.dailyLossLimitPercent}
                  onChange={(e) => setFormData({ ...formData, dailyLossLimitPercent: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minTradingDays">Min Trading Days</Label>
                <Input
                  id="minTradingDays"
                  type="number"
                  value={formData.minTradingDays}
                  onChange={(e) => setFormData({ ...formData, minTradingDays: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profitSplit">Profit Split (%)</Label>
                <Input
                  id="profitSplit"
                  value={formData.profitSplit}
                  onChange={(e) => setFormData({ ...formData, profitSplit: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked })}
                />
                <Label htmlFor="isPopular">Mark as Popular</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditTierButton({ tier }: { tier: Tier }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TierFormData>({
    name: tier.name,
    displayName: tier.displayName,
    description: tier.description || "",
    accountSize: tier.accountSize,
    price: tier.price,
    resetPrice: tier.resetPrice,
    profitTarget: tier.profitTarget,
    profitTargetPercent: tier.profitTargetPercent,
    maxDrawdown: tier.maxDrawdown,
    maxDrawdownPercent: tier.maxDrawdownPercent,
    dailyLossLimit: tier.dailyLossLimit || "0.00",
    dailyLossLimitPercent: tier.dailyLossLimitPercent || "0.00",
    minTradingDays: tier.minTradingDays,
    profitSplit: tier.profitSplit,
    isActive: tier.isActive,
    isPopular: tier.isPopular,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateTier(tier.id, formData);
      toast.success("Tier updated successfully");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update tier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tier: {tier.displayName}</DialogTitle>
          <DialogDescription>
            Update the tier settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Internal Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-accountSize">Account Size ($)</Label>
                <Input
                  id="edit-accountSize"
                  type="number"
                  value={formData.accountSize}
                  onChange={(e) => setFormData({ ...formData, accountSize: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price ($)</Label>
                <Input
                  id="edit-price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-resetPrice">Reset Price ($)</Label>
                <Input
                  id="edit-resetPrice"
                  value={formData.resetPrice}
                  onChange={(e) => setFormData({ ...formData, resetPrice: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-profitTarget">Profit Target ($)</Label>
                <Input
                  id="edit-profitTarget"
                  value={formData.profitTarget}
                  onChange={(e) => setFormData({ ...formData, profitTarget: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-profitTargetPercent">Profit Target (%)</Label>
                <Input
                  id="edit-profitTargetPercent"
                  value={formData.profitTargetPercent}
                  onChange={(e) => setFormData({ ...formData, profitTargetPercent: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-maxDrawdown">Max Drawdown ($)</Label>
                <Input
                  id="edit-maxDrawdown"
                  value={formData.maxDrawdown}
                  onChange={(e) => setFormData({ ...formData, maxDrawdown: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-maxDrawdownPercent">Max Drawdown (%)</Label>
                <Input
                  id="edit-maxDrawdownPercent"
                  value={formData.maxDrawdownPercent}
                  onChange={(e) => setFormData({ ...formData, maxDrawdownPercent: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dailyLossLimit">Daily Loss Limit ($)</Label>
                <Input
                  id="edit-dailyLossLimit"
                  value={formData.dailyLossLimit}
                  onChange={(e) => setFormData({ ...formData, dailyLossLimit: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dailyLossLimitPercent">Daily Loss Limit (%)</Label>
                <Input
                  id="edit-dailyLossLimitPercent"
                  value={formData.dailyLossLimitPercent}
                  onChange={(e) => setFormData({ ...formData, dailyLossLimitPercent: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-minTradingDays">Min Trading Days</Label>
                <Input
                  id="edit-minTradingDays"
                  type="number"
                  value={formData.minTradingDays}
                  onChange={(e) => setFormData({ ...formData, minTradingDays: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-profitSplit">Profit Split (%)</Label>
                <Input
                  id="edit-profitSplit"
                  value={formData.profitSplit}
                  onChange={(e) => setFormData({ ...formData, profitSplit: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked })}
                />
                <Label htmlFor="edit-isPopular">Mark as Popular</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ToggleTierButton({ tier }: { tier: Tier }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await updateTier(tier.id, { isActive: !tier.isActive });
      toast.success(tier.isActive ? "Tier deactivated" : "Tier activated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update tier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="icon" variant="ghost" onClick={handleToggle} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : tier.isActive ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </Button>
  );
}

export function DeleteTierButton({ tier }: { tier: Tier }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteTier(tier.id);
      toast.success("Tier deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete tier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="text-red-500">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {tier.displayName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the tier.
            Note: You cannot delete a tier that has existing accounts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
