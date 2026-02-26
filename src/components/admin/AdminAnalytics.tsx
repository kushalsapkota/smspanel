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

    useEffect(() => {
        loadProfiles();
    }, []);

    useEffect(() => {
        loadStats();
    }, [selectedUser]);

    const loadProfiles = async () => {
        const { data } = await supabase.from("profiles").select("user_id, full_name, is_active").order("full_name");
        setProfiles(data || []);
    };

    const loadStats = async () => {
        // Fetch all sms_logs (just status + cost + user_id + created_at)
        let logsQuery = supabase.from("sms_logs").select("status, cost, user_id, created_at");
        if (selectedUser !== "all") logsQuery = logsQuery.eq("user_id", selectedUser);
        const { data: logs } = await logsQuery;

        const allLogs = logs || [];
        const totalSms = allLogs.length;
        const totalSent = allLogs.filter((l) => l.status === "sent" || l.status === "queued").length;
        const totalFailed = allLogs.filter((l) => l.status === "failed").length;
        const totalPending = allLogs.filter((l) => l.status === "pending").length;
        const totalSpent = allLogs.reduce((s, l) => s + (l.cost || 0), 0);
        const successRate = totalSms > 0 ? ((totalSent / totalSms) * 100).toFixed(1) : "0.0";

        // Total topups
        let topupsQuery = supabase.from("topup_requests").select("amount").eq("status", "approved");
        if (selectedUser !== "all") topupsQuery = topupsQuery.eq("user_id", selectedUser);
        const { data: topups } = await topupsQuery;
        const totalTopups = (topups || []).reduce((s, t) => s + (t.amount || 0), 0);

        // Active users
        const { count: activeUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true);

        setStats({
            activeUsers: activeUsers || 0,
            totalRevenue: totalSpent,
            totalSms,
            successRate: parseFloat(successRate as string),
            totalSent,
            totalFailed,
            totalPending,
            totalTopups,
            totalSpent,
        });

        // Build per-user activity
        const byUser: Record<string, { total: number; spent: number; sent: number; last: string; email: string; name: string }> = {};
        for (const log of allLogs) {
            if (!byUser[log.user_id]) byUser[log.user_id] = { total: 0, spent: 0, sent: 0, last: log.created_at, email: "", name: "" };
            byUser[log.user_id].total++;
            byUser[log.user_id].spent += log.cost || 0;
            if (log.status === "sent" || log.status === "queued") byUser[log.user_id].sent++;
            if (log.created_at > byUser[log.user_id].last) byUser[log.user_id].last = log.created_at;
        }

        // Attach profile info
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", Object.keys(byUser));
        const { data: authUsers } = await supabase.from("profiles").select("user_id, full_name");
        // We don't have email in profiles directly — use full_name as identifier
        for (const p of profs || []) {
            if (byUser[p.user_id]) {
                byUser[p.user_id].name = p.full_name;
            }
        }

        const activity = Object.entries(byUser).map(([uid, v]) => ({
            userId: uid,
            name: v.name || uid.slice(0, 8),
            total: v.total,
            spent: v.spent,
            successRate: v.total > 0 ? ((v.sent / v.total) * 100).toFixed(1) : "0.0",
            last: v.last,
        }));
        activity.sort((a, b) => b.total - a.total);
        setUserActivity(activity);
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

            {/* User Activity Logs */}
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
                            {filteredActivity.length === 0 ? (
                                <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No data</td></tr>
                            ) : filteredActivity.map((u) => (
                                <tr key={u.userId} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                                    <td className="py-3 px-4 font-medium">{u.name}</td>
                                    <td className="py-3 px-4">{u.total.toLocaleString()}</td>
                                    <td className="py-3 px-4">Rs. {u.spent.toFixed(2)}</td>
                                    <td className="py-3 px-4">
                                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">{u.successRate}%</Badge>
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground">{format(new Date(u.last), "MMM dd, HH:mm")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
