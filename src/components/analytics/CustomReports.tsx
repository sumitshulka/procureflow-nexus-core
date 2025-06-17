
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, Play, Save } from "lucide-react";
import { addDays } from "date-fns";

interface CustomDateRange {
  from: Date;
  to: Date;
}

interface ReportField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in';
  value: string;
}

const AVAILABLE_TABLES = [
  { value: 'purchase_orders', label: 'Purchase Orders' },
  { value: 'procurement_requests', label: 'Procurement Requests' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'products', label: 'Products' },
  { value: 'inventory_items', label: 'Inventory Items' },
  { value: 'categories', label: 'Categories' },
];

const FIELD_MAPPINGS: Record<string, ReportField[]> = {
  purchase_orders: [
    { name: 'po_number', label: 'PO Number', type: 'string' },
    { name: 'final_amount', label: 'Final Amount', type: 'number' },
    { name: 'po_date', label: 'PO Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'string' },
    { name: 'vendor_id', label: 'Vendor ID', type: 'string' },
  ],
  procurement_requests: [
    { name: 'title', label: 'Title', type: 'string' },
    { name: 'status', label: 'Status', type: 'string' },
    { name: 'priority', label: 'Priority', type: 'string' },
    { name: 'created_at', label: 'Created At', type: 'date' },
    { name: 'total_estimated_cost', label: 'Estimated Cost', type: 'number' },
  ],
  vendors: [
    { name: 'name', label: 'Name', type: 'string' },
    { name: 'email', label: 'Email', type: 'string' },
    { name: 'status', label: 'Status', type: 'string' },
    { name: 'created_at', label: 'Created At', type: 'date' },
  ],
  products: [
    { name: 'name', label: 'Product Name', type: 'string' },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'category_id', label: 'Category ID', type: 'string' },
    { name: 'created_at', label: 'Created At', type: 'date' },
  ],
  inventory_items: [
    { name: 'product_id', label: 'Product ID', type: 'string' },
    { name: 'quantity', label: 'Quantity', type: 'number' },
    { name: 'location', label: 'Location', type: 'string' },
    { name: 'last_updated', label: 'Last Updated', type: 'date' },
  ],
  categories: [
    { name: 'name', label: 'Category Name', type: 'string' },
    { name: 'description', label: 'Description', type: 'string' },
    { name: 'created_at', label: 'Created At', type: 'date' },
  ],
};

const CustomReports = () => {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [groupBy, setGroupBy] = useState<string>("none");
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [dateRange, setDateRange] = useState<CustomDateRange>({
    from: addDays(new Date(), -30),
    to: new Date()
  });
  const [reportName, setReportName] = useState<string>("");

  const generateReport = async () => {
    if (!selectedTable || selectedFields.length === 0) {
      throw new Error("Please select a table and at least one field");
    }

    let query = supabase.from(selectedTable as any).select(selectedFields.join(','));

    // Apply filters
    filters.forEach(filter => {
      if (filter.field && filter.operator && filter.value) {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.field, filter.value);
            break;
          case 'neq':
            query = query.neq(filter.field, filter.value);
            break;
          case 'gt':
            query = query.gt(filter.field, filter.value);
            break;
          case 'lt':
            query = query.lt(filter.field, filter.value);
            break;
          case 'gte':
            query = query.gte(filter.field, filter.value);
            break;
          case 'lte':
            query = query.lte(filter.field, filter.value);
            break;
          case 'like':
            query = query.like(filter.field, `%${filter.value}%`);
            break;
        }
      }
    });

    // Apply date range if applicable
    const hasDateField = selectedFields.some(field => 
      FIELD_MAPPINGS[selectedTable]?.find(f => f.name === field && f.type === 'date')
    );
    
    if (hasDateField) {
      const dateField = selectedFields.find(field => 
        FIELD_MAPPINGS[selectedTable]?.find(f => f.name === field && f.type === 'date')
      );
      if (dateField) {
        query = query.gte(dateField, dateRange.from.toISOString())
                  .lte(dateField, dateRange.to.toISOString());
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  };

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["custom_report", selectedTable, selectedFields, filters, dateRange],
    queryFn: generateReport,
    enabled: false, // Only run when triggered
  });

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: 'eq', value: '' }]);
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const toggleField = (fieldName: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldName) 
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const runReport = () => {
    refetch();
  };

  const exportReport = () => {
    if (!reportData) return;
    
    const csv = [
      selectedFields.join(','),
      ...reportData.map(row => selectedFields.map(field => row[field] || '').join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName || 'custom_report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    if (!reportData || reportData.length === 0) return null;

    const data = reportData.slice(0, 10); // Limit for better visualization

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedFields[0]} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={selectedFields[1] || selectedFields[0]} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={selectedFields[0]} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={selectedFields[1] || selectedFields[0]} stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        const pieData = data.map((item, index) => ({
          name: item[selectedFields[0]] || `Item ${index + 1}`,
          value: parseFloat(item[selectedFields[1] || selectedFields[0]]) || 1
        }));
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const currentFields = selectedTable ? FIELD_MAPPINGS[selectedTable] || [] : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Report Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Name</label>
            <Input
              placeholder="Enter report name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>

          {/* Data Source Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Source</label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger>
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TABLES.map(table => (
                  <SelectItem key={table.value} value={table.value}>
                    {table.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field Selection */}
          {selectedTable && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Fields</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {currentFields.map(field => (
                  <div key={field.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.name}
                      checked={selectedFields.includes(field.name)}
                      onCheckedChange={() => toggleField(field.name)}
                    />
                    <label htmlFor={field.name} className="text-sm">
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Filters</label>
              <Button size="sm" onClick={addFilter}>Add Filter</Button>
            </div>
            {filters.map((filter, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Select value={filter.field} onValueChange={(value) => updateFilter(index, { field: value })}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentFields.map(field => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filter.operator} onValueChange={(value: FilterCondition['operator']) => updateFilter(index, { operator: value })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eq">Equals</SelectItem>
                    <SelectItem value="neq">Not Equals</SelectItem>
                    <SelectItem value="gt">Greater Than</SelectItem>
                    <SelectItem value="lt">Less Than</SelectItem>
                    <SelectItem value="gte">Greater or Equal</SelectItem>
                    <SelectItem value="lte">Less or Equal</SelectItem>
                    <SelectItem value="like">Contains</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, { value: e.target.value })}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={() => removeFilter(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <DatePickerWithRange 
              date={dateRange} 
              onDateChange={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }} 
            />
          </div>

          {/* Group By */}
          {selectedTable && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Group By</label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field to group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  {currentFields.map(field => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Chart Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Chart Type</label>
            <Select value={chartType} onValueChange={(value: 'bar' | 'line' | 'pie') => setChartType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={runReport} disabled={!selectedTable || selectedFields.length === 0 || isLoading}>
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? 'Running...' : 'Run Report'}
            </Button>
            <Button variant="outline" onClick={exportReport} disabled={!reportData}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {reportData && (
        <div className="space-y-6">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart()}
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Data Results ({reportData.length} rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      {selectedFields.map(field => (
                        <th key={field} className="border border-gray-300 px-4 py-2 text-left">
                          {currentFields.find(f => f.name === field)?.label || field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.slice(0, 100).map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {selectedFields.map(field => (
                          <td key={field} className="border border-gray-300 px-4 py-2">
                            {row[field]?.toString() || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportData.length > 100 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 100 rows of {reportData.length} total rows
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomReports;
