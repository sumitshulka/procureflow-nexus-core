
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

// Import UI components individually
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, MoreHorizontal, CheckCircle, XCircle, Pencil } from "lucide-react";

// User schema for form validation
const userSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().min(1, "Role is required"),
});

// Interface for user data display
interface UserData {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  createdAt: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  
  // Form setup for creating new users
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      role: UserRole.REQUESTER,
    },
  });
  
  // Fetch users with their roles
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at");
        
      if (profilesError) throw profilesError;
      
      // Get user emails from auth.users - this needs to be done in an edge function
      // For now we'll just mock it by extracting from user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
        
      if (rolesError) throw rolesError;
      
      // Group roles by user
      const rolesByUser: Record<string, string[]> = {};
      userRoles.forEach(ur => {
        if (!rolesByUser[ur.user_id]) {
          rolesByUser[ur.user_id] = [];
        }
        rolesByUser[ur.user_id].push(ur.role);
      });
      
      // Build combined user data
      return profiles.map(profile => {
        const userRoles = rolesByUser[profile.id] || [];
        return {
          id: profile.id,
          email: `user-${profile.id.substring(0, 8)}@example.com`, // Placeholder since we can't access auth.users
          fullName: profile.full_name,
          roles: userRoles,
          createdAt: profile.created_at,
        };
      });
    },
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (values: z.infer<typeof userSchema>) => {
      // In a real app, creating users would be done through an edge function
      // Since we cannot modify the auth schema directly from client code
      // Here's the code that would typically be in an edge function:
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      // Wait for the trigger to create the profile
      // Then assign the selected role
      if (data.user) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: data.user.id,
            role: values.role as UserRole // Type assertion to UserRole
          });
          
        if (roleError) throw roleError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User created",
        description: "The user has been successfully created.",
      });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error creating user",
        description: error.message || "There was a problem creating the user.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof userSchema>) => {
    createUserMutation.mutate(values);
  };
  
  // Add role to user
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ 
          user_id: userId, 
          role: role as UserRole // Type assertion to UserRole
        });
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Role added",
        description: "The role has been successfully assigned to the user.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding role",
        description: error.message || "There was a problem assigning the role.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Role Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>System Users</CardTitle>
                <CardDescription>
                  Manage users and their access permissions.
                </CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="h-9" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="user@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormDescription>
                              Must be at least 8 characters.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.values(UserRole).map((role) => (
                                  <SelectItem key={role} value={role || "_default_role"}>
                                    {(role || "Default Role").replace('_', ' ').charAt(0).toUpperCase() + (role || "").replace('_', ' ').slice(1).toLowerCase()}
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
                          disabled={createUserMutation.isPending}
                        >
                          {createUserMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create User
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
                  Error loading users. Please try again.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No users found. Create your first user to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((userData) => (
                          <TableRow key={userData.id}>
                            <TableCell>{userData.fullName || '-'}</TableCell>
                            <TableCell>{userData.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {userData.roles.map((role, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-muted rounded-full text-xs">
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(userData.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Pencil className="w-4 h-4 mr-2" /> Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onSelect={() => {
                                      const role = prompt("Enter role to add:", "requester");
                                      if (role && Object.values(UserRole).includes(role as UserRole)) {
                                        addRoleMutation.mutate({ 
                                          userId: userData.id, 
                                          role 
                                        });
                                      }
                                    }}
                                  >
                                    <Plus className="w-4 h-4 mr-2" /> Add Role
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
        </TabsContent>
        
        <TabsContent value="roles">
          <RoleManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Role Management component
const RoleManagement = () => {
  // The role permissions management component
  const roles = Object.values(UserRole);
  const modules = [
    { id: "dashboard", name: "Dashboard" },
    { id: "catalog", name: "Product Catalog" },
    { id: "requests", name: "Procurement Requests" },
    { id: "settings", name: "Settings" },
  ];
  
  const permissions = [
    { id: "view", name: "View" },
    { id: "create", name: "Create" },
    { id: "modify", name: "Modify" },
    { id: "delete", name: "Delete" },
    { id: "full_control", name: "Full Control" },
  ];
  
  // Default mapping for role permissions (in a real app this would come from the database)
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, string[]>>>({
    [UserRole.ADMIN]: {
      dashboard: ["full_control"],
      catalog: ["full_control"],
      requests: ["full_control"],
      settings: ["full_control"],
    },
    [UserRole.REQUESTER]: {
      dashboard: ["view"],
      catalog: ["view"],
      requests: ["view", "create"],
      settings: [],
    },
    [UserRole.PROCUREMENT_OFFICER]: {
      dashboard: ["view"],
      catalog: ["view", "create", "modify"],
      requests: ["view", "create", "modify"],
      settings: [],
    },
    [UserRole.INVENTORY_MANAGER]: {
      dashboard: ["view"],
      catalog: ["view", "create", "modify", "delete"],
      requests: ["view"],
      settings: [],
    }
  });
  
  // Toggle permission for role and module
  const togglePermission = (role: string, module: string, permission: string) => {
    setRolePermissions(prev => {
      const newPermissions = { ...prev };
      
      if (!newPermissions[role]) {
        newPermissions[role] = {};
      }
      
      if (!newPermissions[role][module]) {
        newPermissions[role][module] = [];
      }
      
      // If permission is "full_control", remove all other permissions
      if (permission === "full_control") {
        if (newPermissions[role][module].includes("full_control")) {
          // If full control is already enabled, remove it
          newPermissions[role][module] = [];
        } else {
          // Enable full control, remove other permissions
          newPermissions[role][module] = ["full_control"];
        }
      } else {
        // For other permissions, toggle and remove full control if present
        const currentPermissions = newPermissions[role][module];
        
        // Remove full control if it exists
        const permissionsWithoutFullControl = currentPermissions.filter(p => p !== "full_control");
        
        // Check if permission is already in the list
        if (permissionsWithoutFullControl.includes(permission)) {
          // Remove the permission
          newPermissions[role][module] = permissionsWithoutFullControl.filter(p => p !== permission);
        } else {
          // Add the permission
          newPermissions[role][module] = [...permissionsWithoutFullControl, permission];
        }
      }
      
      return newPermissions;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
        <CardDescription>
          Configure permissions for each role in the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Module / Role</TableHead>
                {roles.map(role => (
                  <TableHead key={role}>{(role || "Unknown").replace('_', ' ')}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map(module => (
                <React.Fragment key={module.id}>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={roles.length + 1} className="font-medium">
                      {module.name}
                    </TableCell>
                  </TableRow>
                  {permissions.map(permission => (
                    <TableRow key={`${module.id}-${permission.id}`}>
                      <TableCell className="pl-6">
                        {permission.name}
                      </TableCell>
                      {roles.map(role => (
                        <TableCell key={`${role}-${permission.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => togglePermission(role || "unknown_role", module.id, permission.id)}
                          >
                            {rolePermissions[role]?.[module.id]?.includes(permission.id) ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground/40" />
                            )}
                          </Button>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button>
            Save Permissions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
