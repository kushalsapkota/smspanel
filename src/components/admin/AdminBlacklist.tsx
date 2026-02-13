import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminBlacklist() {
  const { toast } = useToast();
  const [words, setWords] = useState<any[]>([]);
  const [newWord, setNewWord] = useState("");

  const load = async () => {
    const { data } = await supabase.from("blacklist_words").select("*").order("created_at", { ascending: false });
    setWords(data || []);
  };

  useEffect(() => { load(); }, []);

  const addWord = async () => {
    if (!newWord.trim()) return;
    const { error } = await supabase.from("blacklist_words").insert({ word: newWord.trim().toLowerCase() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Added", description: `"${newWord}" added to blacklist.` });
    setNewWord("");
    load();
  };

  const removeWord = async (id: string) => {
    await supabase.from("blacklist_words").delete().eq("id", id);
    toast({ title: "Removed" });
    load();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Blacklist Words</h1>
      <Card className="glass mb-6">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Ban className="h-5 w-5 text-destructive" /> Add Word</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Enter word to block..." value={newWord} onChange={(e) => setNewWord(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWord()} />
            <Button onClick={addWord} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
      <Card className="glass">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Word</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {words.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">No blocked words</TableCell></TableRow>
              ) : words.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono">{w.word}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="hover:text-destructive" onClick={() => removeWord(w.id)}><Trash2 className="h-4 w-4" /></Button>
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
