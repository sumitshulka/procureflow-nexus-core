
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, Shield, Link, Wand2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import RoleWizard from "@/components/settings/role-management/RoleWizard";

// Role schema for form validation
const roleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

// Module schema for form validation
const moduleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  menu_item_id: z.string().optional(),
});

// Permission types
const permissionTypes = [
  { id: "view", name: "View", description: "Can view the module" },
  { id: "create", name: "Create", description: "Can create new items" },
  { id: "edit", name: "Edit", description: "Can modify existing items" },
  { id: "delete", name: "Delete", description: "Can delete items" },
  { id: "admin", name: "Full Control", description: "Complete access to the module" },
];

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface ModuleData {
  id: string;
  name: string;
  description: string | null;
  menu_item_id: string | null;
  menu_item?: {
    name: string;
    route_path: string;
  };
}

interface MenuItemData {
  id: string;
  name: string;
  route_path: string;
  display_order: number;
}

const EnhancedRolesList = () => {
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
    defaultValues: { name: "", description: "" },
  });

  const roleEditForm = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "" },
  });

  const moduleForm = useForm({
    resolver: zodResolver(moduleSchema),
    defaultValues: { name: "", description: "", menu_item_id: "none" },
  });

  const moduleEditForm = useForm({
    resolver: zodResolver(moduleSchema),
    defaultValues: { name: "", description: "", menu_item_id: "none" },
  });

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*");
      
      if (error) throw error;
      return data as RoleData[];
    },
  });

  // Fetch modules with menu item info
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["system_modules_with_menu"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_modules")
        .select(`
          *,
          menu_item:menu_item_id(name, route_path)
        `);
      
      if (error) throw error;
      return data as ModuleData[];
    },
  });

  // Fetch menu items for module creation/editing
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, route_path, display_order")
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw error;
      return data as MenuItemData[];
    },
  });

  // Fetch permissions for a specific role
  const fetchRolePermissions = async (roleId: string) => {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("role_id", roleId);
    
    if (error) throw error;
    
    const permissionsByModule: Record<string, string[]> = {};
    data.forEach((perm: any) => {
      const moduleKey = perm.module_uuid || perm.module_id;
      if (!permissionsByModule[moduleKey]) {
        permissionsByModule[moduleKey] = [];
      }
      permissionsByModule[moduleKey].push(perm.permission);
    });
    
    return permissionsByModule;
  };

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (values: z.infer<typeof roleSchema>) => {
      const { data, error } = await supabase
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
      queryClient.invalidateQueries({ queryKey: ["custom_roles"] });
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

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: async (values: z.infer<typeof moduleSchema>) => {
      const { data, error } = await supabase
        .from("system_modules")
        .insert({
          name: values.name,
          description: values.description || null,
          menu_item_id: values.menu_item_id === "none" ? null : values.menu_item_id,
        })
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_modules_with_menu"] });
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
    mutationFn: async (values: z.infer<typeof moduleSchema>) => {
      if (!currentModule) throw new Error("No module selected");
      
      const { data, error } = await supabase
        .from("system_modules")
        .update({
          name: values.name,
          description: values.description || null,
          menu_item_id: values.menu_item_id === "none" ? null : values.menu_item_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentModule.id)
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_modules_with_menu"] });
      toast({
        title: "Module updated",
        description: "The module has been successfully updated.",
      });
      setIsModuleEditOpen(false);
      setCurrentModule(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating module",
        description: error.message || "There was a problem updating the module.",
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
      const { error: deleteError } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("module_uuid", moduleId);
      
      if (deleteError) throw deleteError;
      
      // If no permissions to add, just return
      if (permissions.length === 0) return { roleId, moduleId, added: 0 };
      
      // Then insert the new permissions
      const permissionObjects = permissions.map(permission => ({
        role_id: roleId,
        module_id: "legacy", // Keep for backward compatibility
        module_uuid: moduleId,
        permission,
      }));
      
      const { error: insertError } = await supabase
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

  // Handle module form submission
  const onModuleSubmit = (values: z.infer<typeof moduleSchema>) => {
    createModuleMutation.mutate(values);
  };

  // Handle module update form submission
  const onModuleUpdateSubmit = (values: z.infer<typeof moduleSchema>) => {
    updateModuleMutation.mutate(values);
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
      
      if (permission === "admin") {
        if (modulePermissions.includes("admin")) {
          return { ...prevState, [moduleId]: [] };
        } else {
          return { ...prevState, [moduleId]: ["admin"] };
        }
      } else {
        if (modulePermissions.includes("admin")) {
          const withoutAdmin = modulePermissions.filter(p => p !== "admin");
          withoutAdmin.push(permission);
          return { ...prevState, [moduleId]: withoutAdmin };
        }
        
        const permissionIndex = modulePermissions.indexOf(permission);
        if (permissionIndex !== -1) {
          modulePermissions.splice(permissionIndex, 1);
        } else {
          modulePermissions.push(permission);
        }
        
        return { ...prevState, [moduleId]: modulePermissions };
      }
    });
  };

  // Save permissions
  const savePermissions = async () => {
    if (!currentRole) return;
    
    try {
      const updates = Object.entries(rolePermissions).map(([moduleId, permissions]) => 
        updatePermissionsMutation.mutateAsync({ 
          roleId: currentRole.id, 
          moduleId, 
          permissions 
        })
      );
      
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
        <TabsTrigger value="wizard">Role Wizard</TabsTrigger>
      </TabsList>
      
      <TabsContent value="roles" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                Manage roles and their permissions across modules.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("wizard")}
              >
                <Wand2 className="mr-2 h-4 w-4" /> Role Wizard
              </Button>
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
            </div>
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Enhanced Permissions Dialog with better scrolling */}
            <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>
                    Manage Permissions: {currentRole?.name}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto px-1">
                  {modules.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No modules found. Add modules first to configure permissions.
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full">
                      {modules.map((module) => (
                        <AccordionItem key={module.id} value={module.id}>
                          <AccordionTrigger className="px-4">
                            <div className="flex items-center justify-between w-full mr-4">
                              <div className="flex items-center gap-2">
                                <span>{module.name}</span>
                                {module.menu_item && (
                                  <Badge variant="outline" className="text-xs">
                                    <Link className="h-3 w-3 mr-1" />
                                    {module.menu_item.route_path}
                                  </Badge>
                                )}
                              </div>
                              {rolePermissions[module.id]?.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                  {rolePermissions[module.id]?.includes("admin") 
                                    ? "Full Control" 
                                    : `${rolePermissions[module.id]?.length} permissions`}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-2">
                            <div className="grid grid-cols-1 gap-4">
                              {permissionTypes.map((permType) => (
                                <div key={permType.id} className="flex items-start space-x-3 p-2 border rounded">
                                  <Checkbox 
                                    id={`${module.id}-${permType.id}`}
                                    checked={(rolePermissions[module.id] || []).includes(permType.id)}
                                    onCheckedChange={() => togglePermission(module.id, permType.id)}
                                  />
                                  <div className="flex-1">
                                    <label
                                      htmlFor={`${module.id}-${permType.id}`}
                                      className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                      {permType.name}
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {permType.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
                
                <DialogFooter className="flex-shrink-0 border-t pt-4">
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
                Manage system modules and link them to menu items for permission control.
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

                    <FormField
                      control={moduleForm.control}
                      name="menu_item_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link to Menu Item</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a menu item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No menu item</SelectItem>
                              {menuItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} ({item.route_path})
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
                      <TableHead>Linked Menu Item</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No modules found. Create your first module to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      modules.map((module) => (
                        <TableRow key={module.id}>
                          <TableCell className="font-medium">{module.name}</TableCell>
                          <TableCell>{module.description || "-"}</TableCell>
                          <TableCell>
                            {module.menu_item ? (
                              <Badge variant="outline">
                                <Link className="h-3 w-3 mr-1" />
                                {module.menu_item.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Not linked</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setCurrentModule(module);
                                  moduleEditForm.reset({
                                    name: module.name,
                                    description: module.description || "",
                                    menu_item_id: module.menu_item_id || "none",
                                  });
                                  setIsModuleEditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
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

            {/* Fixed Module Edit Dialog */}
            <Dialog open={isModuleEditOpen} onOpenChange={setIsModuleEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Module</DialogTitle>
                </DialogHeader>
                <Form {...moduleEditForm}>
                  <form onSubmit={moduleEditForm.handleSubmit(onModuleUpdateSubmit)} className="space-y-4">
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

                    <FormField
                      control={moduleEditForm.control}
                      name="menu_item_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link to Menu Item</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a menu item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No menu item</SelectItem>
                              {menuItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} ({item.route_path})
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
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="wizard" className="mt-6">
        <RoleWizard />
      </TabsContent>
    </Tabs>
  );
};

export default EnhancedRolesList;
