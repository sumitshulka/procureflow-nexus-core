
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryValuationReport from "./InventoryValuationReport";
import StockMovementReport from "./StockMovementReport";
import StockAgingReport from "./StockAgingReport";

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
          <StockMovementReport />
        </TabsContent>
        
        <TabsContent value="aging">
          <StockAgingReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReports;
