import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type ApproverType = "role" | "user";

interface LevelConfig {
  approverType: ApproverType;
  approverRole: string;          // custom_roles.id
  approverDepartmentId: string;  // "" = same as requester; else departments.id (only for role type)
  approverUserId: string;        // profiles.id (only for user type)
}

const emptyLevel = (): LevelConfig => ({
  approverType: "role",
  approverRole: "",
  approverDepartmentId: "",
  approverUserId: "",
});

const ApprovalHierarchy = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [levels, setLevels] = useState<LevelConfig[]>([emptyLevel(), emptyLevel(), emptyLevel()]);

  const { data: departments = [], isPending: deptLoading } = useQuery({
    queryKey: ["departments_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: roles = [], isPending: rolesLoading } = useQuery({
    queryKey: ["roles_for_approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: usersList = [], isPending: usersLoading } = useQuery({
    queryKey: ["profiles_for_approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, department_id")
        .eq("is_vendor", false)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: existing = [], isPending: existingLoading } = useQuery({
    queryKey: ["approval_hierarchies_global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_hierarchies")
        .select("*")
        .is("department_id", null)
        .order("approver_level", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const next: LevelConfig[] = [emptyLevel(), emptyLevel(), emptyLevel()];
    existing.forEach((row: any) => {
      const idx = (row.approver_level || 0) - 1;
      if (idx < 0 || idx > 2) return;
      if (row.approver_user_id) {
        next[idx] = {
          approverType: "user",
          approverRole: "",
          approverDepartmentId: "",
          approverUserId: row.approver_user_id,
        };
      } else if (row.approver_role) {
        next[idx] = {
          approverType: "role",
          approverRole: row.approver_role,
          approverDepartmentId: row.approver_department_id || "",
          approverUserId: "",
        };
      }
    });
    setLevels(next);
  }, [existing]);

  const updateLevel = (i: number, patch: Partial<LevelConfig>) => {
    setLevels((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const clearLevel = (i: number) => updateLevel(i, emptyLevel());

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Replace global rules
      const { error: delErr } = await supabase
        .from("approval_hierarchies")
        .delete()
        .is("department_id", null);
      if (delErr) throw delErr;

      const rows = levels
        .map((l, i) => {
          if (l.approverType === "role" && l.approverRole) {
            return {
              department_id: null,
              approver_level: i + 1,
              approver_role: l.approverRole,
              approver_user_id: null,
              approver_department_id: l.approverDepartmentId || null,
            };
          }
          if (l.approverType === "user" && l.approverUserId) {
            return {
              department_id: null,
              approver_level: i + 1,
              approver_role: null,
              approver_user_id: l.approverUserId,
              approver_department_id: null,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("approval_hierarchies").insert(rows as any);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_hierarchies_global"] });
      toast({ title: "Saved", description: "Approval hierarchy updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error saving settings", description: err.message, variant: "destructive" });
    },
  });

  if (deptLoading || rolesLoading || usersLoading || existingLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const renderLevelCard = (idx: number, title: string) => {
    const l = levels[idx];
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{title}</h4>
          <Button variant="ghost" size="sm" onClick={() => clearLevel(idx)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Approver Type</Label>
            <Select
              value={l.approverType}
              onValueChange={(v: ApproverType) =>
                updateLevel(idx, { approverType: v, approverRole: "", approverDepartmentId: "", approverUserId: "" })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="role">By Role</SelectItem>
                <SelectItem value="user">Specific User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {l.approverType === "role" ? (
            <>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={l.approverRole}
                  onValueChange={(v) => updateLevel(idx, { approverRole: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department Scope</Label>
                <Select
                  value={l.approverDepartmentId || "__any__"}
                  onValueChange={(v) =>
                    updateLevel(idx, { approverDepartmentId: v === "__any__" ? "" : v })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Same as requester" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Same as requester</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2 md:col-span-2">
              <Label>User</Label>
              <Select
                value={l.approverUserId}
                onValueChange={(v) => updateLevel(idx, { approverUserId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                <SelectContent>
                  {usersList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Procurement Approval Hierarchy</CardTitle>
        <CardDescription>
          Configure up to 3 approval levels that apply to procurement requests from any department.
          For each level, pick a specific user, or a role — optionally scoped to a specific department
          (e.g. L1: Same Dept Manager, L2: Procurement Manager, L3: Finance Head).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {renderLevelCard(0, "Level 1 Approver")}
          {renderLevelCard(1, "Level 2 Approver")}
          {renderLevelCard(2, "Level 3 Approver (Final)")}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalHierarchy;
