
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import RoleWizard from "./role-management/RoleWizard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const RoleManagement = () => {
  const [activeTab, setActiveTab] = useState("create");

  // Fetch all roles from custom_roles table (all roles are now unified here)
  const { data: allRoles = [], isLoading } = useQuery({
    queryKey: ["all_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*");

      if (error) {
        console.error("Error fetching roles:", error);
        return [];
      }

      return (data || []).map(role => ({
        id: role.id,
        name: role.name || "Unnamed Role",
        description: role.description,
        created_at: role.created_at,
      })) as RoleData[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Management</CardTitle>
        <CardDescription>
          Create and manage roles and their permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="create">Create Role</TabsTrigger>
            <TabsTrigger value="view">View Roles</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            <RoleWizard />
          </TabsContent>
          
          <TabsContent value="view">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No roles found. Create your first role using the wizard.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell>{role.description || "-"}</TableCell>
                          <TableCell>{new Date(role.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RoleManagement;
