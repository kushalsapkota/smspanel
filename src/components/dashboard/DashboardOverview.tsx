import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Send, TrendingUp, Key } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export function DashboardOverview() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [smsCount, setSmsCount] = useState(0);
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [chartData, setChartData] = useState<{ date: string; sent: number; failed: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(p);

      const { count: sc } = await supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setSmsCount(sc || 0);

      const { count: ac } = await supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setApiKeyCount(ac || 0);

      // Last 30 days chart
      const since = subDays(new Date(), 29).toISOString();
      const { data: logs } = await supabase
        .from("sms_logs")
        .select("created_at, status")
        .eq("user_id", user.id)
        .gte("created_at", since)
        .order("created_at", { ascending: true });

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
  }, [user]);

  const stats = [
    { label: "Balance", value: `Rs. ${profile?.balance || "0.00"}`, icon: Wallet, color: "text-primary" },
    { label: "SMS Sent", value: smsCount.toLocaleString(), icon: Send, color: "text-info" },
    { label: "Rate/SMS", value: `Rs. ${profile?.rate_per_sms || "0.00"}`, icon: TrendingUp, color: "text-success" },
    { label: "API Keys", value: apiKeyCount.toString(), icon: Key, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SMS Activity Chart */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base font-semibold">My SMS Activity — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                />
                <Area type="monotone" dataKey="sent" name="Sent" stroke="hsl(var(--chart-2))" fill="url(#sentGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" name="Failed" stroke="hsl(var(--destructive))" fill="url(#failGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
