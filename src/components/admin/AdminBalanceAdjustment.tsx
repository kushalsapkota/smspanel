import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";

interface BalanceAdjustment {
    id: string;
    user_id: string;
    amount: number;
    type: 'credit' | 'debit';
    reason: string;
    admin_id: string;
    created_at: string;
    profiles?: { full_name: string };
}

export function AdminBalanceAdjustment() {
    const { toast } = useToast();
    const { currency } = useCurrency();
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<'credit' | 'debit'>('credit');
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<BalanceAdjustment[]>([]);

    useEffect(() => {
        loadUsers();
        loadHistory();
    }, []);

    const loadUsers = async () => {
        const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, balance")
            .order("full_name");

        setUsers(profiles || []);
    };

    const loadHistory = async () => {
        try {
            // Fetch balance adjustments
            const { data: adjustments, error } = await supabase
                .from("balance_adjustments")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) {
                console.error("Error loading balance adjustments:", error);
                setHistory([]);
                return;
            }

            if (!adjustments || adjustments.length === 0) {
                setHistory([]);
                return;
            }

            // Fetch user profiles for the adjustments
            const userIds = [...new Set(adjustments.map((a: any) => a.user_id))];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, full_name")
                .in("user_id", userIds);

            // Map profiles to adjustments
            const profileMap = (profiles || []).reduce((acc: any, p: any) => {
                acc[p.user_id] = p;
                return acc;
            }, {});

            const enrichedHistory = adjustments.map((adj: any) => ({
                ...adj,
                profiles: profileMap[adj.user_id] || { full_name: "Unknown" }
            }));

            setHistory(enrichedHistory as any);
        } catch (err) {
            console.error("Failed to load history:", err);
            setHistory([]);
        }
    };

    const handleAdjustment = async () => {
        if (!selectedUserId || !amount || !reason.trim()) {
            toast({
                title: "Missing Information",
                description: "Please fill in all fields",
                variant: "destructive"
            });
            return;
        }

        const adjustmentAmount = parseFloat(amount);
        if (isNaN(adjustmentAmount) || adjustmentAmount <= 0) {
            toast({
                title: "Invalid Amount",
                description: "Please enter a valid positive number",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            // Get current user (admin)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Get current balance
            const { data: profile } = await supabase
                .from("profiles")
                .select("balance")
                .eq("user_id", selectedUserId)
                .single();

            if (!profile) throw new Error("User not found");

            const currentBalance = parseFloat(profile.balance);
            const finalAmount = type === 'credit' ? adjustmentAmount : -adjustmentAmount;
            const newBalance = currentBalance + finalAmount;

            if (newBalance < 0) {
                toast({
                    title: "Insufficient Balance",
                    description: "This debit would result in a negative balance",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }

            // Update balance
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ balance: newBalance })
                .eq("user_id", selectedUserId);

            if (updateError) throw updateError;

            // Log the adjustment
            const { error: logError } = await supabase
                .from("balance_adjustments")
                .insert({
                    user_id: selectedUserId,
                    amount: adjustmentAmount,
                    type: type,
                    reason: reason,
                    admin_id: user.id
                });

            if (logError) throw logError;

            toast({
                title: "Balance Adjusted",
                description: `Successfully ${type === 'credit' ? 'added' : 'deducted'} ${formatCurrency(adjustmentAmount, currency.symbol)}`
            });

            // Reset form
            setSelectedUserId("");
            setAmount("");
            setReason("");
            loadUsers();
            loadHistory();
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const selectedUser = users.find(u => u.user_id === selectedUserId);

    return (
        <div className="space-y-6">
            <h1 className="font-display text-2xl font-bold">Balance Adjustment</h1>

            {/* Adjustment Form */}
            <Card className="glass">
                <CardHeader>
                    <CardTitle className="font-display flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" /> Adjust User Balance
                    </CardTitle>
                    <CardDescription>Add or deduct balance from user accounts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="user">Select User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger id="user">
                                <SelectValue placeholder="Choose a user..." />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.user_id} value={user.user_id}>
                                        {user.full_name} - Current: {formatCurrency(user.balance, currency.symbol)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedUser && (
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                Current Balance: <span className="font-bold text-foreground">{formatCurrency(selectedUser.balance, currency.symbol)}</span>
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select value={type} onValueChange={(v: 'credit' | 'debit') => setType(v)}>
                                <SelectTrigger id="type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="credit">
                                        <div className="flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-success" />
                                            Credit (Add)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="debit">
                                        <div className="flex items-center gap-2">
                                            <Minus className="h-4 w-4 text-destructive" />
                                            Debit (Subtract)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                            id="reason"
                            placeholder="e.g., Payment reversal, Refund for failed SMS, Manual correction..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <Button
                        onClick={handleAdjustment}
                        className="gradient-primary text-primary-foreground w-full"
                        disabled={loading || !selectedUserId || !amount || !reason.trim()}
                    >
                        {loading ? "Processing..." : `${type === 'credit' ? 'Add' : 'Deduct'} ${amount ? formatCurrency(parseFloat(amount), currency.symbol) : 'Balance'}`}
                    </Button>
                </CardContent>
            </Card>

            {/* Adjustment History */}
            <Card className="glass">
                <CardHeader>
                    <CardTitle className="font-display">Adjustment History</CardTitle>
                    <CardDescription>Recent balance adjustments</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Reason</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        No adjustments yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((adj) => (
                                    <TableRow key={adj.id}>
                                        <TableCell className="text-sm">
                                            {format(new Date(adj.created_at), "MMM dd, HH:mm")}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {(adj as any).profiles?.full_name || "Unknown"}
                                        </TableCell>
                                        <TableCell>
                                            {adj.type === 'credit' ? (
                                                <span className="flex items-center gap-1 text-success">
                                                    <Plus className="h-3 w-3" /> Credit
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-destructive">
                                                    <Minus className="h-3 w-3" /> Debit
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            {formatCurrency(adj.amount, currency.symbol)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                                            {adj.reason}
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
