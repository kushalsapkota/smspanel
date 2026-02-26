import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["hsl(var(--chart-2))", "hsl(var(--destructive))", "hsl(var(--warning))"];

export function AdminCharts() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState("all");
    const [areaData, setAreaData] = useState<any[]>([]);
    const [pieData, setPieData] = useState<any[]>([]);
    const [barData, setBarData] = useState<any[]>([]);

    useEffect(() => {
        supabase.from("profiles").select("user_id, full_name").order("full_name").then(({ data }) => setProfiles(data || []));
    }, []);

    useEffect(() => {
        loadCharts();
    }, [selectedUser]);

    const loadCharts = async () => {
        const since = subDays(new Date(), 29).toISOString();
        let q = supabase.from("sms_logs").select("created_at, status, cost").gte("created_at", since).order("created_at", { ascending: true });
        if (selectedUser !== "all") q = q.eq("user_id", selectedUser);
        const { data: logs } = await q;
        const allLogs = logs || [];

        // Area chart — daily SMS count + revenue
        const areaBuckets: Record<string, { count: number; revenue: number }> = {};
        for (let i = 29; i >= 0; i--) {
            const key = format(startOfDay(subDays(new Date(), i)), "yyyy-MM-dd");
            areaBuckets[key] = { count: 0, revenue: 0 };
        }
        allLogs.forEach((l) => {
            const key = format(startOfDay(new Date(l.created_at)), "yyyy-MM-dd");
            if (areaBuckets[key]) {
                areaBuckets[key].count++;
                areaBuckets[key].revenue += l.cost || 0;
            }
        });
        setAreaData(Object.entries(areaBuckets).map(([date, v]) => ({ date, "SMS Count": v.count, "Revenue (₨)": parseFloat(v.revenue.toFixed(2)) })));

        // Pie chart — status distribution
        const sent = allLogs.filter((l) => l.status === "sent" || l.status === "queued").length;
        const failed = allLogs.filter((l) => l.status === "failed").length;
        const pending = allLogs.filter((l) => l.status === "pending").length;
        setPieData([
            { name: "Sent", value: sent },
            { name: "Failed", value: failed },
            { name: "Pending", value: pending },
        ].filter((d) => d.value > 0));

        // Bar chart — daily SMS activity
        setBarData(Object.entries(areaBuckets).map(([date, v]) => ({ date, "SMS Count": v.count })));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold">Analytics Charts</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">View charts for:</span>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="All Users" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {profiles.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Area Chart — SMS Volume */}
            <Card className="glass">
                <CardHeader>
                    <CardTitle className="text-base">SMS Volume (Last 30 Days)</CardTitle>
                    <p className="text-xs text-muted-foreground">Daily SMS count and revenue</p>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={areaData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                            <defs>
                                <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} interval={4} />
                            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area type="monotone" dataKey="SMS Count" stroke="hsl(var(--chart-2))" fill="url(#cGrad)" strokeWidth={2} />
                            <Area type="monotone" dataKey="Revenue (₨)" stroke="hsl(142,71%,45%)" fill="url(#rGrad)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Pie + Bar side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="glass">
                    <CardHeader>
                        <CardTitle className="text-base">SMS Status Distribution</CardTitle>
                        <p className="text-xs text-muted-foreground">Breakdown by status</p>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="glass">
                    <CardHeader>
                        <CardTitle className="text-base">Daily SMS Activity</CardTitle>
                        <p className="text-xs text-muted-foreground">SMS sent per day</p>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} interval={4} />
                                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="SMS Count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
