import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Send, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export function AdminAnalytics() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState("all");
    const [search, setSearch] = useState("");
    const [stats, setStats] = useState({
        activeUsers: 0,
        totalRevenue: 0,
        totalSms: 0,
        successRate: 0,
        totalSent: 0,
        totalFailed: 0,
        totalPending: 0,
        totalTopups: 0,
        totalSpent: 0,
    });
    const [userActivity, setUserActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from("profiles").select("user_id, full_name, is_active").order("full_name")
            .then(({ data }) => setProfiles(data || []));
    }, []);

    useEffect(() => {
        loadStats();
    }, [selectedUser]);

    const loadStats = async () => {
        setLoading(true);

        if (selectedUser === "all") {
            // Use SECURITY DEFINER RPC — no 1000-row cap
            const { data: overall } = await supabase.rpc("get_overall_sms_stats" as any);
            const { data: userStats } = await supabase.rpc("get_user_sms_stats" as any);
            const { count: activeUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true);
            const { data: topups } = await supabase.from("topup_requests").select("amount").eq("status", "approved");

            const o = (overall && overall[0]) || {};
            const totalSent = Number(o.total_sent || 0);
            const totalSms = Number(o.total_sms || 0);
            const totalSpent = Number(o.total_cost || 0);
            const totalTopups = (topups || []).reduce((s: number, t: any) => s + (t.amount || 0), 0);

            setStats({
                activeUsers: activeUsers || 0,
                totalRevenue: totalSpent,
                totalSms,
                successRate: totalSms > 0 ? parseFloat(((totalSent / totalSms) * 100).toFixed(1)) : 0,
                totalSent,
                totalFailed: Number(o.total_failed || 0),
                totalPending: Number(o.total_pending || 0),
                totalTopups,
                totalSpent,
            });

            setUserActivity(
                (userStats || []).map((u: any) => ({
                    userId: u.user_id,
                    name: u.full_name || "Unknown",
                    total: Number(u.total_sms),
                    spent: Number(u.total_cost),
                    sent: Number(u.total_sent),
                    successRate: Number(u.total_sms) > 0
                        ? ((Number(u.total_sent) / Number(u.total_sms)) * 100).toFixed(1)
                        : "0.0",
                    last: u.last_activity,
                }))
            );
        } else {
            // Per-user stats using count queries (no row fetch needed)
            const { count: totalSms } = await supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("user_id", selectedUser);
            const { count: totalSent } = await supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("user_id", selectedUser).in("status", ["sent", "queued"]);
            const { count: totalFailed } = await supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("user_id", selectedUser).eq("status", "failed");
            const { count: totalPending } = await supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("user_id", selectedUser).eq("status", "pending");

            // Cost needs sum — use rpc or fetch cost only
            const { data: costRows } = await supabase.from("sms_logs").select("cost").eq("user_id", selectedUser);
            const totalSpent = (costRows || []).reduce((s: number, r: any) => s + (r.cost || 0), 0);

            const { data: topups } = await supabase.from("topup_requests").select("amount").eq("user_id", selectedUser).eq("status", "approved");
            const totalTopups = (topups || []).reduce((s: number, t: any) => s + (t.amount || 0), 0);

            const sm = totalSms || 0;
            const st = totalSent || 0;

            setStats({
                activeUsers: 1,
                totalRevenue: totalSpent,
                totalSms: sm,
                successRate: sm > 0 ? parseFloat(((st / sm) * 100).toFixed(1)) : 0,
                totalSent: st,
                totalFailed: totalFailed || 0,
                totalPending: totalPending || 0,
                totalTopups,
                totalSpent,
            });
            setUserActivity([]);
        }

        setLoading(false);
    };

    const filteredActivity = userActivity.filter(
        (u) => u.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold">Analytics Dashboard</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">View analytics for:</span>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {profiles.map((p) => (
                                <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Users Active", value: stats.activeUsers, icon: Users, color: "text-info" },
                    { label: "Total Revenue", value: `Rs. ${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-success" },
                    { label: "Total SMS Sent", value: stats.totalSms.toLocaleString(), icon: Send, color: "text-primary" },
                    { label: "Success Rate", value: `${stats.successRate}%`, icon: TrendingUp, color: "text-warning" },
                ].map((c) => (
                    <Card key={c.label} className="glass">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
                            <c.icon className={`h-4 w-4 ${c.color}`} />
                        </CardHeader>
                        <CardContent><p className="font-display text-2xl font-bold">{c.value}</p></CardContent>
                    </Card>
                ))}
            </div>

            {/* SMS Status Breakdown */}
            <Card className="glass">
                <CardHeader><CardTitle className="text-base">SMS Status Breakdown</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                        {[
                            { label: "Total SMS", value: stats.totalSms, color: "bg-primary/10 text-primary" },
                            { label: "Sent", value: stats.totalSent, color: "bg-success/10 text-success" },
                            { label: "Passed", value: stats.totalSent, color: "bg-info/10 text-info" },
                            { label: "Failed", value: stats.totalFailed, color: "bg-destructive/10 text-destructive" },
                            { label: "Pending", value: stats.totalPending, color: "bg-warning/10 text-warning" },
                        ].map((s) => (
                            <div key={s.label} className="flex flex-col items-center gap-1">
                                <Badge className={`${s.color} border-0 text-sm font-bold px-3 py-1`}>{s.value.toLocaleString()}</Badge>
                                <span className="text-xs text-muted-foreground">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="glass"><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Top-ups</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-success">Rs. {stats.totalTopups.toFixed(2)}</p></CardContent></Card>
                <Card className="glass"><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Spent</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-destructive">Rs. {stats.totalSpent.toFixed(2)}</p></CardContent></Card>
                <Card className="glass"><CardHeader><CardTitle className="text-sm text-muted-foreground">Net Revenue</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-warning">Rs. {(stats.totalTopups - stats.totalSpent).toFixed(2)}</p></CardContent></Card>
            </div>

            {/* User Activity Logs — only shown in All Users view */}
            {selectedUser === "all" && (
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">User Activity Logs</CardTitle>
                        <Input placeholder="Search users..." className="w-48 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border">
                                {["User", "Total SMS", "Total Spent", "Success Rate", "Last Activity"].map((h) => (
                                    <th key={h} className="text-left text-xs text-muted-foreground font-medium py-3 px-4">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center text-muted-foreground py-8">Loading...</td></tr>
                                ) : filteredActivity.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No data</td></tr>
                                ) : filteredActivity.map((u) => (
                                    <tr key={u.userId} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                                        <td className="py-3 px-4 font-medium">{u.name}</td>
                                        <td className="py-3 px-4">{u.total.toLocaleString()}</td>
                                        <td className="py-3 px-4">Rs. {u.spent.toFixed(2)}</td>
                                        <td className="py-3 px-4">
                                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">{u.successRate}%</Badge>
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            {u.last ? format(new Date(u.last), "MMM dd, HH:mm") : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
