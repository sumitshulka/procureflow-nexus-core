import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ResetPasswordAction from "./ResetPasswordAction";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logDatabaseError } from "@/utils/supabaseHelpers";

interface Department {
  id: string;
  name: string;
}

// Interface for user email data from Edge Function
interface UserEmailData {
  id: string;
  email: string;
  full_name?: string;
}

// Enhanced form schema with strong password requirements
const userFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
    .optional(),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional()
});

const UsersList = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([]);

  // Fetch departments and available roles
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from("departments")
          .select("id, name");

        if (error) throw error;
        setDepartments(data || []);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    const fetchAvailableRoles = async () => {
      try {
        // All roles are now managed in custom_roles table
        const { data: rolesData, error } = await supabase
          .from("custom_roles")
          .select("id, name")
          .eq("is_active", true);

        if (error) throw error;

        // Map roles to the format needed for dropdowns
        const roles = (rolesData || []).map((role) => ({
          id: role.id,
          name: role.name,
        }));

        setAvailableRoles(roles.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching available roles:", error);
        setAvailableRoles([]);
      }
    };

    fetchDepartments();
    fetchAvailableRoles();
  }, []);

  // Fetch users with real emails
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["users", departments],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, created_at, department_id")
        .eq("is_vendor", false);

      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      // Get user roles with role names from custom_roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role_id, custom_roles(id, name)");

      if (rolesError) throw rolesError;

      // Get user emails using Edge Function
      const userIds = profiles.map(profile => profile.id);
      
      const { data: emailsResponse, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      if (emailsError) {
        console.error('Error fetching user emails:', emailsError);
      }

      // Create emails map with proper typing
      const emailsMap = new Map<string, string>();
      if (emailsResponse?.users && Array.isArray(emailsResponse.users)) {
        emailsResponse.users.forEach((user: UserEmailData) => {
          if (user.id && user.email) {
            emailsMap.set(user.id, user.email);
          }
        });
      }

      // Group roles by user
      const rolesByUser = userRoles.reduce((acc, ur) => {
        if (!acc[ur.user_id]) acc[ur.user_id] = [];
        const roleName = (ur.custom_roles as any)?.name || 'Unknown';
        acc[ur.user_id].push(roleName);
        return acc;
      }, {} as Record<string, string[]>);

      // Join profiles with roles and emails
      return profiles.map(profile => {
        // Find department by ID
        const department = departments.find(dept => dept.id === profile.department_id);
        
        return {
          id: profile.id,
          fullName: profile.full_name || "Unnamed User",
          department: department?.name || "No Department",
          roles: rolesByUser[profile.id] || [],
          createdAt: new Date(profile.created_at).toLocaleDateString(),
          email: emailsMap.get(profile.id) || "No email found"
        };
      });
    },
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  // Form for adding new users
  const addForm = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      role: "", // Will be set when roles are loaded
      department: "",
    },
  });

  // Form for editing users
  const editForm = useForm({
    resolver: zodResolver(userFormSchema.omit({ password: true })),
    defaultValues: {
      email: "",
      fullName: "",
      role: "",
      department: ""
    }
  });

  const handleAddUser = async (values) => {
    try {
      console.log("Creating user with values:", values);
      
      // Check authorization to assign this role first
      const { data: canAssign, error: authError } = await supabase
        .rpc('can_assign_role', {
          target_user_id: null, // null for new users - admin check only
          role_to_assign: values.role
        });

      if (authError || !canAssign) {
        toast({
          title: "Access Denied",
          description: `You don't have permission to assign the ${values.role} role`,
          variant: "destructive",
        });
        return;
      }
      
      // Create user in auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            department: values.department,
          }
        }
      });

      if (signUpError) {
        logDatabaseError(signUpError, 'creating new user');
        return;
      }

      // Assign role if user is created
      if (signUpData.user) {
        // Find department ID from department name  
        const selectedDept = departments.find(dept => dept.name === values.department);
        const departmentId = selectedDept ? selectedDept.id : null;
        
        // Update the department in profiles table
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            department_id: departmentId
          })
          .eq("id", signUpData.user.id);
          
        if (profileError) {
          logDatabaseError(profileError, 'updating user profile');
          return;
        }
        
        // Assign user role (role_id is now the UUID from custom_roles)
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: signUpData.user.id,
            role_id: values.role
          });

        if (roleError) {
          logDatabaseError(roleError, 'assigning user role');
          return;
        }

        toast({
          title: "User added successfully",
          description: `New user ${values.fullName} has been created.`
        });

        setIsAddDialogOpen(false);
        addForm.reset();
        refetch();
      }
    } catch (error) {
      console.error("Error adding user:", error);
      toast({
        title: "Failed to add user",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditUser = (user) => {
    setCurrentUser(user);
    editForm.reset({
      email: user.email,
      fullName: user.fullName,
      role: user.roles[0] || "requester",
      department: user.department === "No Department" ? "" : user.department,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (values) => {
    if (!currentUser) return;
    
    try {
      // Find department ID from department name
      const selectedDept = departments.find(dept => dept.name === values.department);
      const departmentId = selectedDept ? selectedDept.id : null;
      
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          full_name: values.fullName,
          department_id: departmentId 
        })
        .eq("id", currentUser.id);

      if (profileError) {
        throw profileError;
      }

      // Check if role needs to be updated
      if (values.role !== currentUser.roles[0]) {
        // First check if the current user can assign this role
        const { data: canAssign, error: permissionError } = await supabase
          .rpc('can_assign_role', { 
            target_user_id: currentUser.id, 
            role_to_assign: values.role 
          });

        if (permissionError) {
          throw permissionError;
        }

        if (!canAssign) {
          toast({
            title: "Permission denied",
            description: "You do not have permission to assign this role",
            variant: "destructive"
          });
          return;
        }

        // Remove existing roles
        const { error: deleteRoleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", currentUser.id);

        if (deleteRoleError) {
          throw deleteRoleError;
        }

        // Add new role (role_id is now the UUID from custom_roles)
        const { error: addRoleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: currentUser.id,
            role_id: values.role
          });

        if (addRoleError) {
          throw addRoleError;
        }
      }

      toast({
        title: "User updated successfully",
        description: `${values.fullName}'s information has been updated.`
      });

      setIsEditDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Failed to update user",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      // Delete user using secure Edge Function
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "User deleted",
        description: "The user has been removed from the system."
      });
      
      refetch();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>System Users</CardTitle>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <ResetPasswordAction userId={user.id} userEmail={user.email} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddUser)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="user@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} placeholder="******" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
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
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles.map((role) => (
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
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add User</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateUser)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles.map((role) => (
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
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UsersList;
