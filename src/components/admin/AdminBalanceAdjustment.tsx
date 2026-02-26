import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function AdminBalanceAdjustment() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [profiles, setProfiles] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState("");
    const [type, setType] = useState("credit");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        supabase.from("profiles").select("user_id, full_name, balance").order("full_name")
            .then(({ data }) => setProfiles(data || []));
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const { data: adjustments } = await supabase
            .from("balance_adjustments")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);

        if (!adjustments || adjustments.length === 0) {
            setHistory([]);
            return;
        }

        const userIds = [...new Set(adjustments.map((a: any) => a.user_id))];
        const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", userIds);

        const profileMap = (profiles || []).reduce((acc: any, p: any) => {
            acc[p.user_id] = p;
            return acc;
        }, {});

        const enrichedHistory = adjustments.map((adj: any) => ({
            ...adj,
            profiles: profileMap[adj.user_id] || { full_name: "Unknown" }
        }));

        setHistory(enrichedHistory);
    };

    const handleSubmit = async () => {
        if (!selectedUser || !amount || !reason.trim()) {
            toast({ title: "Missing fields", description: "Please fill all fields.", variant: "destructive" });
            return;
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ title: "Invalid amount", description: "Enter a positive number.", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            // Update balance
            const profile = profiles.find((p) => p.user_id === selectedUser);
            const currentBalance = profile?.balance || 0;
            const newBalance = type === "credit" ? currentBalance + numAmount : currentBalance - numAmount;

            const { error: balErr } = await supabase
                .from("profiles")
                .update({ balance: parseFloat(newBalance.toFixed(2)) })
                .eq("user_id", selectedUser);
            if (balErr) throw balErr;

            // Log adjustment
            const { error: logErr } = await supabase.from("balance_adjustments").insert({
                user_id: selectedUser,
                admin_id: user?.id,
                type,
                amount: numAmount,
                reason: reason.trim(),
            });
            if (logErr) throw logErr;

            toast({ title: "Balance updated", description: `${type === "credit" ? "Added" : "Deducted"} Rs. ${numAmount.toFixed(2)}` });
            setAmount("");
            setReason("");
            setSelectedUser("");
            // Refresh profiles for updated balances
            supabase.from("profiles").select("user_id, full_name, balance").order("full_name").then(({ data }) => setProfiles(data || []));
            loadHistory();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
        setSubmitting(false);
    };

    return (
        <div className="space-y-6">
            <h1 className="font-display text-2xl font-bold">Balance Adjustment</h1>

            <Card className="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-warning" />
                        Adjust User Balance
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Add or deduct balance from user accounts</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Select User</label>
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger><SelectValue placeholder="Choose a user..." /></SelectTrigger>
                            <SelectContent>
                                {profiles.map((p) => (
                                    <SelectItem key={p.user_id} value={p.user_id}>
                                        {p.full_name} — Rs. {p.balance}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Type</label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="credit">+ Credit (Add)</SelectItem>
                                    <SelectItem value="debit">− Debit (Deduct)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Amount</label>
                            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Reason</label>
                        <Textarea placeholder="e.g., Payment reversal, Refund for failed SMS, Manual correction..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                    </div>

                    <Button className="w-full gradient-primary text-primary-foreground" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Processing..." : type === "credit" ? "Add Balance" : "Deduct Balance"}
                    </Button>
                </CardContent>
            </Card>

            {/* Adjustment History */}
            <Card className="glass">
                <CardHeader>
                    <CardTitle className="text-base">Adjustment History</CardTitle>
                    <p className="text-xs text-muted-foreground">Recent balance adjustments</p>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-border">
                            {["Date", "User", "Type", "Amount", "Reason"].map((h) => (
                                <th key={h} className="text-left text-xs text-muted-foreground font-medium py-3 px-4">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No adjustments yet</td></tr>
                            ) : history.map((h) => (
                                <tr key={h.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                                    <td className="py-3 px-4 text-muted-foreground">{format(new Date(h.created_at), "MMM dd, HH:mm")}</td>
                                    <td className="py-3 px-4 font-medium">{(h as any).profiles?.full_name || "—"}</td>
                                    <td className="py-3 px-4">
                                        <Badge variant="outline" className={h.type === "credit" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                                            {h.type === "credit" ? "+ Credit" : "− Debit"}
                                        </Badge>
                                    </td>
                                    <td className="py-3 px-4 font-semibold">Rs. {h.amount}</td>
                                    <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">{h.reason}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
