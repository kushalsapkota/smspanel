import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, CheckCircle, XCircle, Edit2, Save, X, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";

export function AdminUsers() {
  const { toast } = useToast();
  const { currency } = useCurrency();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>("");

  // Create user dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    balance: "0",
    rate: "1.50"
  });


  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: authUsers } = await supabase.auth.admin.listUsers();

      const combined = profiles?.map((p) => {
        const authUser = authUsers?.users.find((u) => u.id === p.user_id);
        return {
          ...p,
          email: authUser?.email || "N/A",
        };
      }) || [];

      setUsers(combined);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: currentStatus ? "User Deactivated" : "User Activated",
      description: `User has been ${currentStatus ? "deactivated" : "activated"} successfully`
    });
    loadUsers();
  };

  const startEditRate = (userId: string, currentRate: number) => {
    setEditingUserId(userId);
    setEditRate(currentRate.toString());
  };

  const cancelEditRate = () => {
    setEditingUserId(null);
    setEditRate("");
  };

  const saveRate = async (userId: string) => {
    const rate = parseFloat(editRate);

    if (isNaN(rate) || rate < 0) {
      toast({ title: "Invalid Rate", description: "Please enter a valid positive number", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ rate_per_sms: rate })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Rate Updated",
      description: `SMS rate updated to ${formatCurrency(rate, currency.symbol)}`
    });

    setEditingUserId(null);
    setEditRate("");
    loadUsers();
  };

  const createUser = async () => {
    // Validate inputs
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast({ title: "Validation Error", description: "Email, password, and full name are required", variant: "destructive" });
      return;
    }

    const balance = parseFloat(newUser.balance);
    const rate = parseFloat(newUser.rate);

    if (isNaN(balance) || balance < 0) {
      toast({ title: "Invalid Balance", description: "Please enter a valid balance", variant: "destructive" });
      return;
    }

    if (isNaN(rate) || rate <= 0) {
      toast({ title: "Invalid Rate", description: "Please enter a valid rate per SMS", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      // Create user in Supabase Auth using admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: {
          full_name: newUser.fullName
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Update the profile with custom balance and rate
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: newUser.fullName,
          balance: balance,
          rate_per_sms: rate
        })
        .eq("user_id", authData.user.id);

      if (profileError) throw profileError;

      toast({
        title: "User Created!",
        description: `${newUser.email} has been created successfully`
      });

      // Reset form and close dialog
      setNewUser({
        email: "",
        password: "",
        fullName: "",
        balance: "0",
        rate: "1.50"
      });
      setCreateDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error Creating User",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">User Management</h1>
        <div className="flex items-center gap-3">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new customer account with custom balance and SMS rate
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="balance">Initial Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newUser.balance}
                      onChange={(e) => setNewUser({ ...newUser, balance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Rate per SMS</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="1.50"
                      value={newUser.rate}
                      onChange={(e) => setNewUser({ ...newUser, rate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  className="gradient-primary text-primary-foreground"
                  onClick={createUser}
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Users className="h-3 w-3 mr-1" />
            {users.length} Users
          </Badge>
        </div>
      </div>


      {/* User Creation Guide */}
      <Card className="glass mb-6 border-primary/20">
        <CardContent className="p-6">
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">How to Create New Users</h3>
                    <p className="text-sm text-muted-foreground">Click to view step-by-step instructions</p>
                  </div>
                </div>
                <div className="text-muted-foreground group-open:rotate-180 transition-transform">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </summary>

            <div className="mt-6 space-y-4 border-t border-border pt-6">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  Create User in Supabase Dashboard
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Go to your Supabase Dashboard → <strong>Authentication</strong> → Click <strong>"Add User"</strong> button
                </p>
                <div className="ml-8 p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="mb-2">Enter the following details:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Email: customer@example.com</li>
                    <li>Password: (set a secure password)</li>
                    <li>Auto Confirm User: ✓ (checked)</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  Copy the User ID
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  After creating the user, click on the user in the list and copy their <strong>User ID</strong> (UUID format)
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  Run SQL Commands
                </h4>
                <p className="text-sm text-muted-foreground ml-8 mb-3">
                  Go to <strong>SQL Editor</strong> in Supabase Dashboard and run the following SQL (replace the values):
                </p>
                <div className="ml-8 relative">
                  <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
                    {`-- Replace these values with actual data:
-- USER_ID: The UUID you copied in step 2
-- Customer Name: Full name of the customer
-- 100.00: Initial balance amount
-- 1.50: Rate per SMS for this customer

INSERT INTO public.profiles (user_id, full_name, balance, rate_per_sms, is_active)
VALUES (
  'USER_ID_HERE',  -- Paste the User ID from step 2
  'Customer Name',  -- e.g., 'John Doe'
  100.00,          -- Initial balance (e.g., 100.00)
  1.50,            -- Rate per SMS (e.g., 1.50)
  true             -- Active status
);

INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'user');  -- Same User ID as above`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-white text-xs">✓</span>
                  Done!
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  The user can now log in with their email and password. They will see their balance and can start sending SMS.
                </p>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Rate/SMS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.full_name || "Unknown"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(user.balance, currency.symbol)}</TableCell>
                    <TableCell className="text-right">
                      {editingUserId === user.user_id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="w-28 h-8 text-right"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveRate(user.user_id)}
                            className="h-8 w-8 p-0 text-success hover:text-success"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditRate}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold">{formatCurrency(user.rate_per_sms, currency.symbol)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditRate(user.user_id, user.rate_per_sms)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={user.is_active ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}
                      >
                        {user.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(user.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={user.is_active ? "destructive" : "default"}
                        onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
