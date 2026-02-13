import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle, XCircle, Activity } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export function AdminOverview() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    deliveredSms: 0,
    notDeliveredSms: 0,
    totalHits: 0
  });

  useEffect(() => {
    const load = async () => {
      // Total Revenue = Sum of approved top-ups
      const { data: approvedTopups } = await supabase
        .from("topup_requests")
        .select("amount")
        .eq("status", "approved");

      const totalRevenue = approvedTopups?.reduce((sum, t) => sum + parseFloat(String(t.amount || 0)), 0) || 0;

      // Total Delivered SMS = SMS with status "sent"
      const { count: deliveredSms } = await supabase
        .from("sms_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "sent");

      // Total Not Delivered = SMS with status "failed"
      const { count: notDeliveredSms } = await supabase
        .from("sms_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed");

      // Total Hits = All SMS (delivered + not delivered + pending)
      const { count: totalHits } = await supabase
        .from("sms_logs")
        .select("*", { count: "exact", head: true });

      setStats({
        totalRevenue,
        deliveredSms: deliveredSms || 0,
        notDeliveredSms: notDeliveredSms || 0,
        totalHits: totalHits || 0
      });
    };
    load();
  }, []);

  const cards = [
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-success",
      description: "From approved top-ups"
    },
    {
      label: "Total Delivered",
      value: formatNumber(stats.deliveredSms),
      icon: CheckCircle,
      color: "text-success",
      description: "Successfully sent SMS"
    },
    {
      label: "Total Not Delivered",
      value: formatNumber(stats.notDeliveredSms),
      icon: XCircle,
      color: "text-destructive",
      description: "Failed SMS"
    },
    {
      label: "Total Hits",
      value: formatNumber(stats.totalHits),
      icon: Activity,
      color: "text-primary",
      description: "All SMS attempts"
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Admin Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="glass hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <p className="text-xs text-muted-foreground/60 mt-1">{c.description}</p>
              </div>
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
