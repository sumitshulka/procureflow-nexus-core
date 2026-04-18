
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DepartmentsManager from "./master-data/DepartmentsManager";
import CategoriesManager from "./master-data/CategoriesManager";
import UnitsManager from "./master-data/UnitsManager";
import UserTypesManager from "./master-data/UserTypesManager";
import ProductClassificationsManager from "./master-data/ProductClassificationsManager";
import TaxTypesManager from "./master-data/TaxTypesManager";
import TaxCodesManager from "./master-data/TaxCodesManager";

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
        <div className="overflow-x-auto mb-6">
          <TabsList className="w-max min-w-full bg-muted h-11 flex-nowrap justify-start">
            <TabsTrigger value="departments" className="whitespace-nowrap shrink-0">Departments</TabsTrigger>
            <TabsTrigger value="categories" className="whitespace-nowrap shrink-0">Product Categories</TabsTrigger>
            <TabsTrigger value="classifications" className="whitespace-nowrap shrink-0">Product Classifications</TabsTrigger>
            <TabsTrigger value="units" className="whitespace-nowrap shrink-0">Product Units</TabsTrigger>
            <TabsTrigger value="user-types" className="whitespace-nowrap shrink-0">User Types</TabsTrigger>
            <TabsTrigger value="tax-types" className="whitespace-nowrap shrink-0">Tax Types</TabsTrigger>
            <TabsTrigger value="tax-codes" className="whitespace-nowrap shrink-0">Tax Codes</TabsTrigger>
          </TabsList>
        </div>
        
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
        
        <TabsContent value="tax-types">
          <TaxTypesManager />
        </TabsContent>
        
        <TabsContent value="tax-codes">
          <TaxCodesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MasterDataManagement;
