
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import RoleWizard from "./role-management/RoleWizard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CombinedRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  type: 'system' | 'custom';
}

const RoleManagement = () => {
  const [activeTab, setActiveTab] = useState("create");

  // Default system roles that are always available
  const defaultSystemRoles = [
    { key: "admin", description: "Full system access with all permissions" },
    { key: "requester", description: "Can create and manage procurement requests" },
    { key: "procurement_officer", description: "Manages procurement processes and RFPs" },
    { key: "inventory_manager", description: "Manages inventory and warehouse operations" },
    { key: "finance_officer", description: "Handles financial operations and invoices" },
    { key: "evaluation_committee", description: "Evaluates vendor proposals and bids" },
    { key: "department_head", description: "Approves department requests and budgets" },
  ];

  // Fetch both system roles and custom roles
  const { data: allRoles = [], isLoading } = useQuery({
    queryKey: ["all_roles"],
    queryFn: async () => {
      const combinedRoles: CombinedRole[] = [];

      // Add all default system roles
      defaultSystemRoles.forEach((role) => {
        combinedRoles.push({
          id: `system-${role.key}`,
          name: role.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: role.description,
          created_at: new Date().toISOString(),
          type: 'system'
        });
      });

      // Fetch custom roles
      const { data: customRolesData, error: customError } = await supabase
        .from("custom_roles")
        .select("*");

      if (customError) {
        console.error("Error fetching custom roles:", customError);
      } else if (customRolesData) {
        customRolesData.forEach(role => {
          combinedRoles.push({
            id: role.id,
            name: role.name || "Unnamed Role",
            description: role.description,
            created_at: role.created_at,
            type: 'custom'
          });
        });
      }

      return combinedRoles;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Management</CardTitle>
        <CardDescription>
          Create and manage system roles and their permissions
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
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No roles found. Create your first role using the wizard.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell>
                            <Badge variant={role.type === 'system' ? 'secondary' : 'default'}>
                              {role.type === 'system' ? 'System' : 'Custom'}
                            </Badge>
                          </TableCell>
                          <TableCell>{role.description || "-"}</TableCell>
                          <TableCell>
                            {role.type === 'custom' 
                              ? new Date(role.created_at).toLocaleDateString() 
                              : '-'}
                          </TableCell>
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
