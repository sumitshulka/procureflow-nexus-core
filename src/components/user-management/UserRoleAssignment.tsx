
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Plus, UserPlus, Settings, Trash2 } from "lucide-react";

interface User {
  id: string;
  full_name: string | null;
  email: string;
  roles: string[];
  custom_roles: Array<{
    id: string;
    name: string;
  }>;
}

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
}

interface ModulePermission {
  id: string;
  name: string;
  description: string | null;
  user_permissions: string[];
}

const UserRoleAssignment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
  const [isUserPermissionsOpen, setIsUserPermissionsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [userModulePermissions, setUserModulePermissions] = useState<Record<string, string[]>>({});

  // Fetch users with their roles
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users_with_roles"],
    queryFn: async () => {
      // Get profiles with user roles (system roles)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          user_roles!inner(role)
        `);

      if (profilesError) throw profilesError;

      // Get user role assignments (custom roles)
      const { data: roleAssignments, error: roleAssignmentsError } = await supabase
        .from("user_role_assignments")
        .select(`
          user_id,
          custom_role:custom_role_id(id, name)
        `)
        .eq("is_active", true);

      if (roleAssignmentsError) throw roleAssignmentsError;

      // Group custom roles by user
      const customRolesByUser: Record<string, Array<{id: string; name: string}>> = {};
      roleAssignments.forEach((assignment: any) => {
        if (!customRolesByUser[assignment.user_id]) {
          customRolesByUser[assignment.user_id] = [];
        }
        if (assignment.custom_role) {
          customRolesByUser[assignment.user_id].push(assignment.custom_role);
        }
      });

      // Combine data
      return profiles.map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        email: `${profile.id.substring(0, 8)}@example.com`, // Placeholder
        roles: profile.user_roles.map((ur: any) => ur.role),
        custom_roles: customRolesByUser[profile.id] || [],
      }));
    },
  });

  // Fetch available custom roles
  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*");
      
      if (error) throw error;
      return data as CustomRole[];
    },
  });

  // Fetch modules for user permissions
  const { data: modules = [] } = useQuery({
    queryKey: ["modules_for_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_modules")
        .select("*")
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const { error } = await supabase
        .from("user_role_assignments")
        .insert({
          user_id: userId,
          custom_role_id: roleId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
      toast({
        title: "Role assigned",
        description: "The role has been successfully assigned to the user.",
      });
      setIsAssignRoleOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
    },
    onError: (error) => {
      toast({
        title: "Error assigning role",
        description: error.message || "There was a problem assigning the role.",
        variant: "destructive",
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const { error } = await supabase
        .from("user_role_assignments")
        .delete()
        .eq("user_id", userId)
        .eq("custom_role_id", roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users_with_roles"] });
      toast({
        title: "Role removed",
        description: "The role has been successfully removed from the user.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing role",
        description: error.message || "There was a problem removing the role.",
        variant: "destructive",
      });
    },
  });

  // Fetch user specific permissions
  const fetchUserPermissions = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_module_permissions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);
    
    if (error) throw error;
    
    const permissionsByModule: Record<string, string[]> = {};
    data.forEach((perm: any) => {
      if (!permissionsByModule[perm.module_id]) {
        permissionsByModule[perm.module_id] = [];
      }
      permissionsByModule[perm.module_id].push(perm.permission);
    });
    
    return permissionsByModule;
  };

  // Update user permissions mutation
  const updateUserPermissionsMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      moduleId, 
      permissions 
    }: { userId: string; moduleId: string; permissions: string[] }) => {
      // First, delete existing permissions for this user-module combination
      const { error: deleteError } = await supabase
        .from("user_module_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("module_id", moduleId);
      
      if (deleteError) throw deleteError;
      
      // If no permissions to add, just return
      if (permissions.length === 0) return;
      
      // Then insert the new permissions
      const permissionObjects = permissions.map(permission => ({
        user_id: userId,
        module_id: moduleId,
        permission,
      }));
      
      const { error: insertError } = await supabase
        .from("user_module_permissions")
        .insert(permissionObjects);
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast({
        title: "User permissions updated",
        description: "The user-specific permissions have been successfully updated.",
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

  // Handle assign role
  const handleAssignRole = () => {
    if (!selectedUser || !selectedRole) return;
    assignRoleMutation.mutate({ userId: selectedUser.id, roleId: selectedRole });
  };

  // Handle remove role
  const handleRemoveRole = (userId: string, roleId: string) => {
    if (window.confirm("Are you sure you want to remove this role from the user?")) {
      removeRoleMutation.mutate({ userId, roleId });
    }
  };

  // Open user permissions dialog
  const handleManageUserPermissions = async (user: User) => {
    setSelectedUser(user);
    try {
      const permissions = await fetchUserPermissions(user.id);
      setUserModulePermissions(permissions);
      setIsUserPermissionsOpen(true);
    } catch (error: any) {
      toast({
        title: "Error loading permissions",
        description: error.message || "Failed to load user permissions",
        variant: "destructive",
      });
    }
  };

  // Toggle user permission
  const toggleUserPermission = (moduleId: string, permission: string) => {
    setUserModulePermissions(prevState => {
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

  // Save user permissions
  const saveUserPermissions = async () => {
    if (!selectedUser) return;
    
    try {
      const updates = Object.entries(userModulePermissions).map(([moduleId, permissions]) => 
        updateUserPermissionsMutation.mutateAsync({ 
          userId: selectedUser.id, 
          moduleId, 
          permissions 
        })
      );
      
      await Promise.all(updates);
      setIsUserPermissionsOpen(false);
    } catch (error) {
      console.error("Error saving user permissions:", error);
    }
  };

  const permissionTypes = [
    { id: "view", name: "View" },
    { id: "create", name: "Create" },
    { id: "edit", name: "Edit" },
    { id: "delete", name: "Delete" },
    { id: "admin", name: "Full Control" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Role Assignments</CardTitle>
        <CardDescription>
          Assign custom roles to users and manage user-specific permissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {usersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>System Roles</TableHead>
                  <TableHead>Custom Roles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name || "Unnamed User"}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role, idx) => (
                            <Badge key={idx} variant="secondary">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.custom_roles.map((role) => (
                            <Badge 
                              key={role.id} 
                              variant="default"
                              className="cursor-pointer"
                              onClick={() => handleRemoveRole(user.id, role.id)}
                            >
                              {role.name}
                              <Trash2 className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsAssignRoleOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleManageUserPermissions(user)}
                          >
                            <Settings className="h-4 w-4" />
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

        {/* Assign Role Dialog */}
        <Dialog open={isAssignRoleOpen} onOpenChange={setIsAssignRoleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Role to {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {customRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                onClick={handleAssignRole}
                disabled={!selectedRole || assignRoleMutation.isPending}
              >
                {assignRoleMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Assign Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Permissions Dialog */}
        <Dialog open={isUserPermissionsOpen} onOpenChange={setIsUserPermissionsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                User-Specific Permissions: {selectedUser?.full_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto">
              {modules.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No modules found.
                </div>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {modules.map((module) => (
                    <AccordionItem key={module.id} value={module.id}>
                      <AccordionTrigger className="px-4">
                        <div className="flex items-center justify-between w-full mr-4">
                          <span>{module.name}</span>
                          {userModulePermissions[module.id]?.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {userModulePermissions[module.id]?.includes("admin") 
                                ? "Full Control" 
                                : `${userModulePermissions[module.id]?.length} permissions`}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pt-2">
                        <div className="grid grid-cols-1 gap-4">
                          {permissionTypes.map((permType) => (
                            <div key={permType.id} className="flex items-center space-x-3 p-2 border rounded">
                              <Checkbox 
                                id={`${module.id}-${permType.id}`}
                                checked={(userModulePermissions[module.id] || []).includes(permType.id)}
                                onCheckedChange={() => toggleUserPermission(module.id, permType.id)}
                              />
                              <label
                                htmlFor={`${module.id}-${permType.id}`}
                                className="text-sm font-medium leading-none cursor-pointer"
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
              <Button onClick={saveUserPermissions}>
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UserRoleAssignment;
