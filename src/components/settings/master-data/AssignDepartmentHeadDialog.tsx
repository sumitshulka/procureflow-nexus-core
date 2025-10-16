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
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface AssignDepartmentHeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  departmentName: string;
  currentHeadId?: string | null;
}

interface DepartmentHead {
  id: string;
  full_name: string;
}

const AssignDepartmentHeadDialog = ({
  open,
  onOpenChange,
  departmentId,
  departmentName,
  currentHeadId,
}: AssignDepartmentHeadDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedHeadId, setSelectedHeadId] = useState<string>(currentHeadId || "");

  // Fetch users with department_head role
  const { data: departmentHeads = [], isLoading: isLoadingHeads } = useQuery({
    queryKey: ["department-heads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles!inner(id, full_name)")
        .eq("role", "department_head");

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.profiles.id,
        full_name: item.profiles.full_name,
      })) as DepartmentHead[];
    },
    enabled: open,
  });

  // Assign department head mutation
  const assignHeadMutation = useMutation({
    mutationFn: async (headId: string | null) => {
      const { error } = await supabase
        .from("departments")
        .update({ head_of_department_id: headId })
        .eq("id", departmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({
        title: "Department head assigned",
        description: `Department head has been successfully ${
          selectedHeadId ? "assigned" : "removed"
        }.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error assigning department head",
        description: error.message || "There was a problem assigning the department head.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    assignHeadMutation.mutate(selectedHeadId || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Department Head</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Department</Label>
            <div className="text-sm font-medium">{departmentName}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="head-select">Select Department Head</Label>
            {isLoadingHeads ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : departmentHeads.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                No users with Department Head role found. Please assign the Department Head
                role to users first.
              </div>
            ) : (
              <Select value={selectedHeadId} onValueChange={setSelectedHeadId}>
                <SelectTrigger id="head-select">
                  <SelectValue placeholder="Select a department head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Remove assignment)</SelectItem>
                  {departmentHeads.map((head) => (
                    <SelectItem key={head.id} value={head.id}>
                      {head.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={assignHeadMutation.isPending || departmentHeads.length === 0}
          >
            {assignHeadMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Assign Head
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDepartmentHeadDialog;
