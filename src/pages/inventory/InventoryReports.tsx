
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import InventoryValuationReport from "./InventoryValuationReport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const InventoryReports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory Reports</h2>
        <p className="text-muted-foreground">
          Generate comprehensive inventory reports and analytics
        </p>
      </div>

      <Tabs defaultValue="valuation" className="w-full">
        <TabsList className="bg-muted h-10">
          <TabsTrigger value="valuation">Inventory Valuation</TabsTrigger>
          <TabsTrigger value="movement">Stock Movement</TabsTrigger>
          <TabsTrigger value="aging">Stock Aging</TabsTrigger>
        </TabsList>
        
        <TabsContent value="valuation">
          <InventoryValuationReport />
        </TabsContent>
        
        <TabsContent value="movement">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement Report</CardTitle>
              <CardDescription>
                Track inventory movements and transactions over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Stock movement report coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle>Stock Aging Report</CardTitle>
              <CardDescription>
                Analyze inventory aging and identify slow-moving items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Stock aging report coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReports;
