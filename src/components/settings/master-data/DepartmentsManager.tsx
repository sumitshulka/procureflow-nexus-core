
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Department schema for form validation
const departmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

interface DepartmentData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const DepartmentsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentDept, setCurrentDept] = useState<DepartmentData | null>(null);
  
  // Form setup for creating new departments
  const form = useForm({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  // Form setup for editing departments
  const editForm = useForm({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  // Fetch departments
  const { data: departments = [], isLoading, error } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as DepartmentData[];
    },
  });
  
  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (values: z.infer<typeof departmentSchema>) => {
      const { data, error } = await supabase
        .from("departments")
        .insert({
          name: values.name,
          description: values.description || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({
        title: "Department created",
        description: "The department has been successfully created.",
      });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error creating department",
        description: error.message || "There was a problem creating the department.",
        variant: "destructive",
      });
    },
  });
  
  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: z.infer<typeof departmentSchema> }) => {
      const { error } = await supabase
        .from("departments")
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq("id", id);
      
      if (error) throw error;
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({
        title: "Department updated",
        description: "The department has been successfully updated.",
      });
      setIsEditOpen(false);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error updating department",
        description: error.message || "There was a problem updating the department.",
        variant: "destructive",
      });
    },
  });
  
  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({
        title: "Department deleted",
        description: "The department has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting department",
        description: error.message || "There was a problem deleting the department.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for new department
  const onSubmit = (values: z.infer<typeof departmentSchema>) => {
    createDepartmentMutation.mutate(values);
  };
  
  // Handle form submission for editing department
  const onEditSubmit = (values: z.infer<typeof departmentSchema>) => {
    if (!currentDept) return;
    
    updateDepartmentMutation.mutate({
      id: currentDept.id,
      data: values,
    });
  };
  
  // Open edit dialog with department data
  const handleEditDepartment = (dept: DepartmentData) => {
    setCurrentDept(dept);
    editForm.reset({
      name: dept.name,
      description: dept.description || "",
    });
    setIsEditOpen(true);
  };
  
  // Handle delete department
  const handleDeleteDepartment = (id: string) => {
    if (window.confirm("Are you sure you want to delete this department? This may affect users assigned to this department.")) {
      deleteDepartmentMutation.mutate(id);
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Manage organization departments.</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Department name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Department description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={createDepartmentMutation.isPending}
                  >
                    {createDepartmentMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Department
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Department name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Department description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={updateDepartmentMutation.isPending}
                  >
                    {updateDepartmentMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Department
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            Error loading departments. Please try again.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      No departments found. Create your first department to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="hidden sm:table-cell max-w-md truncate">
                        {dept.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditDepartment(dept)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit Department
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteDepartment(dept.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Department
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DepartmentsManager;
