
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const UnitsManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Units</CardTitle>
        <CardDescription>Manage product measurement units.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Product units management interface would be implemented here, similar to the Categories Manager.</p>
      </CardContent>
    </Card>
  );
};

export default UnitsManager;
