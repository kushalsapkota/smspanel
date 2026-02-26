import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, Send } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, pendingTopups: 0, totalSms: 0 });
  const [chartData, setChartData] = useState<{ date: string; sent: number; failed: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      // Stat counts
      const { count: users } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: pendingTopups } = await supabase.from("topup_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: totalSms } = await supabase.from("sms_logs").select("*", { count: "exact", head: true });
      setStats({ users: users || 0, pendingTopups: pendingTopups || 0, totalSms: totalSms || 0 });

      // Last 30 days chart — fetch all logs in range (no row limit issue since we only grab created_at + status)
      const since = subDays(new Date(), 29).toISOString();
      const { data: logs } = await supabase
        .from("sms_logs")
        .select("created_at, status")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      // Build day-by-day buckets
      const buckets: Record<string, { sent: number; failed: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const key = format(startOfDay(subDays(new Date(), i)), "MMM dd");
        buckets[key] = { sent: 0, failed: 0 };
      }
      (logs || []).forEach((log) => {
        const key = format(startOfDay(new Date(log.created_at)), "MMM dd");
        if (buckets[key]) {
          if (log.status === "sent" || log.status === "queued") buckets[key].sent++;
          else if (log.status === "failed") buckets[key].failed++;
        }
      });
      setChartData(Object.entries(buckets).map(([date, v]) => ({ date, ...v })));
    };
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-info" },
    { label: "Pending Top-ups", value: stats.pendingTopups, icon: Wallet, color: "text-warning" },
    { label: "Total SMS Sent", value: stats.totalSms.toLocaleString(), icon: Send, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Admin Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="glass hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SMS Activity Chart */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base font-semibold">SMS Activity — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                />
                <Bar dataKey="sent" name="Sent" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
