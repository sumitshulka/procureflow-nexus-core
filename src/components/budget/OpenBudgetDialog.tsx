import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OpenBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  cycleName: string;
  currentStatus?: string;
  currentDepartmentIds?: string[] | null;
}

const OpenBudgetDialog = ({
  open,
  onOpenChange,
  cycleId,
  cycleName,
  currentStatus = 'draft',
  currentDepartmentIds = null,
}: OpenBudgetDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accessType, setAccessType] = useState<"all" | "selected">(
    currentDepartmentIds && currentDepartmentIds.length > 0 ? "selected" : "all"
  );
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    currentDepartmentIds || []
  );

  // Update state when props change
  React.useEffect(() => {
    if (open) {
      setAccessType(currentDepartmentIds && currentDepartmentIds.length > 0 ? "selected" : "all");
      setSelectedDepartments(currentDepartmentIds || []);
    }
  }, [open, currentDepartmentIds]);

  const isEditMode = currentStatus === 'open';

  // Fetch all active departments
  const { data: departments, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ["departments-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Check if budget heads exist
  const { data: budgetHeads, isLoading: isLoadingHeads } = useQuery({
    queryKey: ["budget-heads-check"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_heads")
        .select("id")
        .eq("is_active", true)
        .limit(1);

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const openBudgetMutation = useMutation({
    mutationFn: async () => {
      // Validate budget heads exist
      if (!budgetHeads || budgetHeads.length === 0) {
        throw new Error("Cannot open budget cycle. Please set up budget heads first.");
      }

      // Validate department selection
      if (accessType === "selected" && selectedDepartments.length === 0) {
        throw new Error("Please select at least one department.");
      }

      // Prepare update data
      const updateData: any = {
        status: isEditMode ? currentStatus : "open",
        allowed_department_ids: accessType === "all" ? null : selectedDepartments,
      };

      const { data, error } = await supabase
        .from("budget_cycles")
        .update(updateData)
        .eq("id", cycleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-cycles"] });
      const departmentMessage =
        accessType === "all"
          ? "All departments"
          : `${selectedDepartments.length} selected department(s)`;
      toast({
        title: isEditMode ? "Departments updated" : "Budget cycle opened",
        description: isEditMode 
          ? `${cycleName} is now accessible to ${departmentMessage}.`
          : `${cycleName} is now open for ${departmentMessage} to submit budgets.`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Cannot open budget cycle",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDepartmentToggle = (departmentId: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const handleSelectAll = () => {
    if (departments) {
      setSelectedDepartments(departments.map((d) => d.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedDepartments([]);
  };

  const handleSubmit = () => {
    openBudgetMutation.mutate();
  };

  const handleCancel = () => {
    onOpenChange(false);
    setAccessType("all");
    setSelectedDepartments([]);
  };

  const isLoading = isLoadingDepartments || isLoadingHeads;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Manage Departments" : "Open Budget Cycle"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? `Update which departments can submit budgets for "${cycleName}"`
              : `Choose which departments can submit budgets for "${cycleName}"`
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {!isEditMode && (!budgetHeads || budgetHeads.length === 0) && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                ⚠️ No budget heads are set up. Please configure budget heads before opening this cycle.
              </div>
            )}

            <RadioGroup value={accessType} onValueChange={(value: any) => setAccessType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  Open to all departments
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected" />
                <Label htmlFor="selected" className="font-normal cursor-pointer">
                  Select specific departments
                </Label>
              </div>
            </RadioGroup>

            {accessType === "selected" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Departments</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={!departments || departments.length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                {departments && departments.length > 0 ? (
                  <ScrollArea className="h-[200px] rounded-md border p-3">
                    <div className="space-y-2">
                      {departments.map((department) => (
                        <div key={department.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dept-${department.id}`}
                            checked={selectedDepartments.includes(department.id)}
                            onCheckedChange={() => handleDepartmentToggle(department.id)}
                          />
                          <Label
                            htmlFor={`dept-${department.id}`}
                            className="font-normal cursor-pointer"
                          >
                            {department.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No departments found. Please create departments first.
                  </div>
                )}

                {selectedDepartments.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {selectedDepartments.length} department(s) selected
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              openBudgetMutation.isPending ||
              isLoading ||
              (!isEditMode && (!budgetHeads || budgetHeads.length === 0)) ||
              (accessType === "selected" && selectedDepartments.length === 0)
            }
          >
            {openBudgetMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditMode ? "Update Departments" : "Open Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpenBudgetDialog;
