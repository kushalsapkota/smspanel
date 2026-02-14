import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export function AdminSmsLogs() {
  const { currency } = useCurrency();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("sms_logs").select("*, profiles!sms_logs_user_id_fkey(full_name)")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setLogs(data || []));
  }, []);

  const statusColor = (s: string) => {
    if (s === "sent" || s === "queued") return "bg-success/10 text-success border-success/20";
    if (s === "failed") return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-warning/10 text-warning border-warning/20";
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">All SMS Logs</h1>
      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No SMS logs</TableCell></TableRow>
              ) : logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{format(new Date(log.created_at), "MMM dd, HH:mm")}</TableCell>
                  <TableCell className="font-medium">{(log as any).profiles?.full_name || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{log.recipient}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{log.message}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(log.cost, currency.symbol)}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColor(log.status)}>{log.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
