import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function ApiKeys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadKeys = async () => {
    if (!user) return;
    const { data } = await supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setKeys(data || []);
  };

  useEffect(() => { loadKeys(); }, [user]);

  const generateKey = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0")).join("");
      const { error } = await supabase.from("api_keys").insert({ user_id: user.id, api_key: key });
      if (error) throw error;
      toast({ title: "API Key Generated", description: "Your new API key is ready." });
      loadKeys();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted", description: "API key removed." });
    loadKeys();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied!", description: "API key copied to clipboard." });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">API Keys</h1>
        <Button onClick={generateKey} className="gradient-primary text-primary-foreground" disabled={loading}>
          <Plus className="h-4 w-4 mr-2" /> Generate Key
        </Button>
      </div>

      <Card className="glass mb-6">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" /> API Integration
          </CardTitle>
          <CardDescription>
            Use your API key to send SMS programmatically. Send a POST request with header <code className="text-primary">x-api-key</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <p className="text-muted-foreground">POST /functions/v1/send-sms</p>
            <p className="text-muted-foreground">Header: x-api-key: YOUR_API_KEY</p>
            <p className="text-muted-foreground">Body: {"{"} "to": "98XXXXXXXX", "text": "Hello" {"}"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>API Key</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No API keys yet</TableCell></TableRow>
              ) : keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-mono text-sm">{k.api_key.slice(0, 12)}...{k.api_key.slice(-8)}</TableCell>
                  <TableCell className="text-sm">{format(new Date(k.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={k.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                      {k.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => copyKey(k.api_key)}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteKey(k.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
