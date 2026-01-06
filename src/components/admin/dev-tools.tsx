"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Database, CheckCircle, User } from "lucide-react";
import { toast } from "sonner";

export function CreateTestDataButton() {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/create-test-data", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Test data created successfully!");
        setCreated(true);
        console.log("Test data details:", data);
      } else {
        toast.error(data.error || "Failed to create test data");
        console.error("Error:", data);
      }
    } catch (error) {
      toast.error("Failed to create test data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This will create 5 test traders, 5 trading accounts, and 1 test tier.
      </p>
      <Button onClick={handleCreate} disabled={loading || created}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : created ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Test Data Created
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            Generate Test Data
          </>
        )}
      </Button>
      {created && (
        <p className="text-sm text-green-600 dark:text-green-400">
          ✓ Test data has been created. Check /admin/accounts and /admin/users to see the new data.
        </p>
      )}
    </div>
  );
}

export function UpdateAdminNameForm() {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/admin/update-admin-name");
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
          setFirstName(data.user.firstName || "");
          setLastName(data.user.lastName || "");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    }
    fetchUser();
  }, []);

  const handleUpdate = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter both first and last name");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/update-admin-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Admin name updated successfully!");
        setCurrentUser({ ...currentUser, firstName, lastName });
      } else {
        toast.error(data.error || "Failed to update admin name");
      }
    } catch (error) {
      toast.error("Failed to update admin name");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {currentUser && (
        <div className="text-sm text-muted-foreground mb-4">
          <p>Current: {currentUser.firstName || "(none)"} {currentUser.lastName || "(none)"}</p>
          <p>Email: {currentUser.email}</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </div>
      </div>
      <Button onClick={handleUpdate} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <User className="mr-2 h-4 w-4" />
            Update Admin Name
          </>
        )}
      </Button>
    </div>
  );
}
