import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SendSMS() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { to, text: message },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || "Failed to send SMS");
      toast({ title: "SMS Sent!", description: `Message sent to ${to}` });
      setTo("");
      setMessage("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-6">Send SMS</h1>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Compose Message
          </CardTitle>
          <CardDescription>Send SMS to one or multiple numbers (comma separated)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">Recipient(s)</Label>
              <Input
                id="to"
                placeholder="9841XXXXXXX, 9842XXXXXXX"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">{message.length} characters</p>
            </div>
            <Button type="submit" className="gradient-primary text-primary-foreground" disabled={loading}>
              {loading ? "Sending..." : "Send SMS"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
