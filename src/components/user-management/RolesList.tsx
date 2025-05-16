
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Check, X } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Json } from "@/integrations/supabase/types";

// Role schema for form validation
const roleSchema = z.object({
  name: z.string().min(3, "Role name must be at least 3 characters"),
  description: z.string().optional(),
});

// Custom role interface
interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

// Role permission interface
interface RolePermission {
  id: string;
  role_id: string;
  module_id: string;
  permission: string;
  created_at: string;
}

// Module interface
interface Module {
  id: string;
  name: string;
  description: string;
}

// Available permissions
const permissions = [
  { id: "view", name: "View" },
  { id: "create", name: "Create" },
  { id: "modify", name: "Modify" },
  { id: "delete", name: "Delete" },
  { id: "full_control", name: "Full Control" },
];

// Available modules
const modules = [
  { id: "dashboard", name: "Dashboard", description: "Main system dashboard" },
  { id: "users", name: "User Management", description: "Manage system users" },
  { id: "products", name: "Product Catalog", description: "Manage product catalog" },
  { id: "procurement", name: "Procurement", description: "Handle procurement requests" },
  { id: "settings", name: "Settings", description: "System configuration and settings" },
];

const RolesList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<CustomRole | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, string[]>>>({});
  
  // Form setup for creating/editing roles
  const form = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  // Fetch custom roles
  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      // Use any type to bypass TypeScript checking for tables that aren't in the generated types
      const { data, error } = await (supabase as any)
        .from("custom_roles")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data || [];
    }
  });
  
  // Effect to fetch permissions for roles when they are loaded
  useEffect(() => {
    // For each role, fetch its permissions
    roles.forEach(role => {
      fetchRolePermissions(role.id);
    });
  }, [roles]);
  
  // Fetch permissions for a specific role
  const fetchRolePermissions = async (roleId: string) => {
    // Use any type to bypass TypeScript checking
    const { data, error } = await (supabase as any)
      .from("role_permissions")
      .select("*")
      .eq("role_id", roleId);
      
    if (error) {
      console.error("Error fetching role permissions:", error);
      return;
    }
    
    // Group permissions by module
    const permissionsByModule: Record<string, string[]> = {};
    
    if (data) {
      data.forEach((item: RolePermission) => {
        if (!permissionsByModule[item.module_id]) {
          permissionsByModule[item.module_id] = [];
        }
        permissionsByModule[item.module_id].push(item.permission);
      });
    }
    
    setRolePermissions(prev => ({
      ...prev,
      [roleId]: permissionsByModule
    }));
  };
  
  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (values: z.infer<typeof roleSchema>) => {
      // Use any type to bypass TypeScript checking
      const { data, error } = await (supabase as any)
        .from("custom_roles")
        .insert({
          name: values.name,
          description: values.description || null,
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["custom_roles"] });
        setRolePermissions(prev => ({
          ...prev,
          [data.id]: {}
        }));
        toast({
          title: "Role created",
          description: "The role has been successfully created.",
        });
        setIsCreateOpen(false);
        form.reset();
      }
    },
    onError: (error) => {
      toast({
        title: "Error creating role",
        description: error.message || "There was a problem creating the role.",
        variant: "destructive",
      });
    },
  });
  
  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: z.infer<typeof roleSchema> }) => {
      // Use any type to bypass TypeScript checking
      const { error } = await (supabase as any)
        .from("custom_roles")
        .update({
          name: values.name,
          description: values.description || null,
        })
        .eq("id", id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_roles"] });
      toast({
        title: "Role updated",
        description: "The role has been successfully updated.",
      });
      setIsEditOpen(false);
      setCurrentRole(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error updating role",
        description: error.message || "There was a problem updating the role.",
        variant: "destructive",
      });
    },
  });
  
  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, moduleId, permission, isActive }: { 
      roleId: string;
      moduleId: string;
      permission: string;
      isActive: boolean;
    }) => {
      if (isActive) {
        // Add permission - using any type to bypass TypeScript checking
        const { error } = await (supabase as any)
          .from("role_permissions")
          .insert({
            role_id: roleId,
            module_id: moduleId,
            permission,
          });
          
        if (error) throw error;
      } else {
        // Remove permission - using any type to bypass TypeScript checking
        const { error } = await (supabase as any)
          .from("role_permissions")
          .delete()
          .eq("role_id", roleId)
          .eq("module_id", moduleId)
          .eq("permission", permission);
          
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      const { roleId, moduleId, permission, isActive } = variables;
      
      // Update local state
      setRolePermissions(prev => {
        const updatedPermissions = { ...prev };
        
        if (!updatedPermissions[roleId]) {
          updatedPermissions[roleId] = {};
        }
        
        if (!updatedPermissions[roleId][moduleId]) {
          updatedPermissions[roleId][moduleId] = [];
        }
        
        if (isActive) {
          // Permission was added
          if (!updatedPermissions[roleId][moduleId].includes(permission)) {
            updatedPermissions[roleId][moduleId] = [
              ...updatedPermissions[roleId][moduleId],
              permission
            ];
          }
        } else {
          // Permission was removed
          updatedPermissions[roleId][moduleId] = updatedPermissions[roleId][moduleId]
            .filter(p => p !== permission);
        }
        
        return updatedPermissions;
      });
      
      toast({
        title: "Permission updated",
        description: `${isActive ? 'Added' : 'Removed'} ${permission} permission for this role.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating permissions",
        description: error.message || "There was a problem updating the permissions.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for creating new role
  const onSubmit = (values: z.infer<typeof roleSchema>) => {
    if (currentRole) {
      updateRoleMutation.mutate({ id: currentRole.id, values });
    } else {
      createRoleMutation.mutate(values);
    }
  };
  
  // Handle editing role
  const handleEdit = (role: CustomRole) => {
    setCurrentRole(role);
    form.reset({
      name: role.name,
      description: role.description || "",
    });
    setIsEditOpen(true);
  };
  
  // Toggle permission for role and module
  const togglePermission = (roleId: string, moduleId: string, permission: string) => {
    const isCurrentlyActive = rolePermissions[roleId]?.[moduleId]?.includes(permission) || false;
    updatePermissionsMutation.mutate({ 
      roleId, 
      moduleId, 
      permission, 
      isActive: !isCurrentlyActive 
    });
  };
  
  // Check if role has permission
  const hasPermission = (roleId: string, moduleId: string, permission: string) => {
    return rolePermissions[roleId]?.[moduleId]?.includes(permission) || false;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Custom Roles</CardTitle>
            <CardDescription>
              Create and manage custom roles with specific permissions.
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-9" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Create Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter role name" {...field} />
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
                          <Textarea 
                            placeholder="Enter role description (optional)" 
                            {...field} 
                            value={field.value || ""} 
                          />
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
                      disabled={createRoleMutation.isPending}
                    >
                      {createRoleMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Role
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Role</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter role name" {...field} />
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
                          <Textarea 
                            placeholder="Enter role description (optional)" 
                            {...field} 
                            value={field.value || ""} 
                          />
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
                      disabled={updateRoleMutation.isPending}
                    >
                      {updateRoleMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Update Role
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              Error loading roles. Please try again.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No custom roles found. Create your first role to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description || '-'}</TableCell>
                        <TableCell>
                          {new Date(role.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
      
      {roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>
              Configure what actions each role can perform in different modules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roles.map((role) => (
              <div key={role.id} className="mb-8">
                <h3 className="text-lg font-semibold mb-4">{role.name}</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Module</TableHead>
                        {permissions.map(permission => (
                          <TableHead key={permission.id}>{permission.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modules.map(module => (
                        <TableRow key={`${role.id}-${module.id}`}>
                          <TableCell className="font-medium">
                            {module.name}
                          </TableCell>
                          {permissions.map(permission => (
                            <TableCell key={`${role.id}-${module.id}-${permission.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => togglePermission(role.id, module.id, permission.id)}
                              >
                                {hasPermission(role.id, module.id, permission.id) ? (
                                  <Check className="h-5 w-5 text-green-500" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground/40" />
                                )}
                              </Button>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RolesList;
