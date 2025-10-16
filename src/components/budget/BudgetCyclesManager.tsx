import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/common/DataTable";
import { format } from "date-fns";

const cycleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fiscal_year: z.coerce.number().min(2020).max(2100),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  period_type: z.enum(['monthly', 'quarterly']),
  status: z.enum(['draft', 'open', 'closed', 'archived'])
});

type CycleForm = z.infer<typeof cycleSchema>;

const BudgetCyclesManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<any>(null);

  const form = useForm<CycleForm>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      name: "",
      fiscal_year: new Date().getFullYear(),
      start_date: "",
      end_date: "",
      period_type: "monthly",
      status: "draft"
    }
  });

  const { data: cycles, isLoading, error: queryError } = useQuery({
    queryKey: ['budget-cycles'],
    queryFn: async () => {
      console.log('Fetching budget cycles...');
      const { data, error } = await supabase
        .from('budget_cycles')
        .select('*')
        .order('fiscal_year', { ascending: false });
      
      console.log('Budget cycles result:', { data, error });
      if (error) {
        console.error('Budget cycles error:', error);
        throw error;
      }
      return data || [];
    }
  });

  React.useEffect(() => {
    if (queryError) {
      console.error('Query error:', queryError);
      toast({
        title: "Error loading budget cycles",
        description: queryError instanceof Error ? queryError.message : "Failed to load data",
        variant: "destructive"
      });
    }
  }, [queryError, toast]);

  const createMutation = useMutation({
    mutationFn: async (values: CycleForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('budget_cycles')
        .insert([{ 
          name: values.name,
          fiscal_year: values.fiscal_year,
          start_date: values.start_date,
          end_date: values.end_date,
          period_type: values.period_type,
          status: values.status,
          created_by: user.id 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-cycles'] });
      toast({ title: "Budget cycle created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating budget cycle", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: CycleForm) => {
      const { data, error } = await supabase
        .from('budget_cycles')
        .update(values)
        .eq('id', editingCycle.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-cycles'] });
      toast({ title: "Budget cycle updated successfully" });
      setIsDialogOpen(false);
      setEditingCycle(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating budget cycle", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: CycleForm) => {
    if (editingCycle) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (cycle: any) => {
    setEditingCycle(cycle);
    form.reset({
      name: cycle.name,
      fiscal_year: cycle.fiscal_year,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      period_type: cycle.period_type,
      status: cycle.status
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCycle(null);
    form.reset();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      open: "default",
      closed: "outline",
      archived: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const columns = [
    { 
      id: 'name', 
      header: 'Cycle Name',
      cell: (row: any) => row.name 
    },
    { 
      id: 'fiscal_year', 
      header: 'Fiscal Year',
      cell: (row: any) => row.fiscal_year 
    },
    { 
      id: 'period', 
      header: 'Period',
      cell: (row: any) => (
        <span className="capitalize">
          {format(new Date(row.start_date), 'MMM dd, yyyy')} - {format(new Date(row.end_date), 'MMM dd, yyyy')}
        </span>
      )
    },
    { 
      id: 'period_type', 
      header: 'Type',
      cell: (row: any) => <span className="capitalize">{row.period_type}</span>
    },
    { 
      id: 'status', 
      header: 'Status',
      cell: (row: any) => getStatusBadge(row.status)
    },
    { 
      id: 'actions', 
      header: 'Actions',
      cell: (row: any) => (
        <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
          <Edit className="h-4 w-4" />
        </Button>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Budget Cycles</h2>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCycle ? "Edit Budget Cycle" : "Create Budget Cycle"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cycle Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., FY 2025 Budget" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fiscal_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiscal Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
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
                    name="end_date"
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
                  name="period_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingCycle ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={cycles || []}
        emptyMessage="No budget cycles found. Create one to get started."
      />
    </div>
  );
};

export default BudgetCyclesManager;