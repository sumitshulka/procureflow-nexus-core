import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2 } from "lucide-react";

const budgetAllocationSchema = z.object({
  department: z.string().min(1, "Department is required"),
  category: z.string().min(1, "Category is required"),
  allocatedAmount: z.number().min(0, "Amount must be positive"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().optional(),
});

type BudgetAllocationForm = z.infer<typeof budgetAllocationSchema>;

const BudgetAllocation = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<any>(null);

  const form = useForm<BudgetAllocationForm>({
    resolver: zodResolver(budgetAllocationSchema),
    defaultValues: {
      department: "",
      category: "",
      allocatedAmount: 0,
      startDate: "",
      endDate: "",
      description: "",
    },
  });

  // Mock data - replace with actual database queries
  const allocations = [
    {
      id: "1",
      department: "IT",
      category: "Equipment",
      allocatedAmount: 500000,
      spentAmount: 320000,
      remainingAmount: 180000,
      utilizationRate: 64,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      status: "active",
      description: "IT equipment and infrastructure"
    },
    {
      id: "2",
      department: "HR",
      category: "Personnel",
      allocatedAmount: 600000,
      spentAmount: 450000,
      remainingAmount: 150000,
      utilizationRate: 75,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      status: "active",
      description: "HR personnel costs"
    },
    // Add more mock data as needed
  ];

  const departments = ["IT", "HR", "Operations", "Marketing", "Finance"];
  const categories = ["Personnel", "Equipment", "Services", "Travel", "Utilities"];

  const columns = [
    {
      id: "department",
      header: "Department",
      cell: (row: any) => row.department,
    },
    {
      id: "category",
      header: "Category",
      cell: (row: any) => row.category,
    },
    {
      id: "allocatedAmount",
      header: "Allocated",
      cell: (row: any) => `$${row.allocatedAmount.toLocaleString()}`,
    },
    {
      id: "spentAmount",
      header: "Spent",
      cell: (row: any) => `$${row.spentAmount.toLocaleString()}`,
    },
    {
      id: "remainingAmount",
      header: "Remaining",
      cell: (row: any) => `$${row.remainingAmount.toLocaleString()}`,
    },
    {
      id: "utilizationRate",
      header: "Utilization",
      cell: (row: any) => (
        <Badge variant={row.utilizationRate > 80 ? "destructive" : row.utilizationRate > 60 ? "secondary" : "default"}>
          {row.utilizationRate}%
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row: any) => (
        <Badge variant={row.status === "active" ? "default" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEdit = (allocation: any) => {
    setEditingAllocation(allocation);
    form.reset({
      department: allocation.department,
      category: allocation.category,
      allocatedAmount: allocation.allocatedAmount,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
      description: allocation.description,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // Implement delete functionality
    console.log("Delete allocation:", id);
  };

  const onSubmit = (data: BudgetAllocationForm) => {
    console.log("Form data:", data);
    // Here you would save to database
    setIsDialogOpen(false);
    setEditingAllocation(null);
    form.reset();
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAllocation(null);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Budget Allocations</h2>
          <p className="text-sm text-muted-foreground">
            Manage budget allocations across departments and categories
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Allocation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingAllocation ? "Edit Budget Allocation" : "Create Budget Allocation"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="allocatedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allocated Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAllocation ? "Update" : "Create"} Allocation
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={allocations}
            emptyMessage="No budget allocations found"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetAllocation;
