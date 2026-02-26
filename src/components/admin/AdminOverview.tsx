import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, Send, AlertTriangle } from "lucide-react";

export function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, pendingTopups: 0, totalSms: 0 });

  useEffect(() => {
    const load = async () => {
      const { count: users } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: pendingTopups } = await supabase.from("topup_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: totalSms } = await supabase.from("sms_logs").select("*", { count: "exact", head: true });
      setStats({ users: users || 0, pendingTopups: pendingTopups || 0, totalSms: totalSms || 0 });
    };
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-info" },
    { label: "Pending Top-ups", value: stats.pendingTopups, icon: Wallet, color: "text-warning" },
    { label: "Total SMS Sent", value: stats.totalSms, icon: Send, color: "text-success" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Admin Overview</h1>
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
    </div>
  );
}
