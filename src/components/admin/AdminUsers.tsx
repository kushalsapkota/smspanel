import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, CheckCircle, XCircle, Edit2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";

export function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>("");

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
      description: `SMS rate updated to ${formatCurrency(rate)}`
    });

    setEditingUserId(null);
    setEditRate("");
    loadUsers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">User Management</h1>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Users className="h-3 w-3 mr-1" />
          {users.length} Users
        </Badge>
      </div>

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
                    <TableCell className="text-right font-semibold">{formatCurrency(user.balance)}</TableCell>
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
                          <span className="font-semibold">{formatCurrency(user.rate_per_sms)}</span>
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
