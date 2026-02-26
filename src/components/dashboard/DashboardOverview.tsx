import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Send, TrendingUp, Key } from "lucide-react";

export function DashboardOverview() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [smsCount, setSmsCount] = useState(0);
  const [apiKeyCount, setApiKeyCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(p);
      const { count: sc } = await supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setSmsCount(sc || 0);
      const { count: ac } = await supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setApiKeyCount(ac || 0);
    };
    load();
  }, [user]);

  const stats = [
    { label: "Balance", value: `Rs. ${profile?.balance || "0.00"}`, icon: Wallet, color: "text-primary" },
    { label: "SMS Sent", value: smsCount.toString(), icon: Send, color: "text-info" },
    { label: "Rate/SMS", value: `Rs. ${profile?.rate_per_sms || "0.00"}`, icon: TrendingUp, color: "text-success" },
    { label: "API Keys", value: apiKeyCount.toString(), icon: Key, color: "text-warning" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Dashboard</h1>
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
    </div>
  );
}
