
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const DepartmentsManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Departments</CardTitle>
        <CardDescription>Manage organization departments.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Department management interface would be implemented here, similar to the Categories Manager.</p>
      </CardContent>
    </Card>
  );
};

export default DepartmentsManager;
