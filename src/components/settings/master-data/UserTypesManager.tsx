
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const UserTypesManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Types</CardTitle>
        <CardDescription>Manage user roles and permissions.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">User types and roles management interface would be implemented here, similar to the Categories Manager.</p>
      </CardContent>
    </Card>
  );
};

export default UserTypesManager;
