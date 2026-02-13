import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/formatters";

export function AdminTopups() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    console.log("[AdminTopups] Loading requests...");
    console.log("[AdminTopups] Current user:", user?.id);
    console.log("[AdminTopups] Admin status:", isAdmin);

    setLoading(true);
    setError(null);

    try {
      // First, get all topup requests
      const { data: requestsData, error: queryError } = await supabase
        .from("topup_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (queryError) {
        console.error("[AdminTopups] Query error:", queryError);
        setError(queryError.message);
        toast({
          title: "Error loading requests",
          description: queryError.message,
          variant: "destructive"
        });
        setRequests([]);
        setLoading(false);
        return;
      }

      // Then, get profiles for all users
      if (requestsData && requestsData.length > 0) {
        const userIds = [...new Set(requestsData.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        // Create a map of user_id -> full_name
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

        // Merge the data
        const mergedData = requestsData.map(request => ({
          ...request,
          profiles: { full_name: profileMap.get(request.user_id) || "Unknown" }
        }));

        console.log("[AdminTopups] Loaded requests:", mergedData.length);
        console.log("[AdminTopups] Data:", mergedData);
        setRequests(mergedData);
      } else {
        console.log("[AdminTopups] No requests found");
        setRequests([]);
      }
    } catch (err: any) {
      console.error("[AdminTopups] Unexpected error:", err);
      setError(err.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, isAdmin]);

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

      {!isAdmin && (
        <Alert className="mb-4 border-warning bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            You are not logged in as an admin. You won't be able to see all requests.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-4 border-destructive bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Error loading requests: {error}
          </AlertDescription>
        </Alert>
      )}

      <Card className="glass">
        <CardContent className="p-0">
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No requests</TableCell></TableRow>
              ) : requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{format(new Date(r.created_at), "MMM dd, HH:mm")}</TableCell>
                  <TableCell className="font-medium">{(r as any).profiles?.full_name || "Unknown"}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(r.amount)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
