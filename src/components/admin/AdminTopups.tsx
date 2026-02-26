import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function AdminTopups() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("topup_requests")
      .select("*, profiles!topup_requests_user_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    setRequests(data || []);
  };

  useEffect(() => { load(); }, []);

  const processTopup = async (id: string, status: "approved" | "rejected", userId: string, amount: number, userEmail?: string) => {
    try {
      const { error } = await supabase.functions.invoke("process-topup", {
        body: { request_id: id, status, user_id: userId, amount },
      });
      if (error) throw error;
      toast({ title: `Top-up ${status}`, description: `Request has been ${status}.` });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-success/10 text-success border-success/20";
    if (s === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-warning/10 text-warning border-warning/20";
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Top-up Requests</h1>
      <Card className="glass">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No requests</TableCell></TableRow>
                ) : requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{format(new Date(r.created_at), "MMM dd, HH:mm")}</TableCell>
                    <TableCell className="font-medium">{(r as any).profiles?.full_name || "Unknown"}</TableCell>
                    <TableCell className="font-semibold">Rs. {r.amount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.note || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" className="text-success hover:text-success" onClick={() => processTopup(r.id, "approved", r.user_id, r.amount)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => processTopup(r.id, "rejected", r.user_id, r.amount)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
