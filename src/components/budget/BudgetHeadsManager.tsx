import React, { useState, useEffect } from "react";
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
import { Plus, Edit, Loader2, ChevronRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/common/DataTable";

const headSchema = z.object({
  type: z.enum(["income", "expenditure"]),
  is_subhead: z.boolean().default(false),
  parent_id: z.string().nullable().optional(),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().min(1, "Display order must be at least 1"),
  allow_department_subitems: z.boolean().default(false)
}).refine((data) => {
  // If it's a subhead, parent_id is required
  if (data.is_subhead && !data.parent_id) {
    return false;
  }
  return true;
}, {
  message: "Sub-heads must have a parent head selected",
  path: ["parent_id"]
});

type HeadForm = z.infer<typeof headSchema>;

interface BudgetHead {
  id: string;
  name: string;
  code: string;
  description: string | null;
  type: string;
  is_active: boolean;
  display_order: number;
  allow_department_subitems: boolean;
  is_subhead: boolean;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const BudgetHeadsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<BudgetHead | null>(null);

  const form = useForm<HeadForm>({
    resolver: zodResolver(headSchema),
    defaultValues: {
      type: "expenditure",
      is_subhead: false,
      parent_id: null,
      name: "",
      code: "",
      description: "",
      is_active: true,
      display_order: 1,
      allow_department_subitems: false
    }
  });

  const watchType = form.watch("type");
  const watchIsSubhead = form.watch("is_subhead");

  const { data: heads, isLoading, error: queryError } = useQuery({
    queryKey: ['budget-heads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_heads')
        .select('*')
        .order('type', { ascending: false })
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return (data || []) as BudgetHead[];
    }
  });

  // Get available parent heads (main heads only, same type)
  const availableParents = React.useMemo(() => {
    if (!heads) return [];
    return heads.filter(h => 
      !h.is_subhead && 
      h.type === watchType && 
      h.id !== editingHead?.id
    );
  }, [heads, watchType, editingHead]);

  // Check if a head has children (is a parent)
  const hasChildren = React.useCallback((headId: string) => {
    if (!heads) return false;
    return heads.some(h => h.parent_id === headId);
  }, [heads]);

  // Fetch next code and display order when type changes (for new heads only)
  useEffect(() => {
    const fetchDefaults = async () => {
      if (editingHead) return; // Don't auto-fill when editing
      
      try {
        // Get next code
        const { data: codeData } = await supabase
          .rpc('get_next_budget_head_code', { head_type: watchType });
        
        // Get next display order
        const { data: orderData } = await supabase
          .rpc('get_next_budget_head_display_order', { head_type: watchType });
        
        if (codeData) form.setValue('code', codeData);
        if (orderData) form.setValue('display_order', orderData);
      } catch (error) {
        console.error('Error fetching defaults:', error);
      }
    };

    if (isDialogOpen && !editingHead) {
      fetchDefaults();
    }
  }, [watchType, isDialogOpen, editingHead, form]);

  // Reset parent_id when switching from subhead to main head
  useEffect(() => {
    if (!watchIsSubhead) {
      form.setValue('parent_id', null);
    }
  }, [watchIsSubhead, form]);

  React.useEffect(() => {
    if (queryError) {
      toast({
        title: "Error loading budget heads",
        description: queryError instanceof Error ? queryError.message : "Failed to load data",
        variant: "destructive"
      });
    }
  }, [queryError, toast]);

  const createMutation = useMutation({
    mutationFn: async (values: HeadForm) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Check for duplicate display order
      const { data: existing } = await supabase
        .from('budget_heads')
        .select('id')
        .eq('type', values.type)
        .eq('display_order', values.display_order)
        .maybeSingle();

      if (existing) {
        throw new Error(`Display order ${values.display_order} is already used for ${values.type} type. Please choose a different order.`);
      }

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
          is_subhead: values.is_subhead,
          parent_id: values.parent_id || null,
          created_by: session.user.id 
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Check for duplicate display order (excluding current head)
      const { data: existing } = await supabase
        .from('budget_heads')
        .select('id')
        .eq('type', values.type)
        .eq('display_order', values.display_order)
        .neq('id', editingHead!.id)
        .maybeSingle();

      if (existing) {
        throw new Error(`Display order ${values.display_order} is already used for ${values.type} type. Please choose a different order.`);
      }

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
          is_subhead: values.is_subhead,
          parent_id: values.parent_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingHead!.id)
        .select()
        .single();

      if (error) throw error;
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

  const handleEdit = (head: BudgetHead) => {
    setEditingHead(head);
    form.reset({
      type: head.type as "income" | "expenditure",
      is_subhead: head.is_subhead || false,
      parent_id: head.parent_id || null,
      name: head.name,
      code: head.code,
      description: head.description || "",
      is_active: head.is_active,
      display_order: head.display_order,
      allow_department_subitems: head.allow_department_subitems || false
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingHead(null);
    form.reset();
  };

  const handleNewClick = async () => {
    form.reset({
      type: "expenditure",
      is_subhead: false,
      parent_id: null,
      name: "",
      code: "",
      description: "",
      is_active: true,
      display_order: 1,
      allow_department_subitems: false
    });
    setIsDialogOpen(true);
  };

  // Get parent name for display
  const getParentName = (parentId: string | null) => {
    if (!parentId || !heads) return null;
    const parent = heads.find(h => h.id === parentId);
    return parent?.name || null;
  };

  const columns = [
    { 
      id: 'code', 
      header: 'Code',
      cell: (row: BudgetHead) => (
        <div className="flex items-center gap-2">
          {row.is_subhead && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="font-mono">{row.code}</span>
        </div>
      )
    },
    { 
      id: 'name', 
      header: 'Name',
      cell: (row: BudgetHead) => (
        <div className="flex items-center gap-2">
          {hasChildren(row.id) && (
            <FolderOpen className="h-4 w-4 text-primary" />
          )}
          <span className={row.is_subhead ? "pl-4" : "font-medium"}>{row.name}</span>
        </div>
      )
    },
    { 
      id: 'hierarchy', 
      header: 'Hierarchy',
      cell: (row: BudgetHead) => {
        if (row.is_subhead) {
          const parentName = getParentName(row.parent_id);
          return (
            <Badge variant="outline" className="text-xs">
              Sub of: {parentName}
            </Badge>
          );
        }
        if (hasChildren(row.id)) {
          return <Badge variant="secondary">Parent (Roll-up)</Badge>;
        }
        return <Badge variant="outline">Main Head</Badge>;
      }
    },
    { 
      id: 'allow_department_subitems', 
      header: 'Dept. Sub-items',
      cell: (row: BudgetHead) => (
        <Badge variant={row.allow_department_subitems ? "default" : "secondary"}>
          {row.allow_department_subitems ? "Yes" : "No"}
        </Badge>
      )
    },
    { 
      id: 'display_order', 
      header: 'Order',
      cell: (row: BudgetHead) => row.display_order
    },
    { 
      id: 'is_active', 
      header: 'Status',
      cell: (row: BudgetHead) => (
        <Badge variant={row.is_active ? "default" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      )
    },
    { 
      id: 'actions', 
      header: 'Actions',
      cell: (row: BudgetHead) => (
        <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
          <Edit className="h-4 w-4" />
        </Button>
      )
    }
  ];

  // Organize heads by hierarchy for display
  const organizeHeads = (typeHeads: BudgetHead[]) => {
    const mainHeads = typeHeads.filter(h => !h.is_subhead);
    const result: BudgetHead[] = [];
    
    mainHeads.forEach(main => {
      result.push(main);
      const children = typeHeads.filter(h => h.parent_id === main.id);
      children.sort((a, b) => a.display_order - b.display_order);
      result.push(...children);
    });
    
    return result;
  };

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
            Standard budget categories that departments will use for submissions. Parent heads with sub-heads become roll-up only.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) handleDialogClose();
          else setIsDialogOpen(true);
        }}>
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
                {/* Type - First Field */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={editingHead && hasChildren(editingHead.id)}
                      >
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
                      <FormDescription>
                        Select the type first - code and display order will auto-fill
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Is Subhead Toggle */}
                <FormField
                  control={form.control}
                  name="is_subhead"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Sub-head</FormLabel>
                        <FormDescription>
                          Make this a sub-head under a parent head for roll-up
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={editingHead && hasChildren(editingHead.id)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Parent Selection - Only shown for subheads */}
                {watchIsSubhead && (
                  <FormField
                    control={form.control}
                    name="parent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Head *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select parent head" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableParents.length === 0 ? (
                              <SelectItem value="" disabled>
                                No main heads available for this type
                              </SelectItem>
                            ) : (
                              availableParents.map(parent => (
                                <SelectItem key={parent.id} value={parent.id}>
                                  {parent.code} - {parent.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the parent head this will roll up to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="Auto-generated" {...field} />
                        </FormControl>
                        <FormDescription>
                          Auto-generated based on type
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="display_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormDescription>
                          Must be unique per type
                        </FormDescription>
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
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Capital Expenditure" {...field} />
                      </FormControl>
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

      {/* Group heads by type with hierarchy */}
      {heads && heads.length > 0 ? (
        <>
          {['income', 'expenditure'].map(type => {
            const typeHeads = heads.filter(h => h.type === type);
            if (typeHeads.length === 0) return null;
            
            const organizedHeads = organizeHeads(typeHeads);
            
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
                  data={organizedHeads}
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
