
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const UserManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Manage users and their access permissions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            View and manage system users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">User management interface would be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
