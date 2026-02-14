import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Save, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function AdminSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState({ id: "", message: "", is_enabled: true });
  const [loading, setLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("*").then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
    });

    // Load notification
    loadNotification();
  }, []);

  const loadNotification = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setNotification({ id: data.id, message: data.message, is_enabled: data.is_enabled });
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setLoading(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from("settings").upsert({ key, value }, { onConflict: "key" });
      }
      toast({ title: "Settings Saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveNotification = async () => {
    setNotificationLoading(true);
    try {
      if (notification.id) {
        // Update existing
        await supabase
          .from("notifications")
          .update({
            message: notification.message,
            is_enabled: notification.is_enabled,
            updated_at: new Date().toISOString()
          })
          .eq("id", notification.id);
      } else {
        // Create new
        const { data } = await supabase
          .from("notifications")
          .insert({
            message: notification.message,
            is_enabled: notification.is_enabled,
            created_by: user?.id
          })
          .select()
          .single();

        if (data) {
          setNotification(prev => ({ ...prev, id: data.id }));
        }
      }
      toast({ title: "Notification Saved", description: "Users will see the updated message" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setNotificationLoading(false);
    }
  };

  const fields = [
    { key: "aakash_auth_token", label: "Aakash SMS Auth Token", desc: "Your auth token from Aakash SMS API Service" },
    { key: "globalzms_api_token", label: "Global ZMS API Token", desc: "Your API token from Global ZMS SMS Service" },
    { key: "globalzms_sender_id", label: "Global ZMS Sender ID", desc: "Sender ID for Global ZMS (alphanumeric, max 11 chars)" },
    { key: "telegram_bot_token", label: "Telegram Bot Token", desc: "Bot token from @BotFather" },
    { key: "telegram_chat_id", label: "Telegram Chat ID", desc: "Chat/Group ID for notifications" },
    { key: "default_rate_per_sms", label: "Default Rate Per SMS (€)", desc: "Default rate for new users" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      {/* System Settings */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> System Settings</CardTitle>
          <CardDescription>Configure your SMS gateway and notification settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type={f.key.includes("token") ? "password" : "text"}
                value={settings[f.key] || ""}
                onChange={(e) => updateSetting(f.key, e.target.value)}
                placeholder={f.desc}
              />
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
          <Button onClick={save} className="gradient-primary text-primary-foreground" disabled={loading}>
            <Save className="h-4 w-4 mr-2" /> {loading ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> User Notification</CardTitle>
          <CardDescription>Set a scrolling message banner for all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-message">Notification Message</Label>
            <Textarea
              id="notification-message"
              placeholder="Enter message to display to users..."
              value={notification.message}
              onChange={(e) => setNotification(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">This message will scroll across the top of the user dashboard</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notification-enabled">Enable Notification</Label>
              <p className="text-xs text-muted-foreground">Show notification banner to users</p>
            </div>
            <Switch
              id="notification-enabled"
              checked={notification.is_enabled}
              onCheckedChange={(checked) => setNotification(prev => ({ ...prev, is_enabled: checked }))}
            />
          </div>

          <Button
            onClick={saveNotification}
            className="gradient-primary text-primary-foreground w-full"
            disabled={notificationLoading || !notification.message.trim()}
          >
            <Save className="h-4 w-4 mr-2" /> {notificationLoading ? "Saving..." : "Save Notification"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
