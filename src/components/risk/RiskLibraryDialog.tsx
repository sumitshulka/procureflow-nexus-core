import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Library } from "lucide-react";

interface LibraryRisk {
  id: string;
  title: string;
  description: string;
  category_name: string;
  default_probability: number;
  default_impact: number;
  mitigation_strategy: string | null;
}

interface Category { id: string; name: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  existingTitles: Set<string>;
  onImported: () => void;
}

const RiskLibraryDialog = ({ open, onOpenChange, categories, existingTitles, onImported }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<LibraryRisk[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch("");
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("risk_library")
        .select("*")
        .eq("is_active", true)
        .order("category_name")
        .order("title");
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setItems((data as LibraryRisk[]) || []);
      }
      setLoading(false);
    })();
  }, [open, toast]);

  const categoryByName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => map.set(c.name.toLowerCase(), c.id));
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.category_name.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q)
    );
  }, [items, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const next = new Set(selected);
    filtered.forEach(i => { if (!existingTitles.has(i.title)) next.add(i.id); });
    setSelected(next);
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const rows = items
        .filter(i => selected.has(i.id))
        .map(i => ({
          title: i.title,
          description: i.description,
          category_id: categoryByName.get(i.category_name.toLowerCase()) || null,
          probability: i.default_probability,
          impact: i.default_impact,
          mitigation_strategy: i.mitigation_strategy,
          status: "Open",
          created_by: user.id,
          owner_id: user.id,
        }));

      const { error } = await supabase.from("risk_assessments").insert(rows);
      if (error) throw error;

      toast({ title: "Imported", description: `${rows.length} risks added to your register` });
      onOpenChange(false);
      onImported();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Library className="h-5 w-5" /> Industry Risk Library</DialogTitle>
          <DialogDescription>
            Curated procurement risks based on industry frameworks (CIPS, ISO 31000, CISA SCRM). Select the ones relevant to your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search library..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" size="sm" onClick={selectAllVisible}>Select all visible</Button>
        </div>

        <ScrollArea className="flex-1 min-h-0 border rounded-md">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading library...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No matching risks</div>
          ) : (
            <div className="divide-y">
              {filtered.map(i => {
                const already = existingTitles.has(i.title);
                const checked = selected.has(i.id);
                return (
                  <label key={i.id} className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 ${already ? "opacity-50" : ""}`}>
                    <Checkbox checked={checked} disabled={already} onCheckedChange={() => toggle(i.id)} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{i.title}</span>
                        <Badge variant="secondary">{i.category_name}</Badge>
                        <Badge variant="outline">P{i.default_probability} × I{i.default_impact} = {i.default_probability * i.default_impact}</Badge>
                        {already && <Badge variant="outline">Already in register</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{i.description}</p>
                      {i.mitigation_strategy && (
                        <p className="text-xs text-muted-foreground mt-1"><strong>Mitigation:</strong> {i.mitigation_strategy}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
              {importing ? "Importing..." : `Import ${selected.size} risk${selected.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RiskLibraryDialog;
