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
  display_order: z.coerce.number().min(0.1, "Display order is required"),
  sub_order: z.coerce.number().min(1).max(9).optional(), // For sub-heads: the decimal part (1-9)
  allow_department_subitems: z.boolean().default(false)
}).refine((data) => {
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
      sub_order: 1,
      allow_department_subitems: false
    }
  });

  const watchType = form.watch("type");
  const watchIsSubhead = form.watch("is_subhead");
  const watchParentId = form.watch("parent_id");

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

  // Get parent's display order
  const getParentDisplayOrder = React.useCallback((parentId: string | null) => {
    if (!parentId || !heads) return null;
    const parent = heads.find(h => h.id === parentId);
    return parent ? Math.floor(parent.display_order) : null;
  }, [heads]);

  // Get used sub-orders for a parent
  const getUsedSubOrders = React.useCallback((parentId: string | null, excludeId?: string) => {
    if (!parentId || !heads) return [];
    return heads
      .filter(h => h.parent_id === parentId && h.id !== excludeId)
      .map(h => Math.round((h.display_order - Math.floor(h.display_order)) * 10));
  }, [heads]);

  // Fetch next code and display order when type changes (for new main heads only)
  useEffect(() => {
    const fetchDefaults = async () => {
      if (editingHead || watchIsSubhead) return;
      
      try {
        const { data: codeData } = await supabase
          .rpc('get_next_budget_head_code', { head_type: watchType });
        
        const { data: orderData } = await supabase
          .rpc('get_next_budget_head_display_order', { head_type: watchType });
        
        if (codeData) form.setValue('code', codeData);
        if (orderData) form.setValue('display_order', orderData);
      } catch (error) {
        console.error('Error fetching defaults:', error);
      }
    };

    if (isDialogOpen && !editingHead && !watchIsSubhead) {
      fetchDefaults();
    }
  }, [watchType, isDialogOpen, editingHead, watchIsSubhead, form]);

  // Auto-fill sub-head display order when parent changes
  useEffect(() => {
    const fetchSubheadOrder = async () => {
      if (!watchIsSubhead || !watchParentId || editingHead) return;
      
      try {
        const { data: orderData, error } = await supabase
          .rpc('get_next_subhead_display_order', { parent_head_id: watchParentId });
        
        if (error) {
          console.error('Error fetching subhead order:', error);
          return;
        }
        
        if (orderData) {
          form.setValue('display_order', orderData);
          // Extract the sub_order (decimal part * 10)
          const subOrder = Math.round((orderData - Math.floor(orderData)) * 10);
          form.setValue('sub_order', subOrder);
        }
      } catch (error) {
        console.error('Error fetching subhead order:', error);
      }
    };

    if (isDialogOpen && watchIsSubhead && watchParentId && !editingHead) {
      fetchSubheadOrder();
    }
  }, [watchParentId, watchIsSubhead, isDialogOpen, editingHead, form]);

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

      // Calculate actual display_order for sub-heads
      let finalDisplayOrder = values.display_order;
      if (values.is_subhead && values.parent_id && values.sub_order) {
        const parentOrder = getParentDisplayOrder(values.parent_id);
        if (parentOrder !== null) {
          finalDisplayOrder = parentOrder + (values.sub_order / 10);
        }
      }

      // Check for duplicate display order
      const { data: existing } = await supabase
        .from('budget_heads')
        .select('id')
        .eq('type', values.type)
        .eq('display_order', finalDisplayOrder)
        .maybeSingle();

      if (existing) {
        throw new Error(`Display order ${finalDisplayOrder} is already used. Please choose a different order.`);
      }

      const { data, error } = await supabase
        .from('budget_heads')
        .insert([{ 
          name: values.name,
          code: values.code,
          description: values.description,
          type: values.type,
          is_active: values.is_active,
          display_order: finalDisplayOrder,
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

      // Calculate actual display_order for sub-heads
      let finalDisplayOrder = values.display_order;
      if (values.is_subhead && values.parent_id && values.sub_order) {
        const parentOrder = getParentDisplayOrder(values.parent_id);
        if (parentOrder !== null) {
          finalDisplayOrder = parentOrder + (values.sub_order / 10);
        }
      }

      // Check for duplicate display order (excluding current head)
      const { data: existing } = await supabase
        .from('budget_heads')
        .select('id')
        .eq('type', values.type)
        .eq('display_order', finalDisplayOrder)
        .neq('id', editingHead!.id)
        .maybeSingle();

      if (existing) {
        throw new Error(`Display order ${finalDisplayOrder} is already used. Please choose a different order.`);
      }

      const { data, error } = await supabase
        .from('budget_heads')
        .update({
          name: values.name,
          code: values.code,
          description: values.description,
          type: values.type,
          is_active: values.is_active,
          display_order: finalDisplayOrder,
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
    const subOrder = head.is_subhead 
      ? Math.round((head.display_order - Math.floor(head.display_order)) * 10) 
      : 1;
    
    form.reset({
      type: head.type as "income" | "expenditure",
      is_subhead: head.is_subhead || false,
      parent_id: head.parent_id || null,
      name: head.name,
      code: head.code,
      description: head.description || "",
      is_active: head.is_active,
      display_order: head.display_order,
      sub_order: subOrder || 1,
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
      sub_order: 1,
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

  // Format display order for display
  const formatDisplayOrder = (order: number) => {
    if (order === Math.floor(order)) {
      return order.toString();
    }
    return order.toFixed(1);
  };

  const columns = [
    { 
      id: 'display_order', 
      header: 'Order',
      cell: (row: BudgetHead) => (
        <span className={row.is_subhead ? "text-muted-foreground" : "font-medium"}>
          {formatDisplayOrder(row.display_order)}
        </span>
      )
    },
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

  // Get available sub-order options (1-9, excluding used ones)
  const getAvailableSubOrders = () => {
    const usedOrders = getUsedSubOrders(watchParentId, editingHead?.id);
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !usedOrders.includes(n));
  };

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
                                  {formatDisplayOrder(parent.display_order)} - {parent.code} - {parent.name}
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

                  {/* Display Order - Different handling for main vs sub heads */}
                  {watchIsSubhead ? (
                    <FormField
                      control={form.control}
                      name="sub_order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sub-Order *</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(parseInt(val))} 
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select position" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getAvailableSubOrders().map(n => {
                                const parentOrder = getParentDisplayOrder(watchParentId);
                                const displayValue = parentOrder !== null ? `${parentOrder}.${n}` : `.${n}`;
                                return (
                                  <SelectItem key={n} value={n.toString()}>
                                    {displayValue}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Position under parent (e.g., 1.1, 1.2)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="display_order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              {...field} 
                              disabled={!!editingHead} 
                            />
                          </FormControl>
                          <FormDescription>
                            {editingHead ? "Cannot change parent order" : "Auto-assigned, unique per type"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
