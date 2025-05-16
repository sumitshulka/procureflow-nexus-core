
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, MoreHorizontal, Pencil, Trash2, List } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface DepartmentData {
  id: string;
  name: string;
  description: string | null;
}

interface RoleData {
  id: string;
  name: string;
}

interface ApprovalLevel {
  id: string;
  departmentId: string;
  departmentName: string;
  level: number;
  roleId: string;
  roleName: string;
}

const approvalSchema = z.object({
  department: z.string().min(1, "Department is required"),
  level: z.coerce.number().int().positive("Level must be a positive number"),
  role: z.string().min(1, "Approver role is required"),
});

const ApprovalHierarchy = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<ApprovalLevel | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  
  const form = useForm({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      department: "",
      level: 1,
      role: "",
    },
  });
  
  const editForm = useForm({
    resolver: zodResolver(approvalSchema.omit({ department: true })),
    defaultValues: {
      level: 1,
      role: "",
    },
  });
  
  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, description");
      
      if (error) throw error;
      return data as DepartmentData[];
    },
  });
  
  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("custom_roles")
        .select("id, name");
      
      if (error) throw error;
      return data as RoleData[];
    },
  });
  
  // Fetch approval hierarchies
  const { data: approvalLevels = [], isLoading, refetch } = useQuery({
    queryKey: ["approval_hierarchies", selectedDepartment],
    queryFn: async () => {
      let query = supabase
        .from("approval_hierarchies")
        .select(`
          id, 
          department_id,
          approver_level,
          approver_role
        `);
        
      if (selectedDepartment) {
        query = query.eq('department_id', selectedDepartment);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get department names
      const departmentIds = [...new Set(data.map(level => level.department_id))];
      const { data: deptData } = await supabase
        .from("departments")
        .select("id, name")
        .in("id", departmentIds);
        
      const deptMap = deptData?.reduce((acc, dept) => {
        acc[dept.id] = dept.name;
        return acc;
      }, {} as Record<string, string>) || {};
      
      // Get role names
      const roleIds = [...new Set(data.map(level => level.approver_role))];
      const { data: roleData } = await (supabase as any)
        .from("custom_roles")
        .select("id, name")
        .in("id", roleIds);
        
      const roleMap = roleData?.reduce((acc, role) => {
        acc[role.id] = role.name;
        return acc;
      }, {} as Record<string, string>) || {};
      
      return data.map(level => ({
        id: level.id,
        departmentId: level.department_id,
        departmentName: deptMap[level.department_id] || "Unknown",
        level: level.approver_level,
        roleId: level.approver_role,
        roleName: roleMap[level.approver_role] || "Unknown",
      })) as ApprovalLevel[];
    },
    enabled: true,
  });
  
  // Add new approval level mutation
  const addApprovalMutation = useMutation({
    mutationFn: async (values: z.infer<typeof approvalSchema>) => {
      const { error } = await supabase
        .from("approval_hierarchies")
        .insert({
          department_id: values.department,
          approver_level: values.level,
          approver_role: values.role,
        });
        
      if (error) throw error;
      
      return values;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_hierarchies"] });
      toast({
        title: "Approval level added",
        description: "The approval level has been successfully created.",
      });
      setIsAddOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error adding approval level",
        description: error.message || "There was a problem creating the approval level.",
        variant: "destructive",
      });
    },
  });
  
  // Update approval level mutation
  const updateApprovalMutation = useMutation({
    mutationFn: async (values: { id: string, data: any }) => {
      const { error } = await supabase
        .from("approval_hierarchies")
        .update({
          approver_level: values.data.level,
          approver_role: values.data.role,
        })
        .eq("id", values.id);
        
      if (error) throw error;
      
      return values;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_hierarchies"] });
      toast({
        title: "Approval level updated",
        description: "The approval level has been successfully updated.",
      });
      setIsEditOpen(false);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error updating approval level",
        description: error.message || "There was a problem updating the approval level.",
        variant: "destructive",
      });
    },
  });
  
  // Delete approval level mutation
  const deleteApprovalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("approval_hierarchies")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval_hierarchies"] });
      toast({
        title: "Approval level deleted",
        description: "The approval level has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting approval level",
        description: error.message || "There was a problem deleting the approval level.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for new approval level
  const onSubmit = (values: z.infer<typeof approvalSchema>) => {
    addApprovalMutation.mutate(values);
  };
  
  // Handle form submission for editing approval level
  const onEditSubmit = (values: any) => {
    if (!currentLevel) return;
    
    updateApprovalMutation.mutate({
      id: currentLevel.id,
      data: values
    });
  };
  
  // Open edit dialog with approval level data
  const handleEditLevel = (level: ApprovalLevel) => {
    setCurrentLevel(level);
    editForm.reset({
      level: level.level,
      role: level.roleId,
    });
    setIsEditOpen(true);
  };
  
  // Handle delete approval level
  const handleDeleteLevel = (id: string) => {
    if (window.confirm("Are you sure you want to delete this approval level?")) {
      deleteApprovalMutation.mutate(id);
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Approval Hierarchy</CardTitle>
          <CardDescription>
            Configure department-wise approval workflow levels.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedDepartment || ""}
            onValueChange={(value) => setSelectedDepartment(value || null)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Level
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Approval Level</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approval Level</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approver Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      disabled={addApprovalMutation.isPending}
                    >
                      {addApprovalMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Level
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Approval Level</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                {currentLevel && (
                  <div className="text-sm text-muted-foreground mb-4">
                    Department: {currentLevel.departmentName}
                  </div>
                )}
                
                <FormField
                  control={editForm.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approval Level</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approver Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    disabled={updateApprovalMutation.isPending}
                  >
                    {updateApprovalMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Level
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
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Approver Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvalLevels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No approval levels found. Define workflow approval levels to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  approvalLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell>{level.departmentName}</TableCell>
                      <TableCell>{level.level}</TableCell>
                      <TableCell>{level.roleName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditLevel(level)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLevel(level.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default ApprovalHierarchy;
