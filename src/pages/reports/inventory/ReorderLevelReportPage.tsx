import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ReorderLevelReportPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ["reorder-level-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          *,
          products:product_id (id, name, category_id, categories:category_id (name)),
          warehouses:warehouse_id (name)
        `)
        .not("reorder_level", "is", null);
      
      if (error) throw error;
      
      // Filter items at or below reorder level
      return (data || []).filter(item => item.quantity <= item.reorder_level);
    },
  });

  const getUrgencyLevel = (quantity: number, reorderLevel: number, minimumLevel: number | null) => {
    if (minimumLevel && quantity <= minimumLevel) return "critical";
    if (quantity <= reorderLevel * 0.5) return "high";
    if (quantity <= reorderLevel) return "medium";
    return "low";
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const filteredItems = inventoryItems.filter((item: any) => {
    const urgency = getUrgencyLevel(item.quantity, item.reorder_level, item.minimum_level);
    const matchesSearch = item.products?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = urgencyFilter === "all" || urgency === urgencyFilter;
    return matchesSearch && matchesUrgency;
  });

  const criticalCount = inventoryItems.filter((item: any) => 
    getUrgencyLevel(item.quantity, item.reorder_level, item.minimum_level) === "critical"
  ).length;

  const highCount = inventoryItems.filter((item: any) => 
    getUrgencyLevel(item.quantity, item.reorder_level, item.minimum_level) === "high"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Reorder Level Report"
          description="Items that have reached or fallen below reorder levels"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryItems.length}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-500">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{highCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Medium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryItems.length - criticalCount - highCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead className="text-right">Minimum Level</TableHead>
                  <TableHead className="text-right">Shortage</TableHead>
                  <TableHead>Urgency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any) => {
                  const urgency = getUrgencyLevel(item.quantity, item.reorder_level, item.minimum_level);
                  const shortage = item.reorder_level - item.quantity;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.products?.name}</TableCell>
                      <TableCell>{item.products?.categories?.name || "-"}</TableCell>
                      <TableCell>{item.warehouses?.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.reorder_level}</TableCell>
                      <TableCell className="text-right">{item.minimum_level || "-"}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">{shortage}</TableCell>
                      <TableCell>{getUrgencyBadge(urgency)}</TableCell>
                    </TableRow>
                  );
                })}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No items below reorder level
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

export default ReorderLevelReportPage;
