
import React, { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, MoreHorizontal, Pencil, Trash2, Settings, ListPlus, Shield } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Role schema for form validation
const roleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

// Module schema for form validation
const moduleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

// Permission types
const permissionTypes = [
  { id: "view", name: "View" },
  { id: "create", name: "Create" },
  { id: "edit", name: "Edit" },
  { id: "delete", name: "Delete" },
  { id: "approve", name: "Approve" },
  { id: "admin", name: "Full Access" },
];

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

interface ModuleData {
  id: string;
  name: string;
  description: string | null;
}

interface PermissionData {
  id: string;
  roleId: string;
  moduleId: string;
  permission: string;
}

const RolesList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("roles");
  const [isRoleCreateOpen, setIsRoleCreateOpen] = useState(false);
  const [isRoleEditOpen, setIsRoleEditOpen] = useState(false);
  const [isModuleCreateOpen, setIsModuleCreateOpen] = useState(false);
  const [isModuleEditOpen, setIsModuleEditOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleData | null>(null);
  const [currentModule, setCurrentModule] = useState<ModuleData | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  
  // Forms setup
  const roleForm = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  const roleEditForm = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  const moduleForm = useForm({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  const moduleEditForm = useForm({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("custom_roles")
        .select("*");
      
      if (error) throw error;
      
      return data.map((role: any) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        createdAt: role.created_at,
      }));
    },
  });
  
  // Fetch modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_modules")
        .select("*");
      
      if (error) throw error;
      
      return data.map(module => ({
        id: module.id,
        name: module.name,
        description: module.description,
      }));
    },
  });
  
  // Fetch permissions for a specific role
  const fetchRolePermissions = async (roleId: string) => {
    const { data, error } = await (supabase as any)
      .from("role_permissions")
      .select("*")
      .eq("role_id", roleId);
    
    if (error) {
      throw error;
    }
    
    // Group permissions by module
    const permissionsByModule: Record<string, string[]> = {};
    
    data.forEach((perm: any) => {
      if (!permissionsByModule[perm.module_id]) {
        permissionsByModule[perm.module_id] = [];
      }
      permissionsByModule[perm.module_id].push(perm.permission);
    });
    
    return permissionsByModule;
  };
  
  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (values: z.infer<typeof roleSchema>) => {
      const { data, error } = await (supabase as any)
        .from("custom_roles")
        .insert({
          name: values.name,
          description: values.description || null,
        })
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Role created",
        description: "The role has been successfully created.",
      });
      setIsRoleCreateOpen(false);
      roleForm.reset();
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
    mutationFn: async ({ id, data }: { id: string, data: z.infer<typeof roleSchema> }) => {
      const { error } = await (supabase as any)
        .from("custom_roles")
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq("id", id);
      
      if (error) throw error;
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Role updated",
        description: "The role has been successfully updated.",
      });
      setIsRoleEditOpen(false);
      roleEditForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error updating role",
        description: error.message || "There was a problem updating the role.",
        variant: "destructive",
      });
    },
  });
  
  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("custom_roles")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Role deleted",
        description: "The role has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting role",
        description: error.message || "There was a problem deleting the role.",
        variant: "destructive",
      });
    },
  });
  
  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: async (values: z.infer<typeof moduleSchema>) => {
      const { data, error } = await supabase
        .from("system_modules")
        .insert({
          name: values.name,
          description: values.description || null,
        })
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast({
        title: "Module created",
        description: "The module has been successfully created.",
      });
      setIsModuleCreateOpen(false);
      moduleForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error creating module",
        description: error.message || "There was a problem creating the module.",
        variant: "destructive",
      });
    },
  });
  
  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: z.infer<typeof moduleSchema> }) => {
      const { error } = await supabase
        .from("system_modules")
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq("id", id);
      
      if (error) throw error;
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast({
        title: "Module updated",
        description: "The module has been successfully updated.",
      });
      setIsModuleEditOpen(false);
      moduleEditForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error updating module",
        description: error.message || "There was a problem updating the module.",
        variant: "destructive",
      });
    },
  });
  
  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("system_modules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast({
        title: "Module deleted",
        description: "The module has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting module",
        description: error.message || "There was a problem deleting the module.",
        variant: "destructive",
      });
    },
  });
  
  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ 
      roleId, 
      moduleId, 
      permissions 
    }: { roleId: string; moduleId: string; permissions: string[] }) => {
      // First, delete existing permissions for this role-module combination
      const { error: deleteError } = await (supabase as any)
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("module_id", moduleId);
      
      if (deleteError) throw deleteError;
      
      // If no permissions to add, just return
      if (permissions.length === 0) return { roleId, moduleId, added: 0 };
      
      // Then insert the new permissions
      const permissionObjects = permissions.map(permission => ({
        role_id: roleId,
        module_id: moduleId,
        permission,
      }));
      
      const { error: insertError } = await (supabase as any)
        .from("role_permissions")
        .insert(permissionObjects);
      
      if (insertError) throw insertError;
      
      return { roleId, moduleId, added: permissions.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role_permissions"] });
      toast({
        title: "Permissions updated",
        description: "The role permissions have been successfully updated.",
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
  
  // Handle role form submission
  const onRoleSubmit = (values: z.infer<typeof roleSchema>) => {
    createRoleMutation.mutate(values);
  };
  
  // Handle role edit form submission
  const onRoleEditSubmit = (values: z.infer<typeof roleSchema>) => {
    if (!currentRole) return;
    updateRoleMutation.mutate({ id: currentRole.id, data: values });
  };
  
  // Handle module form submission
  const onModuleSubmit = (values: z.infer<typeof moduleSchema>) => {
    createModuleMutation.mutate(values);
  };
  
  // Handle module edit form submission
  const onModuleEditSubmit = (values: z.infer<typeof moduleSchema>) => {
    if (!currentModule) return;
    updateModuleMutation.mutate({ id: currentModule.id, data: values });
  };
  
  // Open edit dialog with role data
  const handleEditRole = (role: RoleData) => {
    setCurrentRole(role);
    roleEditForm.reset({
      name: role.name,
      description: role.description || "",
    });
    setIsRoleEditOpen(true);
  };
  
  // Open edit dialog with module data
  const handleEditModule = (module: ModuleData) => {
    setCurrentModule(module);
    moduleEditForm.reset({
      name: module.name,
      description: module.description || "",
    });
    setIsModuleEditOpen(true);
  };
  
  // Handle delete role
  const handleDeleteRole = (id: string) => {
    if (window.confirm("Are you sure you want to delete this role? Users with this role will be affected.")) {
      deleteRoleMutation.mutate(id);
    }
  };
  
  // Handle delete module
  const handleDeleteModule = (id: string) => {
    if (window.confirm("Are you sure you want to delete this module? All associated permissions will be removed.")) {
      deleteModuleMutation.mutate(id);
    }
  };
  
  // Open permissions dialog
  const handleManagePermissions = async (role: RoleData) => {
    setCurrentRole(role);
    try {
      const permissions = await fetchRolePermissions(role.id);
      setRolePermissions(permissions);
      setIsPermissionsOpen(true);
    } catch (error: any) {
      toast({
        title: "Error loading permissions",
        description: error.message || "Failed to load role permissions",
        variant: "destructive",
      });
    }
  };
  
  // Toggle permission for a module
  const togglePermission = (moduleId: string, permission: string) => {
    setRolePermissions(prevState => {
      const modulePermissions = [...(prevState[moduleId] || [])];
      
      // Check if permission is "admin", which is a special case
      if (permission === "admin") {
        // If admin already exists, remove it
        if (modulePermissions.includes("admin")) {
          return {
            ...prevState,
            [moduleId]: []
          };
        } 
        // If admin doesn't exist, remove all other permissions and add admin
        else {
          return {
            ...prevState,
            [moduleId]: ["admin"]
          };
        }
      } else {
        // For non-admin permissions
        
        // If admin exists, remove it first as we're adding a specific permission
        if (modulePermissions.includes("admin")) {
          const withoutAdmin = modulePermissions.filter(p => p !== "admin");
          withoutAdmin.push(permission);
          return {
            ...prevState,
            [moduleId]: withoutAdmin
          };
        }
        
        // Toggle the specific permission
        const permissionIndex = modulePermissions.indexOf(permission);
        if (permissionIndex !== -1) {
          modulePermissions.splice(permissionIndex, 1);
        } else {
          modulePermissions.push(permission);
        }
        
        return {
          ...prevState,
          [moduleId]: modulePermissions
        };
      }
    });
  };
  
  // Save permissions
  const savePermissions = async () => {
    if (!currentRole) return;
    
    try {
      // For each module, update permissions
      const updates = Object.entries(rolePermissions).map(([moduleId, permissions]) => 
        updatePermissionsMutation.mutate({ 
          roleId: currentRole.id, 
          moduleId, 
          permissions 
        })
      );
      
      // Wait for all updates to complete
      await Promise.all(updates);
      
      setIsPermissionsOpen(false);
    } catch (error) {
      console.error("Error saving permissions:", error);
    }
  };
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList>
        <TabsTrigger value="roles">Roles</TabsTrigger>
        <TabsTrigger value="modules">Modules</TabsTrigger>
      </TabsList>
      
      <TabsContent value="roles" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                Manage roles and their permissions.
              </CardDescription>
            </div>
            <Dialog open={isRoleCreateOpen} onOpenChange={setIsRoleCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Role</DialogTitle>
                </DialogHeader>
                <Form {...roleForm}>
                  <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-4">
                    <FormField
                      control={roleForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Role name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={roleForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Role description" {...field} />
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

            <Dialog open={isRoleEditOpen} onOpenChange={setIsRoleEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Role</DialogTitle>
                </DialogHeader>
                <Form {...roleEditForm}>
                  <form onSubmit={roleEditForm.handleSubmit(onRoleEditSubmit)} className="space-y-4">
                    <FormField
                      control={roleEditForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Role name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={roleEditForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Role description" {...field} />
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
            {rolesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No roles found. Create your first role to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="hidden md:table-cell">{role.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleManagePermissions(role)}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditRole(role)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRole(role.id)}
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

            {/* Permissions Dialog */}
            <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    Manage Permissions: {currentRole?.name}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="max-h-[60vh] overflow-y-auto">
                  {modules.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No modules found. Add modules first to configure permissions.
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full">
                      {modules.map((module) => (
                        <AccordionItem key={module.id} value={module.id}>
                          <AccordionTrigger className="px-4">
                            <div className="flex items-center justify-between w-full">
                              <span>{module.name}</span>
                              {rolePermissions[module.id]?.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                  {rolePermissions[module.id]?.includes("admin") 
                                    ? "Full Access" 
                                    : `${rolePermissions[module.id]?.length} permissions`}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                              {permissionTypes.map((permType) => (
                                <div key={permType.id} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`${module.id}-${permType.id}`}
                                    checked={(rolePermissions[module.id] || []).includes(permType.id)}
                                    onCheckedChange={() => togglePermission(module.id, permType.id)}
                                  />
                                  <label
                                    htmlFor={`${module.id}-${permType.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {permType.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={savePermissions}>
                    Save Permissions
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="modules" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>System Modules</CardTitle>
              <CardDescription>
                Manage system modules for permission control.
              </CardDescription>
            </div>
            <Dialog open={isModuleCreateOpen} onOpenChange={setIsModuleCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Module
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Module</DialogTitle>
                </DialogHeader>
                <Form {...moduleForm}>
                  <form onSubmit={moduleForm.handleSubmit(onModuleSubmit)} className="space-y-4">
                    <FormField
                      control={moduleForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Module name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={moduleForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Module description" {...field} />
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
                        disabled={createModuleMutation.isPending}
                      >
                        {createModuleMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Module
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isModuleEditOpen} onOpenChange={setIsModuleEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Module</DialogTitle>
                </DialogHeader>
                <Form {...moduleEditForm}>
                  <form onSubmit={moduleEditForm.handleSubmit(onModuleEditSubmit)} className="space-y-4">
                    <FormField
                      control={moduleEditForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Module name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={moduleEditForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Module description" {...field} />
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
                        disabled={updateModuleMutation.isPending}
                      >
                        {updateModuleMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Update Module
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {modulesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No modules found. Create your first module to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      modules.map((module) => (
                        <TableRow key={module.id}>
                          <TableCell className="font-medium">{module.name}</TableCell>
                          <TableCell>{module.description || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditModule(module)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteModule(module.id)}
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
      </TabsContent>
    </Tabs>
  );
};

export default RolesList;
