
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types";

const UserTypesManager = () => {
  // List all available user roles from the UserRole enum
  const roles = Object.values(UserRole);
  
  // Map roles to descriptions
  const roleDescriptions: Record<string, string> = {
    [UserRole.ADMIN]: "Full system access with all permissions.",
    [UserRole.REQUESTER]: "Can create and view procurement requests.",
    [UserRole.PROCUREMENT_OFFICER]: "Manages the procurement process and vendor relationships.",
    [UserRole.INVENTORY_MANAGER]: "Manages product catalog and inventory levels.",
    [UserRole.FINANCE_OFFICER]: "Handles financial aspects of procurement.",
    [UserRole.VENDOR]: "External supplier with limited access.",
    [UserRole.EVALUATION_COMMITTEE]: "Evaluates and scores vendor proposals.",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Types</CardTitle>
        <CardDescription>View available user roles in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role}>
                  <TableCell className="font-medium">
                    {role.replace('_', ' ').charAt(0).toUpperCase() + 
                     role.replace('_', ' ').slice(1).toLowerCase()}
                  </TableCell>
                  <TableCell>{roleDescriptions[role] || "No description available."}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            User roles are defined at the system level and determine access permissions 
            throughout the application. Role permissions can be configured in the User Management 
            section under Role Management.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserTypesManager;
