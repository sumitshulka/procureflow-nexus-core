import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const InvoiceApprovalMatrix = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);

  // Form state
  const [levelNumber, setLevelNumber] = useState("");
  const [levelName, setLevelName] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: approvalLevels, isLoading } = useQuery({
    queryKey: ["invoice-approval-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_approval_levels")
        .select("*")
        .order("level_number");
      
      if (error) throw error;
      return data;
    },
  });

  const createLevelMutation = useMutation({
    mutationFn: async (levelData: any) => {
      if (editingLevel) {
        const { error } = await supabase
          .from("invoice_approval_levels")
          .update(levelData)
          .eq("id", editingLevel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("invoice_approval_levels")
          .insert(levelData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Approval level ${editingLevel ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["invoice-approval-levels"] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLevelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoice_approval_levels")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Approval level deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["invoice-approval-levels"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setLevelNumber("");
    setLevelName("");
    setMinAmount("");
    setMaxAmount("");
    setDescription("");
    setEditingLevel(null);
  };

  const handleEdit = (level: any) => {
    setEditingLevel(level);
    setLevelNumber(level.level_number.toString());
    setLevelName(level.level_name);
    setMinAmount(level.min_amount.toString());
    setMaxAmount(level.max_amount?.toString() || "");
    setDescription(level.description || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const levelData = {
      level_number: parseInt(levelNumber),
      level_name: levelName,
      min_amount: parseFloat(minAmount),
      max_amount: maxAmount ? parseFloat(maxAmount) : null,
      description,
      is_active: true,
    };

    createLevelMutation.mutate(levelData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Invoice Approval Levels</CardTitle>
            <CardDescription>
              Configure approval levels based on invoice amounts
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Level
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingLevel ? "Edit" : "Add"} Approval Level
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Level Number *</Label>
                  <Input
                    type="number"
                    value={levelNumber}
                    onChange={(e) => setLevelNumber(e.target.value)}
                    placeholder="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Level Name *</Label>
                  <Input
                    value={levelName}
                    onChange={(e) => setLevelName(e.target.value)}
                    placeholder="e.g., Manager Approval"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={createLevelMutation.isPending}
                  className="w-full"
                >
                  {editingLevel ? "Update" : "Create"} Level
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : approvalLevels && approvalLevels.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Min Amount</TableHead>
                <TableHead>Max Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvalLevels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell className="font-medium">{level.level_number}</TableCell>
                  <TableCell>{level.level_name}</TableCell>
                  <TableCell>${level.min_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    {level.max_amount ? `$${level.max_amount.toLocaleString()}` : "Unlimited"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={level.is_active ? "default" : "secondary"}>
                      {level.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(level)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLevelMutation.mutate(level.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No approval levels configured. Add your first level to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceApprovalMatrix;
