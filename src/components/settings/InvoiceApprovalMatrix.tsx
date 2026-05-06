import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Users, DollarSign, ChevronRight } from "lucide-react";
import { getCurrencySymbol } from "@/utils/currencyUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ApprovalLevel {
  id: string;
  level_number: number;
  level_name: string;
  min_amount: number;
  max_amount: number | null;
  description: string | null;
  is_active: boolean;
}

interface MatrixItem {
  id: string;
  approval_level_id: string;
  department_id: string | null;
  approver_user_id: string | null;
  sequence_order: number;
  department_name?: string;
  user_name?: string;
}

interface Department { id: string; name: string; }
interface UserRow { id: string; full_name: string; department_id: string | null; }

const InvoiceApprovalMatrix = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [levels, setLevels] = useState<ApprovalLevel[]>([]);
  const [matrixItems, setMatrixItems] = useState<MatrixItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [expandedLevelId, setExpandedLevelId] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");

  const [newLevel, setNewLevel] = useState({
    level_name: "",
    min_amount: "",
    max_amount: "",
    description: "",
  });

  const [newMatrixItems, setNewMatrixItems] = useState<Record<string, {
    department_id: string;
    approver_user_id: string;
  }>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: orgData } = await supabase
        .from("organization_settings")
        .select("base_currency")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (orgData) {
        setBaseCurrency(orgData.base_currency || "USD");
        setCurrencySymbol(getCurrencySymbol(orgData.base_currency || "USD"));
      }

      const { data: levelsData, error: levelsError } = await supabase
        .from("invoice_approval_levels")
        .select("*")
        .order("level_number", { ascending: true });
      if (levelsError) throw levelsError;
      setLevels(levelsData || []);

      const { data: matrixData, error: matrixError } = await supabase
        .from("invoice_approval_matrix")
        .select(`*, departments(name), profiles(full_name)`)
        .order("sequence_order", { ascending: true });
      if (matrixError) throw matrixError;
      setMatrixItems((matrixData || []).map((item: any) => ({
        ...item,
        department_name: item.departments?.name,
        user_name: item.profiles?.full_name,
      })));

      const { data: deptData, error: deptError } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (deptError) throw deptError;
      setDepartments(deptData || []);

      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, department_id")
        .eq("is_vendor", false)
        .order("full_name");
      if (usersError) throw usersError;
      setUsers(usersData || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to fetch data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLevel = async () => {
    if (!newLevel.level_name || !newLevel.min_amount) {
      toast({ title: "Validation Error", description: "Level name and minimum amount are required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const nextLevelNumber = Math.max(0, ...levels.map(l => l.level_number)) + 1;
      const { error } = await supabase.from("invoice_approval_levels").insert({
        level_number: nextLevelNumber,
        level_name: newLevel.level_name,
        min_amount: parseFloat(newLevel.min_amount),
        max_amount: newLevel.max_amount ? parseFloat(newLevel.max_amount) : null,
        description: newLevel.description || null,
      });
      if (error) throw error;
      toast({ title: "Success", description: "Approval level added successfully" });
      setNewLevel({ level_name: "", min_amount: "", max_amount: "", description: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleDeleteLevel = async (levelId: string) => {
    if (!confirm("Delete this approval level and all associated approvers?")) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("invoice_approval_levels").delete().eq("id", levelId);
      if (error) throw error;
      toast({ title: "Success", description: "Approval level deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const updateMatrixItem = (levelId: string, field: string, value: string) => {
    setNewMatrixItems(prev => {
      const current = prev[levelId] || { department_id: "", approver_user_id: "" };
      const updated = { ...current, [field]: value };
      if (field === "department_id") updated.approver_user_id = "";
      return { ...prev, [levelId]: updated };
    });
  };

  const getFilteredUsers = (departmentId: string | undefined) => {
    if (!departmentId || departmentId === "" || departmentId === "any") return users;
    return users.filter(u => u.department_id === departmentId || u.department_id === null);
  };

  const handleAddApprover = async (levelId: string) => {
    const item = newMatrixItems[levelId];
    if (!item?.approver_user_id || item.approver_user_id === "any") {
      toast({ title: "Validation Error", description: "Please select an approver", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const maxSeq = Math.max(0, ...matrixItems.filter(m => m.approval_level_id === levelId).map(m => m.sequence_order));
      const normalizedDept = !item.department_id || item.department_id === "any" ? null : item.department_id;
      const { error } = await supabase.from("invoice_approval_matrix").insert([{
        approval_level_id: levelId,
        department_id: normalizedDept,
        approver_user_id: item.approver_user_id,
        sequence_order: maxSeq + 1,
      }]);
      if (error) throw error;
      toast({ title: "Success", description: "Approver added successfully" });
      setNewMatrixItems(prev => ({ ...prev, [levelId]: { department_id: "", approver_user_id: "" } }));
      setExpandedLevelId(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleDeleteApprover = async (matrixId: string) => {
    if (!confirm("Remove this approver?")) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("invoice_approval_matrix").delete().eq("id", matrixId);
      if (error) throw error;
      toast({ title: "Success", description: "Approver removed" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configure Invoice Approval Levels
          </CardTitle>
          <CardDescription>
            Define approval levels based on invoice amount thresholds (in {baseCurrency}).
            Invoices in other currencies will be converted to {baseCurrency} for approval matching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Level Name</Label>
              <Input className="mt-2" value={newLevel.level_name} onChange={(e) => setNewLevel({ ...newLevel, level_name: e.target.value })} placeholder="e.g., Manager Approval" />
            </div>
            <div>
              <Label>Min Amount</Label>
              <Input className="mt-2" type="number" value={newLevel.min_amount} onChange={(e) => setNewLevel({ ...newLevel, min_amount: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>Max Amount (Optional)</Label>
              <Input className="mt-2" type="number" value={newLevel.max_amount} onChange={(e) => setNewLevel({ ...newLevel, max_amount: e.target.value })} placeholder="Leave empty for unlimited" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddLevel} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Level
              </Button>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-2" rows={2} value={newLevel.description} onChange={(e) => setNewLevel({ ...newLevel, description: e.target.value })} placeholder="Describe when this level applies..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval Levels Overview</CardTitle>
          <CardDescription>Configured invoice approval levels and their approvers</CardDescription>
        </CardHeader>
        <CardContent>
          {levels.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No approval levels configured yet. Add your first level above.</p>
          ) : (
            <div className="space-y-4">
              {levels.map((level, index) => (
                <div key={level.id} className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">
                          {level.level_number}
                        </span>
                        <h3 className="font-semibold text-lg">{level.level_name}</h3>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {currencySymbol}{level.min_amount.toLocaleString()}
                          {level.max_amount ? ` - ${currencySymbol}${level.max_amount.toLocaleString()}` : " and above"}
                        </span>
                      </div>
                      {level.description && <p className="mt-2 text-sm text-muted-foreground">{level.description}</p>}

                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">Approvers</Label>
                          {expandedLevelId !== level.id && (
                            <Button variant="outline" size="sm" onClick={() => {
                              setExpandedLevelId(level.id);
                              if (!newMatrixItems[level.id]) {
                                setNewMatrixItems(prev => ({ ...prev, [level.id]: { department_id: "", approver_user_id: "" } }));
                              }
                            }}>
                              <Plus className="h-3 w-3 mr-1" /> Add Approver
                            </Button>
                          )}
                        </div>

                        {expandedLevelId === level.id && (
                          <div className="mb-3 p-3 border rounded-lg bg-background space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Department (Optional)</Label>
                                <Select value={newMatrixItems[level.id]?.department_id || ""} onValueChange={(v) => updateMatrixItem(level.id, "department_id", v)}>
                                  <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select department" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any Department</SelectItem>
                                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Approver *</Label>
                                <Select value={newMatrixItems[level.id]?.approver_user_id || ""} onValueChange={(v) => updateMatrixItem(level.id, "approver_user_id", v)}>
                                  <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select approver" /></SelectTrigger>
                                  <SelectContent>
                                    {getFilteredUsers(newMatrixItems[level.id]?.department_id).length === 0 ? (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No users in selected department</div>
                                    ) : (
                                      getFilteredUsers(newMatrixItems[level.id]?.department_id).map((u) => (
                                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setExpandedLevelId(null);
                                setNewMatrixItems(prev => ({ ...prev, [level.id]: { department_id: "", approver_user_id: "" } }));
                              }}>Cancel</Button>
                              <Button size="sm" onClick={() => handleAddApprover(level.id)} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                                Add
                              </Button>
                            </div>
                          </div>
                        )}

                        {matrixItems.filter(m => m.approval_level_id === level.id).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No approvers assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {matrixItems.filter(m => m.approval_level_id === level.id).map((item) => (
                              <div key={item.id} className="flex items-center justify-between bg-background p-2 rounded border">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{item.user_name}</span>
                                  {item.department_name && <span className="text-xs text-muted-foreground">({item.department_name})</span>}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteApprover(item.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteLevel(level.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {index < levels.length - 1 && (
                    <div className="flex justify-center mt-4">
                      <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceApprovalMatrix;
