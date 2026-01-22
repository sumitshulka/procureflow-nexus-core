import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import ResetPasswordAction from "./ResetPasswordAction";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit, Trash2, UserPlus, Building2, History, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Department {
  id: string;
  name: string;
}

interface UserEmailData {
  id: string;
  email: string;
  full_name?: string;
}

interface DepartmentAssignment {
  department_id: string;
  department_name: string;
  assigned_at: string;
}

// Enhanced form schema with multi-department support
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
  departments: z.array(z.string()).optional()
});

const UsersList = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const { getModulePermission } = useModulePermissions();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const userPermission = getModulePermission('/users');
  const canCreate = userPermission === 'create' || userPermission === 'edit' || userPermission === 'delete' || userPermission === 'admin';
  const canEdit = userPermission === 'edit' || userPermission === 'delete' || userPermission === 'admin';
  const canDelete = userPermission === 'delete' || userPermission === 'admin';

  // Fetch departments and available roles
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from("departments")
          .select("id, name")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setDepartments(data || []);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    const fetchAvailableRoles = async () => {
      try {
        const { data: rolesData, error } = await supabase
          .from("custom_roles")
          .select("id, name")
          .eq("is_active", true);

        if (error) throw error;

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

  // Fetch users with their department assignments
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

      // Get department assignments for all users
      const { data: deptAssignments, error: deptError } = await supabase
        .from("user_department_assignments")
        .select("user_id, department_id, departments(name), assigned_at")
        .eq("is_active", true);

      if (deptError) {
        console.error("Error fetching department assignments:", deptError);
      }

      // Get user emails using Edge Function
      const userIds = profiles.map(profile => profile.id);
      
      const { data: emailsResponse, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      if (emailsError) {
        console.error('Error fetching user emails:', emailsError);
      }

      // Create emails map
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
        const roleId = (ur.custom_roles as any)?.id || ur.role_id;
        acc[ur.user_id].push({ name: roleName, id: roleId });
        return acc;
      }, {} as Record<string, { name: string; id: string }[]>);

      // Group department assignments by user
      const deptsByUser = (deptAssignments || []).reduce((acc, da) => {
        if (!acc[da.user_id]) acc[da.user_id] = [];
        acc[da.user_id].push({
          department_id: da.department_id,
          department_name: (da.departments as any)?.name || 'Unknown',
          assigned_at: da.assigned_at
        });
        return acc;
      }, {} as Record<string, DepartmentAssignment[]>);

      // Join profiles with roles, departments, and emails
      return profiles.map(profile => {
        const userDepts = deptsByUser[profile.id] || [];
        // Fallback to legacy department_id if no assignments exist
        let displayDepartments = userDepts.map(d => d.department_name);
        if (displayDepartments.length === 0 && profile.department_id) {
          const legacyDept = departments.find(d => d.id === profile.department_id);
          if (legacyDept) displayDepartments = [legacyDept.name];
        }
        
        return {
          id: profile.id,
          fullName: profile.full_name || "Unnamed User",
          departments: displayDepartments,
          departmentAssignments: userDepts,
          roles: rolesByUser[profile.id] || [],
          createdAt: new Date(profile.created_at).toLocaleDateString(),
          email: emailsMap.get(profile.id) || "No email found",
          legacyDepartmentId: profile.department_id
        };
      });
    },
  });

  // Fetch department assignment history for a specific user
  const { data: departmentHistory } = useQuery({
    queryKey: ["user-department-history", historyUserId],
    queryFn: async () => {
      if (!historyUserId) return [];
      
      const { data, error } = await supabase
        .from("user_department_assignments")
        .select(`
          id,
          department_id,
          departments(name),
          assigned_at,
          assigned_by,
          removed_at,
          removed_by,
          is_active,
          notes
        `)
        .eq("user_id", historyUserId)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      // Get assigner/remover names
      const assignerIds = [...new Set([
        ...(data || []).map(d => d.assigned_by).filter(Boolean),
        ...(data || []).map(d => d.removed_by).filter(Boolean)
      ])];

      let profilesMap = new Map<string, string>();
      if (assignerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assignerIds);
        
        (profiles || []).forEach(p => profilesMap.set(p.id, p.full_name || 'Unknown'));
      }

      return (data || []).map(d => ({
        ...d,
        department_name: (d.departments as any)?.name || 'Unknown',
        assigned_by_name: d.assigned_by ? profilesMap.get(d.assigned_by) || 'Unknown' : null,
        removed_by_name: d.removed_by ? profilesMap.get(d.removed_by) || 'Unknown' : null
      }));
    },
    enabled: !!historyUserId && isHistoryDialogOpen
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  const addForm = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      role: "",
      departments: [] as string[],
    },
  });

  const editForm = useForm({
    resolver: zodResolver(userFormSchema.omit({ password: true })),
    defaultValues: {
      email: "",
      fullName: "",
      role: "",
      departments: [] as string[]
    }
  });

  // Check if selected role is a manager-type role
  const isManagerRole = (roleId: string) => {
    const role = availableRoles.find(r => r.id === roleId);
    const roleName = role?.name?.toLowerCase() || '';
    return roleName.includes('manager') || roleName.includes('head') || roleName.includes('director');
  };

  const handleDepartmentToggle = (deptId: string, isAdd: boolean) => {
    if (isAdd) {
      setSelectedDepartments(prev => [...prev, deptId]);
    } else {
      setSelectedDepartments(prev => prev.filter(id => id !== deptId));
    }
  };

  const handleAddUser = async (values: any) => {
    try {
      if (!values?.password) {
        toast({
          title: "Password required",
          description: "Please enter a password for the new user.",
          variant: "destructive",
        });
        return;
      }

      const { data: canAssign, error: authError } = await supabase.rpc("can_assign_role", {
        target_user_id: null,
        role_to_assign: values.role,
      });

      if (authError || !canAssign) {
        const roleName = availableRoles.find((r) => r.id === values.role)?.name;
        toast({
          title: "Access Denied",
          description: `You don't have permission to assign the ${roleName || "selected"} role`,
          variant: "destructive",
        });
        return;
      }

      // Use first department as primary (for backward compatibility)
      const primaryDeptId = selectedDepartments.length > 0 ? selectedDepartments[0] : null;

      // Create user via Edge Function
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: values.email,
          password: values.password,
          fullName: values.fullName,
          role_id: values.role,
          department_id: primaryDeptId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newUserId = data?.userId;

      // Create department assignments for all selected departments
      if (newUserId && selectedDepartments.length > 0) {
        for (const deptId of selectedDepartments) {
          await supabase.rpc('assign_user_to_department', {
            p_user_id: newUserId,
            p_department_id: deptId,
            p_assigned_by: user?.id,
            p_notes: 'Initial assignment during user creation'
          });
        }
      }

      toast({
        title: "User added successfully",
        description: `New user ${values.fullName} has been created with ${selectedDepartments.length} department(s).`,
      });

      setIsAddDialogOpen(false);
      addForm.reset();
      setSelectedDepartments([]);
      refetch();
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast({
        title: "Failed to add user",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (userToEdit: any) => {
    setCurrentUser(userToEdit);
    const currentDeptIds = userToEdit.departmentAssignments?.map((d: DepartmentAssignment) => d.department_id) || [];
    // If no assignments, check legacy department_id
    if (currentDeptIds.length === 0 && userToEdit.legacyDepartmentId) {
      currentDeptIds.push(userToEdit.legacyDepartmentId);
    }
    setSelectedDepartments(currentDeptIds);
    
    editForm.reset({
      email: userToEdit.email,
      fullName: userToEdit.fullName,
      role: userToEdit.roles[0]?.id || "",
      departments: currentDeptIds
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (values: any) => {
    if (!currentUser) return;
    
    try {
      // Update profile with primary department
      const primaryDeptId = selectedDepartments.length > 0 ? selectedDepartments[0] : null;
      
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          full_name: values.fullName,
          department_id: primaryDeptId 
        })
        .eq("id", currentUser.id);

      if (profileError) throw profileError;

      // Handle department assignment changes
      const currentDeptIds = currentUser.departmentAssignments?.map((d: DepartmentAssignment) => d.department_id) || [];
      
      // Departments to add
      const deptsToAdd = selectedDepartments.filter(id => !currentDeptIds.includes(id));
      // Departments to remove
      const deptsToRemove = currentDeptIds.filter((id: string) => !selectedDepartments.includes(id));

      // Add new department assignments
      for (const deptId of deptsToAdd) {
        await supabase.rpc('assign_user_to_department', {
          p_user_id: currentUser.id,
          p_department_id: deptId,
          p_assigned_by: user?.id,
          p_notes: 'Assigned during user profile edit'
        });
      }

      // Remove department assignments
      for (const deptId of deptsToRemove) {
        await supabase.rpc('remove_user_from_department', {
          p_user_id: currentUser.id,
          p_department_id: deptId,
          p_removed_by: user?.id,
          p_notes: 'Removed during user profile edit'
        });
      }

      // Handle role update
      const currentRoleId = currentUser.roles[0]?.id;
      if (values.role !== currentRoleId) {
        const { data: canAssign, error: permissionError } = await supabase
          .rpc('can_assign_role', { 
            target_user_id: currentUser.id, 
            role_to_assign: values.role 
          });

        if (permissionError) throw permissionError;

        if (!canAssign) {
          toast({
            title: "Permission denied",
            description: "You do not have permission to assign this role",
            variant: "destructive"
          });
          return;
        }

        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", currentUser.id);

        await supabase
          .from("user_roles")
          .insert({
            user_id: currentUser.id,
            role_id: values.role
          });
      }

      toast({
        title: "User updated successfully",
        description: `${values.fullName}'s information has been updated.`
      });

      setIsEditDialogOpen(false);
      setSelectedDepartments([]);
      refetch();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Failed to update user",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleViewHistory = (userId: string) => {
    setHistoryUserId(userId);
    setIsHistoryDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
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
    } catch (error: any) {
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

  const watchedAddRole = addForm.watch("role");
  const watchedEditRole = editForm.watch("role");
  const showMultiDeptAdd = isManagerRole(watchedAddRole);
  const showMultiDeptEdit = isManagerRole(watchedEditRole);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>System Users</CardTitle>
        {canCreate && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Add User
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Departments</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((userItem) => (
                <TableRow key={userItem.id}>
                  <TableCell>{userItem.fullName}</TableCell>
                  <TableCell>{userItem.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {userItem.departments.length > 0 ? (
                        userItem.departments.map((dept, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Building2 className="w-3 h-3 mr-1" />
                            {dept}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No Department</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {userItem.roles.map((role, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(userItem)} title="Edit User">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleViewHistory(userItem.id)} title="View Department History">
                          <History className="w-4 h-4" />
                        </Button>
                        <ResetPasswordAction userId={userItem.id} userEmail={userItem.email} />
                      </>
                    )}
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
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) setSelectedDepartments([]);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account. Managers can be assigned to multiple departments.</DialogDescription>
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
              
              {/* Department Selection */}
              <FormItem>
                <FormLabel>
                  {showMultiDeptAdd ? "Departments (Multiple Selection)" : "Department"}
                </FormLabel>
                {showMultiDeptAdd ? (
                  <>
                    <FormDescription>
                      Managers can be assigned to multiple departments for budget management.
                    </FormDescription>
                    <ScrollArea className="h-40 border rounded-md p-3">
                      <div className="space-y-2">
                        {departments.map((dept) => (
                          <div key={dept.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`add-dept-${dept.id}`}
                              checked={selectedDepartments.includes(dept.id)}
                              onCheckedChange={(checked) => handleDepartmentToggle(dept.id, !!checked)}
                            />
                            <label htmlFor={`add-dept-${dept.id}`} className="text-sm cursor-pointer">
                              {dept.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {selectedDepartments.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedDepartments.length} department(s) selected
                      </p>
                    )}
                  </>
                ) : (
                  <Select 
                    value={selectedDepartments[0] || ""} 
                    onValueChange={(val) => setSelectedDepartments(val ? [val] : [])}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormItem>

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
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) setSelectedDepartments([]);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information. Changes to department assignments are tracked for audit.</DialogDescription>
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
              
              {/* Department Selection */}
              <FormItem>
                <FormLabel>
                  {showMultiDeptEdit ? "Departments (Multiple Selection)" : "Department"}
                </FormLabel>
                {showMultiDeptEdit ? (
                  <>
                    <FormDescription>
                      Managers can be assigned to multiple departments for budget management.
                    </FormDescription>
                    <ScrollArea className="h-40 border rounded-md p-3">
                      <div className="space-y-2">
                        {departments.map((dept) => (
                          <div key={dept.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-dept-${dept.id}`}
                              checked={selectedDepartments.includes(dept.id)}
                              onCheckedChange={(checked) => handleDepartmentToggle(dept.id, !!checked)}
                            />
                            <label htmlFor={`edit-dept-${dept.id}`} className="text-sm cursor-pointer">
                              {dept.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {selectedDepartments.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedDepartments.length} department(s) selected
                      </p>
                    )}
                  </>
                ) : (
                  <Select 
                    value={selectedDepartments[0] || ""} 
                    onValueChange={(val) => setSelectedDepartments(val ? [val] : [])}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormItem>

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

      {/* Department Assignment History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Department Assignment History
            </DialogTitle>
            <DialogDescription>
              Complete audit trail of department assignments and removals for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {departmentHistory && departmentHistory.length > 0 ? (
              <div className="space-y-3">
                {departmentHistory.map((entry: any) => (
                  <div 
                    key={entry.id} 
                    className={`p-4 rounded-lg border ${entry.is_active ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span className="font-medium">{entry.department_name}</span>
                          {entry.is_active && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Assigned: {format(new Date(entry.assigned_at), 'MMM dd, yyyy HH:mm')}</span>
                            {entry.assigned_by_name && (
                              <span className="text-xs">by {entry.assigned_by_name}</span>
                            )}
                          </div>
                          {entry.removed_at && (
                            <div className="flex items-center gap-1 text-destructive">
                              <Clock className="w-3 h-3" />
                              <span>Removed: {format(new Date(entry.removed_at), 'MMM dd, yyyy HH:mm')}</span>
                              {entry.removed_by_name && (
                                <span className="text-xs">by {entry.removed_by_name}</span>
                              )}
                            </div>
                          )}
                          {entry.notes && (
                            <p className="text-xs italic mt-1">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No department assignment history found for this user.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UsersList;
