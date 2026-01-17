import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/common/DataTable";

const headSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  type: z.enum(["income", "expenditure"]).default("expenditure"),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().default(0),
  allow_department_subitems: z.boolean().default(false)
});

type HeadForm = z.infer<typeof headSchema>;

const BudgetHeadsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<any>(null);

  const form = useForm<HeadForm>({
    resolver: zodResolver(headSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      type: "expenditure",
      is_active: true,
      display_order: 0,
      allow_department_subitems: false
    }
  });

  const { data: heads, isLoading, error: queryError } = useQuery({
    queryKey: ['budget-heads'],
    queryFn: async () => {
      console.log('Fetching budget heads...');
      const { data, error } = await supabase
        .from('budget_heads')
        .select('*')
        .order('type', { ascending: false }) // Income first, then expenditure
        .order('display_order', { ascending: true });
      
      console.log('Budget heads result:', { data, error });
      if (error) {
        console.error('Budget heads error:', error);
        throw error;
      }
      return data || [];
    }
  });

  React.useEffect(() => {
    if (queryError) {
      console.error('Query error:', queryError);
      toast({
        title: "Error loading budget heads",
        description: queryError instanceof Error ? queryError.message : "Failed to load data",
        variant: "destructive"
      });
    }
  }, [queryError, toast]);

  const createMutation = useMutation({
    mutationFn: async (values: HeadForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('budget_heads')
        .insert([{ 
          name: values.name,
          code: values.code,
          description: values.description,
          type: values.type,
          is_active: values.is_active,
          display_order: values.display_order,
          allow_department_subitems: values.allow_department_subitems,
          created_by: user.id 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-heads'] });
      toast({ title: "Budget head created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating budget head", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: HeadForm) => {
      // Ensure we have a valid session before updating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('budget_heads')
        .update({
          name: values.name,
          code: values.code,
          description: values.description,
          type: values.type,
          is_active: values.is_active,
          display_order: values.display_order,
          allow_department_subitems: values.allow_department_subitems,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingHead.id)
        .select()
        .single();

      if (error) {
        console.error('Update budget head error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-heads'] });
      toast({ title: "Budget head updated successfully" });
      setIsDialogOpen(false);
      setEditingHead(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating budget head", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: HeadForm) => {
    if (editingHead) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (head: any) => {
    setEditingHead(head);
    form.reset({
      name: head.name,
      code: head.code,
      description: head.description || "",
      type: head.type || "expenditure",
      is_active: head.is_active,
      display_order: head.display_order,
      allow_department_subitems: head.allow_department_subitems || false
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    console.log('Dialog closing');
    setIsDialogOpen(false);
    setEditingHead(null);
    form.reset();
  };

  const handleNewClick = () => {
    console.log('New budget head button clicked');
    setIsDialogOpen(true);
  };

  const columns = [
    { 
      id: 'code', 
      header: 'Code',
      cell: (row: any) => <span className="font-mono">{row.code}</span>
    },
    { 
      id: 'name', 
      header: 'Name',
      cell: (row: any) => row.name 
    },
    { 
      id: 'description', 
      header: 'Description',
      cell: (row: any) => row.description || '-'
    },
    { 
      id: 'allow_department_subitems', 
      header: 'Allow Sub-items',
      cell: (row: any) => (
        <Badge variant={row.allow_department_subitems ? "default" : "secondary"}>
          {row.allow_department_subitems ? "Yes" : "No"}
        </Badge>
      )
    },
    { 
      id: 'display_order', 
      header: 'Order',
      cell: (row: any) => row.display_order
    },
    { 
      id: 'is_active', 
      header: 'Status',
      cell: (row: any) => (
        <Badge variant={row.is_active ? "default" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      )
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
        <div>
          <h2 className="text-2xl font-semibold">Budget Heads</h2>
          <p className="text-sm text-muted-foreground">
            Standard budget categories that departments will use for submissions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewClick}>
              <Plus className="h-4 w-4 mr-2" />
              New Budget Head
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingHead ? "Edit Budget Head" : "Create Budget Head"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., CAPEX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="display_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Capital Expenditure" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expenditure">Expenditure</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of this budget head"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allow_department_subitems"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Allow Department Sub-items</FormLabel>
                        <FormDescription>
                          Allow department heads to create sub-items under this budget head
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Make this budget head available for department submissions
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
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
                    {editingHead ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Group heads by type */}
      {heads && heads.length > 0 ? (
        <>
          {['income', 'expenditure'].map(type => {
            const typeHeads = heads.filter(h => h.type === type);
            if (typeHeads.length === 0) return null;
            
            return (
              <div key={type} className="space-y-2">
                <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                  {type}
                  <Badge variant={type === 'income' ? "default" : "secondary"}>
                    {typeHeads.length}
                  </Badge>
                </h3>
                <DataTable
                  columns={columns}
                  data={typeHeads}
                  emptyMessage={`No ${type} heads found.`}
                />
              </div>
            );
          })}
        </>
      ) : (
        <DataTable
          columns={columns}
          data={[]}
          emptyMessage="No budget heads found. Create standard categories for departments."
        />
      )}
    </div>
  );
};

export default BudgetHeadsManager;