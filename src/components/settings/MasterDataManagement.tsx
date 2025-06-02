
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DepartmentsManager from "./master-data/DepartmentsManager";
import CategoriesManager from "./master-data/CategoriesManager";
import UnitsManager from "./master-data/UnitsManager";
import UserTypesManager from "./master-data/UserTypesManager";
import ProductClassificationsManager from "./master-data/ProductClassificationsManager";

const MasterDataManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Master Data Management</h2>
        <p className="text-muted-foreground">
          Configure and manage all reference data used throughout the system.
        </p>
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="w-full bg-muted h-11 mb-6">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="categories">Product Categories</TabsTrigger>
          <TabsTrigger value="classifications">Product Classifications</TabsTrigger>
          <TabsTrigger value="units">Product Units</TabsTrigger>
          <TabsTrigger value="user-types">User Types</TabsTrigger>
        </TabsList>
        
        <TabsContent value="departments">
          <DepartmentsManager />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoriesManager />
        </TabsContent>
        
        <TabsContent value="classifications">
          <ProductClassificationsManager />
        </TabsContent>
        
        <TabsContent value="units">
          <UnitsManager />
        </TabsContent>
        
        <TabsContent value="user-types">
          <UserTypesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterDataManagement;
