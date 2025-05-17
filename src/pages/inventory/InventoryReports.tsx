
import React, { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, FileSpreadsheet, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Sample data for charts - in a real app, this would come from the API
const inventoryLevelData = [
  { name: "Electronics", value: 450, color: "#8884d8" },
  { name: "Office Supplies", value: 300, color: "#82ca9d" },
  { name: "Furniture", value: 120, color: "#ffc658" },
  { name: "Computer Parts", value: 200, color: "#ff8042" },
  { name: "Other", value: 75, color: "#0088fe" },
];

const inventoryTransactionData = [
  { month: "Jan", checkin: 40, checkout: 24, transfer: 10 },
  { month: "Feb", checkin: 30, checkout: 13, transfer: 15 },
  { month: "Mar", checkin: 20, checkout: 35, transfer: 5 },
  { month: "Apr", checkin: 27, checkout: 18, transfer: 12 },
  { month: "May", checkin: 18, checkout: 22, transfer: 8 },
  { month: "Jun", checkin: 23, checkout: 17, transfer: 14 },
];

const productMovementData = [
  { name: "Laptops", checkins: 32, checkouts: 27 },
  { name: "Monitors", checkins: 25, checkouts: 18 },
  { name: "Office Chairs", checkins: 12, checkouts: 10 },
  { name: "Keyboards", checkins: 30, checkouts: 22 },
  { name: "Mice", checkins: 35, checkouts: 31 },
];

const InventoryReports = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(2025, 0, 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<string>("last30days");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");

  // Calculate totals for display in the summary cards
  const totalInventoryValue = inventoryLevelData.reduce((sum, item) => sum + item.value, 0);
  const totalCheckins = inventoryTransactionData.reduce((sum, item) => sum + item.checkin, 0);
  const totalCheckouts = inventoryTransactionData.reduce((sum, item) => sum + item.checkout, 0);

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
              Total Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totalInventoryValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all warehouses
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Check-ins (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCheckins}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCheckins > 100 ? "12% increase" : "5% decrease"} compared to previous period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Check-outs (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCheckouts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCheckouts > 100 ? "8% increase" : "3% decrease"} compared to previous period
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
            <SelectItem value="warehouse1">Main Warehouse</SelectItem>
            <SelectItem value="warehouse2">East Facility</SelectItem>
            <SelectItem value="warehouse3">West Distribution</SelectItem>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryLevelData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {inventoryLevelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
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
                    {inventoryLevelData.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value} units</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t flex justify-between items-center">
                      <span className="font-medium">Total</span>
                      <span className="font-bold">{inventoryLevelData.reduce((acc, item) => acc + item.value, 0)} units</span>
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryTransactionData}>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReports;
