
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, MoreHorizontal, Pencil, UserCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// User schema for form validation
const userSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  employeeId: z.string().optional(),
  mobile: z.string().optional(),
  department: z.string().optional(),
  role: z.string().min(1, "Role is required"),
});

// Interface for user data display
interface UserData {
  id: string;
  email: string;
  fullName: string | null;
  employeeId: string | null;
  mobile: string | null;
  department: string | null;
  departmentName: string | null;
  status: string | null;
  roles: string[];
  createdAt: string;
}

// Interface for department data
interface DepartmentData {
  id: string;
  name: string;
}

const UsersList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  
  // Form setup for creating new users
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      employeeId: "",
      mobile: "",
      department: "",
      role: UserRole.REQUESTER,
    },
  });
  
  // Form setup for editing users
  const editForm = useForm({
    resolver: zodResolver(
      z.object({
        fullName: z.string().min(1, "Full name is required"),
        employeeId: z.string().optional(),
        mobile: z.string().optional(),
        department: z.string().optional(),
        status: z.string().optional(),
      })
    ),
    defaultValues: {
      fullName: "",
      employeeId: "",
      mobile: "",
      department: "",
      status: "active",
    },
  });
  
  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name");
      
      if (error) throw error;
      return data as DepartmentData[];
    },
  });
  
  // Fetch users with their roles and department info
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      // Get all users with their profile data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          employee_id,
          mobile,
          department,
          status,
          created_at
        `);
        
      if (profilesError) throw profilesError;
      
      // Get department names
      const departmentIds = profiles
        .filter(profile => profile.department)
        .map(profile => profile.department);
        
      let departmentMap: Record<string, string> = {};
      
      if (departmentIds.length > 0) {
        const { data: deptData } = await supabase
          .from("departments")
          .select("id, name")
          .in("id", departmentIds);
          
        if (deptData) {
          departmentMap = deptData.reduce((acc, dept) => {
            acc[dept.id] = dept.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }
      
      // Get user roles
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
          employeeId: profile.employee_id,
          mobile: profile.mobile,
          department: profile.department,
          departmentName: profile.department ? departmentMap[profile.department] : null,
          status: profile.status,
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
      // Then update the profile with additional data
      if (data.user) {
        // Update profile with additional fields
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: values.fullName,
            employee_id: values.employeeId || null,
            mobile: values.mobile || null,
            department: values.department || null,
          })
          .eq("id", data.user.id);
          
        if (profileError) throw profileError;
        
        // Assign the selected role
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

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (values: { id: string, data: any }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.data.fullName,
          employee_id: values.data.employeeId || null,
          mobile: values.data.mobile || null,
          department: values.data.department || null,
          status: values.data.status || "active"
        })
        .eq("id", values.id);
        
      if (error) throw error;
      
      return values;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User updated",
        description: "The user has been successfully updated.",
      });
      setIsEditOpen(false);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error updating user",
        description: error.message || "There was a problem updating the user.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for new user
  const onSubmit = (values: z.infer<typeof userSchema>) => {
    createUserMutation.mutate(values);
  };
  
  // Handle form submission for editing user
  const onEditSubmit = (values: any) => {
    if (!currentUser) return;
    
    updateUserMutation.mutate({
      id: currentUser.id,
      data: values
    });
  };
  
  // Open edit dialog with user data
  const handleEditUser = (userData: UserData) => {
    setCurrentUser(userData);
    editForm.reset({
      fullName: userData.fullName || "",
      employeeId: userData.employeeId || "",
      mobile: userData.mobile || "",
      department: userData.department || "",
      status: userData.status || "active"
    });
    setIsEditOpen(true);
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
          <DialogContent className="max-w-md">
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
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                </div>
                
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
                            <SelectItem key={role} value={role}>
                              {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1).toLowerCase()}
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

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
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
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
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
                </div>
                
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "active"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
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
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update User
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
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No users found. Create your first user to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((userData) => (
                    <TableRow key={userData.id}>
                      <TableCell className="font-medium">{userData.fullName || '-'}</TableCell>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>{userData.employeeId || '-'}</TableCell>
                      <TableCell>{userData.departmentName || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          userData.status === 'active' ? 'bg-green-100 text-green-800' :
                          userData.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          userData.status === 'suspended' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {userData.status || 'Active'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userData.roles.map((role, idx) => (
                            <span key={idx} className="px-2 py-1 bg-muted rounded-full text-xs">
                              {role}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(userData)}>
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
  );
};

export default UsersList;
