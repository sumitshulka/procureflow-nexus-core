
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProductClassification {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClassificationFormData {
  name: string;
  description: string;
}

const ProductClassificationsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClassification, setEditingClassification] = useState<ProductClassification | null>(null);
  const [formData, setFormData] = useState<ClassificationFormData>({
    name: "",
    description: "",
  });

  // Fetch classifications
  const { data: classifications = [], isLoading } = useQuery({
    queryKey: ["product_classifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_classifications")
        .select("*")
        .order("name");

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch product classifications",
          variant: "destructive",
        });
        throw error;
      }

      return data as ProductClassification[];
    },
  });

  // Create classification mutation
  const createMutation = useMutation({
    mutationFn: async (data: ClassificationFormData) => {
      const { error } = await supabase
        .from("product_classifications")
        .insert([{
          name: data.name,
          description: data.description || null,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_classifications"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Product classification created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create classification",
        variant: "destructive",
      });
    },
  });

  // Update classification mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClassificationFormData }) => {
      const { error } = await supabase
        .from("product_classifications")
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_classifications"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Product classification updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update classification",
        variant: "destructive",
      });
    },
  });

  // Delete classification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_classifications")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_classifications"] });
      toast({
        title: "Success",
        description: "Product classification deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate classification",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingClassification(null);
  };

  const handleOpenDialog = (classification?: ProductClassification) => {
    if (classification) {
      setEditingClassification(classification);
      setFormData({
        name: classification.name,
        description: classification.description || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Classification name is required",
        variant: "destructive",
      });
      return;
    }

    if (editingClassification) {
      updateMutation.mutate({ id: editingClassification.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading classifications...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Product Classifications</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Classification
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClassification ? "Edit Classification" : "Add New Classification"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter classification name"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter classification description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingClassification ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classifications.map((classification) => (
              <TableRow key={classification.id}>
                <TableCell className="font-medium">{classification.name}</TableCell>
                <TableCell>{classification.description || "—"}</TableCell>
                <TableCell>
                  <Badge variant={classification.is_active ? "default" : "secondary"}>
                    {classification.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(classification.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(classification)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {classification.is_active && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deactivate Classification</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to deactivate "{classification.name}"? 
                              This will hide it from new product assignments.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(classification.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Deactivate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {classifications.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No product classifications found. Create your first classification to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductClassificationsManager;
