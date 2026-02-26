import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 100;

export function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Notes dialog state
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesUser, setNotesUser] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => { fetchUsers(page); }, [page]);

  const fetchUsers = async (currentPage: number) => {
    setLoading(true);
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    setUsers(data || []);
    if (count !== null) setTotalCount(count);
    setLoading(false);
  };

  const openNotes = async (u: any) => {
    setNotesUser(u);
    setNotesOpen(true);
    setNewNote("");
    const { data } = await supabase
      .from("user_notes" as any)
      .select("*")
      .eq("user_id", u.user_id)
      .order("created_at", { ascending: false });
    setNotes(data || []);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from("user_notes" as any).insert({
      user_id: notesUser.user_id,
      note: newNote.trim(),
      created_by: user?.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Note added" });
      setNewNote("");
      const { data } = await supabase.from("user_notes" as any).select("*").eq("user_id", notesUser.user_id).order("created_at", { ascending: false });
      setNotes(data || []);
    }
    setSavingNote(false);
  };

  const deleteNote = async (id: string) => {
    await supabase.from("user_notes" as any).delete().eq("id", id);
    setNotes((prev) => prev.filter((n: any) => n.id !== id));
    toast({ title: "Note deleted" });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <span className="text-sm text-muted-foreground">Total: {totalCount.toLocaleString()} users</span>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Rate/SMS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
              ) : users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>Rs. {u.balance}</TableCell>
                  <TableCell>Rs. {u.rate_per_sms}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={u.is_active ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(u.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openNotes(u)} title="View/add notes">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages} · Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Notes Dialog */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Notes — {notesUser?.full_name || "User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add new note */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a note about this user..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button onClick={addNote} disabled={savingNote || !newNote.trim()} className="self-end">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Notes list */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
              ) : notes.map((n: any) => (
                <div key={n.id} className="flex items-start gap-2 rounded-lg border border-border bg-accent/20 p-3">
                  <div className="flex-1">
                    <p className="text-sm">{n.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM dd, yyyy HH:mm")}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => deleteNote(n.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
