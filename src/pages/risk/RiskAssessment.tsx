import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, Search, Edit, Trash2, Library, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import RiskFormDialog, { RiskFormValues } from "@/components/risk/RiskFormDialog";
import RiskLibraryDialog from "@/components/risk/RiskLibraryDialog";

interface RiskCategory { id: string; name: string; color: string; }
interface RiskAssessmentRow {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  probability: number;
  impact: number;
  risk_score: number;
  risk_level: string;
  mitigation_strategy: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
  category?: RiskCategory;
}

const RiskAssessment = () => {
  const { toast } = useToast();
  const [risks, setRisks] = useState<RiskAssessmentRow[]>([]);
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RiskAssessmentRow | null>(null);
  const [deleting, setDeleting] = useState<RiskAssessmentRow | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [catRes, riskRes] = await Promise.all([
        supabase.from("risk_categories").select("*").eq("is_active", true).order("name"),
        supabase.from("risk_assessments").select("*, category:risk_categories(id, name, color)").order("created_at", { ascending: false }),
      ]);
      if (catRes.error) throw catRes.error;
      if (riskRes.error) throw riskRes.error;
      setCategories(catRes.data || []);
      setRisks((riskRes.data as any) || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return risks.filter(r => {
      if (q && !r.title.toLowerCase().includes(q) && !(r.description || "").toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && r.category_id !== categoryFilter) return false;
      if (riskLevelFilter !== "all" && r.risk_level !== riskLevelFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [risks, searchTerm, categoryFilter, riskLevelFilter, statusFilter]);

  const existingTitles = useMemo(() => new Set(risks.map(r => r.title)), [risks]);

  const getRiskLevelColor = (level: string): "destructive" | "secondary" | "outline" => {
    if (level === "Critical" || level === "High") return "destructive";
    if (level === "Medium") return "secondary";
    return "outline";
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("risk_assessments").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated" });
      fetchAll();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("risk_assessments").delete().eq("id", deleting.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Risk deleted" });
      setDeleting(null);
      fetchAll();
    }
  };

  const initialFormValues: Partial<RiskFormValues> | null = editing ? {
    id: editing.id,
    title: editing.title,
    description: editing.description || "",
    category_id: editing.category_id || "",
    probability: editing.probability,
    impact: editing.impact,
    status: editing.status,
    mitigation_strategy: editing.mitigation_strategy || "",
    due_date: editing.due_date || "",
  } : null;

  if (isLoading) return <div className="container mx-auto py-6">Loading...</div>;

  const counts = {
    total: risks.length,
    critical: risks.filter(r => r.risk_level === "Critical" || r.risk_level === "High").length,
    medium: risks.filter(r => r.risk_level === "Medium").length,
    low: risks.filter(r => r.risk_level === "Low").length,
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold">Risk Assessment</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLibraryOpen(true)}>
            <Library className="h-4 w-4 mr-2" /> Add from Library
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Risk
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[
          { label: "Total Risks", value: counts.total, icon: AlertTriangle, color: "text-muted-foreground" },
          { label: "Critical/High", value: counts.critical, icon: AlertTriangle, color: "text-red-500" },
          { label: "Medium", value: counts.medium, icon: AlertTriangle, color: "text-yellow-500" },
          { label: "Low", value: counts.low, icon: ShieldCheck, color: "text-green-500" },
        ].map((c, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search risks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Mitigating">Mitigating</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No risks match your filters.</p>
              <p className="text-sm text-muted-foreground mt-2">Use "Add from Library" to import industry-standard procurement risks.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(risk => (
            <Card key={risk.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{risk.title}</h3>
                      <Badge variant={getRiskLevelColor(risk.risk_level)}>{risk.risk_level}</Badge>
                      <Badge variant="outline">Score: {risk.risk_score}</Badge>
                      {risk.category && <Badge variant="secondary">{risk.category.name}</Badge>}
                    </div>
                    {risk.description && <p className="text-sm text-muted-foreground">{risk.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={risk.status} onValueChange={v => handleStatusChange(risk.id, v)}>
                      <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Mitigating">Mitigating</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Accepted">Accepted</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(risk); setFormOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(risk)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="font-medium">Probability:</span> {risk.probability}/5</div>
                  <div><span className="font-medium">Impact:</span> {risk.impact}/5</div>
                  {risk.due_date && <div><span className="font-medium">Due:</span> {format(new Date(risk.due_date), "PP")}</div>}
                  <div><span className="font-medium">Created:</span> {format(new Date(risk.created_at), "PP")}</div>
                </div>
                {risk.mitigation_strategy && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <span className="text-sm font-medium">Mitigation Strategy:</span>
                    <p className="text-sm text-muted-foreground mt-1">{risk.mitigation_strategy}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <RiskFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        initial={initialFormValues}
        categories={categories}
        onSaved={fetchAll}
      />

      <RiskLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        categories={categories}
        existingTitles={existingTitles}
        onImported={fetchAll}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this risk?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will be permanently removed along with its metric history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RiskAssessment;
