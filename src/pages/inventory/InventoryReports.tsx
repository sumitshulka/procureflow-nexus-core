import React, { useState, useEffect } from "react";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, FileSpreadsheet, CalendarRange, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

// Monthly time period options
const TIME_PERIODS = {
  last7days: { label: "Last 7 Days", days: 7 },
  last30days: { label: "Last 30 Days", days: 30 },
  last90days: { label: "Last 90 Days", days: 90 },
  custom: { label: "Custom Range", days: null },
};

const InventoryReports = () => {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<string>("last30days");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");

  useEffect(() => {
    // Update date range when period changes
    if (dateRange !== "custom" && TIME_PERIODS[dateRange]) {
      const days = TIME_PERIODS[dateRange].days;
      if (days) {
        setEndDate(new Date());
        setStartDate(new Date(new Date().setDate(new Date().getDate() - days)));
      }
    }
  }, [dateRange]);

  // Format dates for queries
  const formattedStartDate = startDate ? startDate.toISOString() : undefined;
  const formattedEndDate = endDate ? endDate.toISOString() : undefined;

  // Fetch warehouses for filter
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses_for_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("is_active", true);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch inventory levels data
  const { data: inventoryData = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventory_levels", warehouseFilter],
    queryFn: async () => {
      try {
        let query = supabase
          .from("inventory_items")
          .select(`
            quantity,
            product:product_id(
              name,
              category:category_id(name)
            )
          `);
        
        if (warehouseFilter !== "all") {
          query = query.eq("warehouse_id", warehouseFilter);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Process data to group by category
        const categoryTotals = {};
        const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", "#00C49F", "#FFBB28"];
        
        data.forEach(item => {
          const categoryName = item.product?.category?.name || "Uncategorized";
          if (!categoryTotals[categoryName]) {
            categoryTotals[categoryName] = 0;
          }
          categoryTotals[categoryName] += item.quantity;
        });
        
        // Convert to array for the chart
        return Object.entries(categoryTotals).map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length]
        }));
      } catch (error) {
        console.error("Error fetching inventory levels:", error);
        toast({
          title: "Error",
          description: "Failed to load inventory data",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Fetch transaction data
  const { data: transactionData = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["inventory_transactions_summary", formattedStartDate, formattedEndDate, warehouseFilter],
    queryFn: async () => {
      try {
        // First determine the date ranges for each month in the period
        const months = [];
        const currentDate = new Date(startDate || new Date());
        const end = new Date(endDate || new Date());
        
        while (currentDate <= end) {
          months.push({
            month: format(currentDate, "MMM"),
            year: format(currentDate, "yyyy"),
            startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
            endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString(),
          });
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        // Create an array to store results for each month
        const results = [];
        
        // For each month, query transaction counts
        for (const monthData of months) {
          let checkInQuery = supabase
            .from("inventory_transactions")
            .select("id")
            .eq("type", "check_in")
            .gte("transaction_date", monthData.startDate)
            .lte("transaction_date", monthData.endDate);
            
          let checkOutQuery = supabase
            .from("inventory_transactions")
            .select("id")
            .eq("type", "check_out")
            .gte("transaction_date", monthData.startDate)
            .lte("transaction_date", monthData.endDate);
            
          let transferQuery = supabase
            .from("inventory_transactions")
            .select("id")
            .eq("type", "transfer")
            .gte("transaction_date", monthData.startDate)
            .lte("transaction_date", monthData.endDate);
          
          // Apply warehouse filter if needed
          if (warehouseFilter !== "all") {
            checkInQuery = checkInQuery.eq("target_warehouse_id", warehouseFilter);
            checkOutQuery = checkOutQuery.eq("source_warehouse_id", warehouseFilter);
            transferQuery = transferQuery.or(`source_warehouse_id.eq.${warehouseFilter},target_warehouse_id.eq.${warehouseFilter}`);
          }
          
          // Execute all queries
          const [checkInData, checkOutData, transferData] = await Promise.all([
            checkInQuery,
            checkOutQuery,
            transferQuery
          ]);
          
          results.push({
            month: monthData.month,
            checkin: checkInData.data?.length || 0,
            checkout: checkOutData.data?.length || 0,
            transfer: transferData.data?.length || 0
          });
        }
        
        return results;
      } catch (error) {
        console.error("Error fetching transaction data:", error);
        toast({
          title: "Error",
          description: "Failed to load transaction data",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Fetch product movement data
  const { data: productMovementData = [], isLoading: isLoadingProductMovement } = useQuery({
    queryKey: ["product_movement", formattedStartDate, formattedEndDate, warehouseFilter],
    queryFn: async () => {
      try {
        // Calculate check-ins and check-outs by product
        let productQuery = supabase
          .from("inventory_transactions")
          .select(`
            product_id,
            quantity,
            type,
            product:product_id(name)
          `)
          .in("type", ["check_in", "check_out"])
          .gte("transaction_date", formattedStartDate)
          .lte("transaction_date", formattedEndDate);
        
        // Apply warehouse filter if selected
        if (warehouseFilter !== "all") {
          productQuery = productQuery.or(
            `and(type.eq.check_in,target_warehouse_id.eq.${warehouseFilter}),` +
            `and(type.eq.check_out,source_warehouse_id.eq.${warehouseFilter})`
          );
        }
        
        const { data, error } = await productQuery;
        
        if (error) throw error;
        
        // Process data to group by product
        const productTotals = {};
        
        data.forEach(item => {
          const productName = item.product?.name || "Unknown Product";
          if (!productTotals[productName]) {
            productTotals[productName] = { name: productName, checkins: 0, checkouts: 0 };
          }
          
          if (item.type === "check_in") {
            productTotals[productName].checkins += item.quantity;
          } else if (item.type === "check_out") {
            productTotals[productName].checkouts += item.quantity;
          }
        });
        
        // Sort by total movement (checkins + checkouts)
        return Object.values(productTotals)
          .sort((a: any, b: any) => (b.checkins + b.checkouts) - (a.checkins + a.checkouts))
          .slice(0, 5); // Get top 5 products
      } catch (error) {
        console.error("Error fetching product movement:", error);
        toast({
          title: "Error",
          description: "Failed to load product movement data",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Calculate summary statistics
  const totalInventoryItems = inventoryData.reduce((sum, item) => sum + (item.value as number), 0);
  const totalCheckins = transactionData.reduce((sum, item) => sum + item.checkin, 0);
  const totalCheckouts = transactionData.reduce((sum, item) => sum + item.checkout, 0);
  
  const renderLoadingState = () => (
    <div className="flex justify-center items-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
      <span>Loading data...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Reports"
        description="Access inventory analytics and generate reports"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Inventory Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingInventory ? <Loader2 className="h-4 w-4 animate-spin" /> : totalInventoryItems.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Units across all categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Check-ins ({TIME_PERIODS[dateRange]?.label || "Selected Period"})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingTransactions ? <Loader2 className="h-4 w-4 animate-spin" /> : totalCheckins.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formattedStartDate && formattedEndDate ? 
                `From ${format(new Date(formattedStartDate), "MMM d, yyyy")} to ${format(new Date(formattedEndDate), "MMM d, yyyy")}` 
                : "All time"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Check-outs ({TIME_PERIODS[dateRange]?.label || "Selected Period"})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingTransactions ? <Loader2 className="h-4 w-4 animate-spin" /> : totalCheckouts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formattedStartDate && formattedEndDate ? 
                `From ${format(new Date(formattedStartDate), "MMM d, yyyy")} to ${format(new Date(formattedEndDate), "MMM d, yyyy")}` 
                : "All time"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
        <Select
          value={dateRange}
          onValueChange={setDateRange}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last7days">Last 7 days</SelectItem>
            <SelectItem value="last30days">Last 30 days</SelectItem>
            <SelectItem value="last90days">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom range...</SelectItem>
          </SelectContent>
        </Select>

        {dateRange === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarRange className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarRange className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <Select
          value={warehouseFilter}
          onValueChange={setWarehouseFilter}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map(warehouse => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory Levels</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="products">Product Movement</TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Category</CardTitle>
              <CardDescription>
                Current inventory levels organized by product category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInventory ? (
                renderLoadingState()
              ) : inventoryData.length === 0 ? (
                <div className="text-center p-6">
                  <p>No inventory data available for the selected filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inventoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${String(name)}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {inventoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={String(entry.color)} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} units`, 'Quantity']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-3">Summary</h3>
                    <div className="space-y-2">
                      {inventoryData.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: String(item.color) }}></div>
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">{item.value} units</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-2 border-t flex justify-between items-center">
                        <span className="font-medium">Total</span>
                        <span className="font-bold">{totalInventoryItems} units</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Overview of inventory movements over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                renderLoadingState()
              ) : transactionData.length === 0 ? (
                <div className="text-center p-6">
                  <p>No transaction data available for the selected period</p>
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transactionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="checkin" name="Check-ins" fill="#82ca9d" />
                      <Bar dataKey="checkout" name="Check-outs" fill="#8884d8" />
                      <Bar dataKey="transfer" name="Transfers" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Movement</CardTitle>
              <CardDescription>
                Check-ins and check-outs by product
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProductMovement ? (
                renderLoadingState()
              ) : productMovementData.length === 0 ? (
                <div className="text-center p-6">
                  <p>No product movement data available for the selected period</p>
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productMovementData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="checkins" name="Check-ins" fill="#8884d8" />
                      <Bar dataKey="checkouts" name="Check-outs" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReports;
