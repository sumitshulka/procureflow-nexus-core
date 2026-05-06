import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const NONE = "_none";

const ApprovalHierarchy = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [departmentId, setDepartmentId] = useState<string>("");
  const [level1, setLevel1] = useState<string>(NONE);
  const [level2, setLevel2] = useState<string>(NONE);
  const [level3, setLevel3] = useState<string>(NONE);

  const { data: departments = [], isPending: deptLoading } = useQuery({
    queryKey: ["departments_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: roles = [], isPending: rolesLoading } = useQuery({
    queryKey: ["roles_for_approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: hierarchies = [], isPending: hLoading } = useQuery({
    queryKey: ["approval_hierarchies", departmentId],
    enabled: !!departmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_hierarchies")
        .select("*")
        .eq("department_id", departmentId)
        .order("approver_level", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const l1 = hierarchies.find((h: any) => h.approver_level === 1)?.approver_role || NONE;
    const l2 = hierarchies.find((h: any) => h.approver_level === 2)?.approver_role || NONE;
    const l3 = hierarchies.find((h: any) => h.approver_level === 3)?.approver_role || NONE;
    setLevel1(l1);
    setLevel2(l2);
    setLevel3(l3);
  }, [hierarchies, departmentId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!departmentId) throw new Error("Please select a department first");

      // Replace existing rows for this department
      const { error: delErr } = await supabase
        .from("approval_hierarchies")
        .delete()
        .eq("department_id", departmentId);
      if (delErr) throw delErr;

      const rows: any[] = [];
      if (level1 && level1 !== NONE) rows.push({ department_id: departmentId, approver_level: 1, approver_role: level1 });
      if (level2 && level2 !== NONE) rows.push({ department_id: departmentId, approver_level: 2, approver_role: level2 });
      if (level3 && level3 !== NONE) rows.push({ department_id: departmentId, approver_level: 3, approver_role: level3 });

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("approval_hierarchies").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_hierarchies", departmentId] });
      toast({ title: "Saved", description: "Approval hierarchy updated for this department." });
    },
    onError: (err: any) => {
      toast({
        title: "Error saving settings",
        description: err.message || "There was a problem updating the approval hierarchy.",
        variant: "destructive",
      });
    },
  });

  const renderRoleSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={!departmentId}>
        <SelectTrigger>
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None (Skip this level)</SelectItem>
          {roles.map((r: any) => (
            <SelectItem key={r.id} value={r.id}>{r.name || "Unnamed Role"}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (deptLoading || rolesLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Procurement Approval Hierarchy</CardTitle>
        <CardDescription>
          Configure up to 3 approval levels per department for procurement requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Department *</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {departmentId && hLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {renderRoleSelect(level1, setLevel1, "Level 1 Approver")}
            {renderRoleSelect(level2, setLevel2, "Level 2 Approver")}
            {renderRoleSelect(level3, setLevel3, "Level 3 Approver (Final)")}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!departmentId || saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalHierarchy;
