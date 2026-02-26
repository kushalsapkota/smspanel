import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function TopUpRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("topup_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
  };

  useEffect(() => { loadRequests(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("topup_requests").insert({
        user_id: user.id,
        amount: parseFloat(amount),
        note,
      });
      if (error) throw error;
      // Trigger telegram notification
      await supabase.functions.invoke("telegram-notify", {
        body: { type: "topup_request", amount, user_email: user.email },
      });
      toast({ title: "Request Submitted", description: "Your top-up request has been sent to admin." });
      setAmount("");
      setNote("");
      setShowForm(false);
      loadRequests();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-success/10 text-success border-success/20";
    if (s === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-warning/10 text-warning border-warning/20";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Top Up</h1>
        <Button onClick={() => setShowForm(!showForm)} className="gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> Request Top Up
        </Button>
      </div>

      {showForm && (
        <Card className="glass mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> New Top-Up Request
            </CardTitle>
            <CardDescription>Submit a request and the admin will process it</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (Rs.)</Label>
                <Input id="amount" type="number" min="1" step="0.01" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (Payment Reference)</Label>
                <Textarea id="note" placeholder="Bank transfer ID, receipt number, etc." value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>
              <Button type="submit" className="gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No requests yet</TableCell></TableRow>
              ) : requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{format(new Date(r.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                  <TableCell className="font-semibold">Rs. {r.amount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.note || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
