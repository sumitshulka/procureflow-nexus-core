import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, UserPlus, Settings, Info } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const assignmentSchema = z.object({
  user_id: z.string().min(1, "Please select a user"),
  custom_role_id: z.string().min(1, "Please select a role"),
});

interface UserData {
  id: string;
  full_name: string | null;
  email?: string;
}

interface RoleData {
  id: string;
  name: string;
  description: string | null;
}

interface AssignmentData {
  id: string;
  user_id: string;
  custom_role_id: string;
  assigned_at: string;
  is_active: boolean;
  user?: UserData;
  role?: RoleData;
}

const UserRoleAssignment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const assignmentForm = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { user_id: "", custom_role_id: "" },
  });

  // Fetch users with their auth emails
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["profiles_for_assignment"],
    queryFn: async () => {
      // Get profiles from public schema
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("status", "active");
      
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Get user emails using Edge Function
      const userIds = profiles.map(profile => profile.id);
      
      const { data: emailsResponse, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      if (emailsError) {
        console.error('Error fetching user emails:', emailsError);
        // Continue without emails if the function fails
        return profiles.map(profile => ({
          id: profile.id,
          full_name: profile.full_name,
          email: undefined
        })) as UserData[];
      }

      // Combine profile data with email data
      const emailsMap = new Map(
        emailsResponse.users?.map((user: any) => [user.id, user.email]) || []
      );

      return profiles.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: emailsMap.get(profile.id)
      })) as UserData[];
    },
  });

  // Fetch custom roles
  const { data: customRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["custom_roles_for_assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as RoleData[];
    },
  });

  // Fetch role assignments with manual joins
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["user_role_assignments"],
    queryFn: async () => {
      // First get the assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("user_role_assignments")
        .select("*")
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });
      
      if (assignmentsError) throw assignmentsError;
      if (!assignmentsData || assignmentsData.length === 0) return [];

      // Get user data
      const userIds = [...new Set(assignmentsData.map(a => a.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      if (usersError) throw usersError;

      // Get role data
      const roleIds = [...new Set(assignmentsData.map(a => a.custom_role_id))];
      const { data: rolesData, error: rolesError } = await supabase
        .from("custom_roles")
        .select("id, name, description")
        .in("id", roleIds);
      
      if (rolesError) throw rolesError;

      // Combine the data
      const result = assignmentsData.map(assignment => ({
        id: assignment.id,
        user_id: assignment.user_id,
        custom_role_id: assignment.custom_role_id,
        assigned_at: assignment.assigned_at,
        is_active: assignment.is_active,
        user: usersData?.find(u => u.id === assignment.user_id) || undefined,
        role: rolesData?.find(r => r.id === assignment.custom_role_id) || undefined
      }));

      return result as AssignmentData[];
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async (values: z.infer<typeof assignmentSchema>) => {
      const { data, error } = await supabase
        .from("user_role_assignments")
        .insert({
          user_id: values.user_id,
          custom_role_id: values.custom_role_id,
          assigned_by: null, // Would be current user in real app
        })
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_role_assignments"] });
      toast({
        title: "Role assigned successfully",
        description: "The user has been assigned the selected role.",
      });
      setIsAssignDialogOpen(false);
      assignmentForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error assigning role",
        description: error.message || "There was a problem assigning the role.",
        variant: "destructive",
      });
    },
  });

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("user_role_assignments")
        .update({ is_active: false })
        .eq("id", assignmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_role_assignments"] });
      toast({
        title: "Role assignment removed",
        description: "The role assignment has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing assignment",
        description: error.message || "There was a problem removing the assignment.",
        variant: "destructive",
      });
    },
  });

  const handleAssignRole = (values: z.infer<typeof assignmentSchema>) => {
    assignRoleMutation.mutate(values);
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    if (confirm("Are you sure you want to remove this role assignment?")) {
      removeAssignmentMutation.mutate(assignmentId);
    }
  };

  // Get user's current roles
  const getUserRoles = (userId: string) => {
    return assignments.filter(assignment => 
      assignment.user_id === userId && assignment.is_active
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation and Setup Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Before assigning roles, make sure you have configured your roles and their module permissions.
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.hash = "#roles"}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configure Roles & Modules
          </Button>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Role Assignments</CardTitle>
            <CardDescription>
              Assign custom roles to users to grant them specific permissions across system modules.
            </CardDescription>
          </div>
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" /> Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Role to User</DialogTitle>
              </DialogHeader>
              <Form {...assignmentForm}>
                <form onSubmit={assignmentForm.handleSubmit(handleAssignRole)} className="space-y-4">
                  <FormField
                    control={assignmentForm.control}
                    name="user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || "Unnamed User"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={assignmentForm.control}
                    name="custom_role_id"
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
                            {customRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{role.name}</span>
                                  {role.description && (
                                    <span className="text-xs text-muted-foreground">
                                      {role.description}
                                    </span>
                                  )}
                                </div>
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
                      disabled={assignRoleMutation.isPending}
                    >
                      {assignRoleMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Assign Role
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {assignmentsLoading || usersLoading || rolesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {customRoles.length === 0 && (
                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No custom roles found. Create roles first in the "Roles & Modules" tab before assigning them to users.
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Assigned Roles</TableHead>
                      <TableHead>Last Assignment</TableHead>
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
                      users.map((user) => {
                        const userRoles = getUserRoles(user.id);
                        const latestAssignment = userRoles[0];
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{user.full_name || "Unnamed User"}</span>
                                {user.email && (
                                  <span className="text-sm text-muted-foreground">{user.email}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {userRoles.length === 0 ? (
                                  <span className="text-muted-foreground text-sm">No roles assigned</span>
                                ) : (
                                  userRoles.map((assignment) => (
                                    <Badge key={assignment.id} variant="secondary">
                                      {assignment.role?.name}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {latestAssignment ? (
                                new Date(latestAssignment.assigned_at).toLocaleDateString()
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    assignmentForm.reset({ 
                                      user_id: user.id, 
                                      custom_role_id: "" 
                                    });
                                    setIsAssignDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Assign
                                </Button>
                                {userRoles.map((assignment) => (
                                  <Button
                                    key={assignment.id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveAssignment(assignment.id)}
                                    disabled={removeAssignmentMutation.isPending}
                                  >
                                    Remove {assignment.role?.name}
                                  </Button>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRoleAssignment;
