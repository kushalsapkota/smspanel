import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("*").then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
    });
  }, []);

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

  const fields = [
    { key: "aakash_auth_token", label: "Aakash SMS Auth Token", desc: "Your auth token from Aakash SMS API Service" },
    { key: "telegram_bot_token", label: "Telegram Bot Token", desc: "Bot token from @BotFather" },
    { key: "telegram_chat_id", label: "Telegram Chat ID", desc: "Chat/Group ID for notifications" },
    { key: "default_rate_per_sms", label: "Default Rate Per SMS (Rs.)", desc: "Default rate for new users" },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-6">Settings</h1>
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
    </div>
  );
}
