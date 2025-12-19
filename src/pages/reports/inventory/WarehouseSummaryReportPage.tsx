import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, ArrowLeft, Warehouse, Package, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/currencyUtils";

const WarehouseSummaryReportPage = () => {
  const navigate = useNavigate();

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inventoryData = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["warehouse-inventory-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          *,
          products:product_id (id, name, current_price),
          warehouses:warehouse_id (id, name)
        `);
      if (error) throw error;
      return data || [];
    },
  });

  const warehouseSummary = warehouses.map((warehouse: any) => {
    const items = inventoryData.filter((item: any) => item.warehouse_id === warehouse.id);
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * (item.products?.current_price || 0));
    }, 0);
    const lowStockItems = items.filter((item: any) => 
      item.reorder_level && item.quantity <= item.reorder_level
    ).length;

    return {
      ...warehouse,
      totalItems,
      totalQuantity,
      totalValue,
      lowStockItems,
    };
  });

  const totalStats = {
    totalWarehouses: warehouses.length,
    totalProducts: inventoryData.length,
    totalQuantity: inventoryData.reduce((sum: number, item: any) => sum + item.quantity, 0),
    totalValue: inventoryData.reduce((sum: number, item: any) => {
      return sum + (item.quantity * (item.products?.current_price || 0));
    }, 0),
  };

  const isLoading = warehousesLoading || inventoryLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Warehouse Summary Report"
          description="Stock summary across all warehouses with capacity utilization"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Total Warehouses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalWarehouses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalQuantity.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Warehouse Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Total Quantity</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Low Stock Items</TableHead>
                  <TableHead>Stock Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseSummary.map((warehouse: any) => {
                  const healthPercentage = warehouse.totalItems > 0 
                    ? Math.round(((warehouse.totalItems - warehouse.lowStockItems) / warehouse.totalItems) * 100)
                    : 100;
                  
                  return (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium">{warehouse.name}</TableCell>
                      <TableCell>{warehouse.location || "-"}</TableCell>
                      <TableCell className="text-right">{warehouse.totalItems}</TableCell>
                      <TableCell className="text-right">{warehouse.totalQuantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(warehouse.totalValue)}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {warehouse.lowStockItems}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={healthPercentage} className="w-20" />
                          <span className="text-sm text-muted-foreground">{healthPercentage}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {warehouseSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No warehouses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WarehouseSummaryReportPage;
