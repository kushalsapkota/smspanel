import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Send, TrendingUp, Key } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { NotificationBanner } from "./NotificationBanner";

export function DashboardOverview() {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const [profile, setProfile] = useState<any>(null);
  const [smsCount, setSmsCount] = useState(0);
  const [apiKeyCount, setApiKeyCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(p);
      // Calculate actual SMS sent by counting recipients (comma-separated)
      const { data: smsData } = await supabase
        .from("sms_logs")
        .select("recipient")
        .eq("user_id", user.id);
      const totalSms = smsData?.reduce((sum, log) => {
        // Count commas + 1 to get number of recipients
        const recipientCount = log.recipient ? (log.recipient.split(',').length) : 1;
        return sum + recipientCount;
      }, 0) || 0;
      setSmsCount(totalSms);
      const { count: ac } = await supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setApiKeyCount(ac || 0);
    };
    load();

    // Set up real-time subscription for profile updates (balance changes)
    const profileChannel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Update profile with new data (including updated balance)
          setProfile(payload.new);
        }
      )
      .subscribe();

    // Set up real-time subscription for SMS logs (SMS count changes)
    const smsLogsChannel = supabase
      .channel(`sms-logs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_logs',
          filter: `user_id=eq.${user.id}`
        },
        async () => {
          // Recalculate SMS count when new SMS is logged
          const { data: smsData } = await supabase
            .from("sms_logs")
            .select("recipient")
            .eq("user_id", user.id);
          const totalSms = smsData?.reduce((sum, log) => {
            const recipientCount = log.recipient ? (log.recipient.split(',').length) : 1;
            return sum + recipientCount;
          }, 0) || 0;
          setSmsCount(totalSms);
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(smsLogsChannel);
    };
  }, [user]);

  const stats = [
    { label: "Balance", value: formatCurrency(profile?.balance || 0, currency.symbol), icon: Wallet, color: "text-primary" },
    { label: "SMS Sent", value: smsCount.toString(), icon: Send, color: "text-info" },
    { label: "Rate/SMS", value: formatCurrency(profile?.rate_per_sms || 0, currency.symbol), icon: TrendingUp, color: "text-success" },
    { label: "API Keys", value: apiKeyCount.toString(), icon: Key, color: "text-warning" },
  ];


  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Dashboard</h1>

      {/* Notification Banner */}
      <NotificationBanner />

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
