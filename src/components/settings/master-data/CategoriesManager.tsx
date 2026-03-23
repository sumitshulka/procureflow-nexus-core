
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter, DialogClose 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, 
  FormLabel, FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Settings2 } from "lucide-react";
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const categorySchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type Category = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
};

type SkuAttribute = {
  id: string;
  category_id: string;
  attribute_name: string;
  display_order: number;
  is_required: boolean;
};

const CategoriesManager = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAttrOpen, setIsAttrOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [attrCategory, setAttrCategory] = useState<Category | null>(null);
  const [newAttrName, setNewAttrName] = useState("");
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "", is_active: true },
  });

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    }
  });

  // Fetch SKU attributes for all categories (for badge counts)
  const { data: allAttributes = [] } = useQuery({
    queryKey: ['category-sku-attributes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_sku_attributes')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as SkuAttribute[];
    }
  });

  // Fetch attributes for the currently selected category
  const { data: categoryAttributes = [] } = useQuery({
    queryKey: ['category-sku-attributes', attrCategory?.id],
    queryFn: async () => {
      if (!attrCategory) return [];
      const { data, error } = await supabase
        .from('category_sku_attributes')
        .select('*')
        .eq('category_id', attrCategory.id)
        .order('display_order');
      if (error) throw error;
      return data as SkuAttribute[];
    },
    enabled: !!attrCategory,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof categorySchema>) => {
      if (!values.name) throw new Error("Category name is required");
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: values.name, description: values.description || null, is_active: values.is_active }])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCreateOpen(false);
      form.reset();
      toast.success("Category created successfully");
    },
    onError: (error) => toast.error(`Failed to create category: ${error.message}`),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string, values: z.infer<typeof categorySchema> }) => {
      if (!values.name) throw new Error("Category name is required");
      const { data, error } = await supabase
        .from('categories')
        .update({ name: values.name, description: values.description || null, is_active: values.is_active })
        .eq('id', id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsEditOpen(false);
      setCurrentCategory(null);
      form.reset();
      toast.success("Category updated successfully");
    },
    onError: (error) => toast.error(`Failed to update category: ${error.message}`),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success("Category deleted successfully");
    },
    onError: (error) => toast.error(`Failed to delete category: ${error.message}`),
  });

  // SKU Attribute mutations
  const addAttributeMutation = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const nextOrder = categoryAttributes.length;
      const { error } = await supabase
        .from('category_sku_attributes')
        .insert({ category_id: categoryId, attribute_name: name.trim(), display_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-sku-attributes'] });
      setNewAttrName("");
      toast.success("Attribute added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: async (attrId: string) => {
      const { error } = await supabase.from('category_sku_attributes').delete().eq('id', attrId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-sku-attributes'] });
      toast.success("Attribute removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const onSubmit = (values: z.infer<typeof categorySchema>) => {
    if (currentCategory) {
      updateCategoryMutation.mutate({ id: currentCategory.id, values });
    } else {
      createCategoryMutation.mutate(values);
    }
  };

  const handleEdit = (category: Category) => {
    setCurrentCategory(category);
    form.reset({ name: category.name, description: category.description || "", is_active: category.is_active });
    setIsEditOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleManageAttributes = (category: Category) => {
    setAttrCategory(category);
    setNewAttrName("");
    setIsAttrOpen(true);
  };

  const getAttributeCount = (categoryId: string) => {
    return allAttributes.filter(a => a.category_id === categoryId).length;
  };

  const CategoryFormFields = () => (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl><Input placeholder="Enter category name" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl><Textarea placeholder="Enter category description (optional)" {...field} value={field.value || ""} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="is_active" render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5"><FormLabel>Active</FormLabel></div>
          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
        </FormItem>
      )} />
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Product Categories</CardTitle>
          <CardDescription>Manage product categories and their SKU attributes.</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-9" size="sm"><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Category</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <CategoryFormFields />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={createCategoryMutation.isPending}>
                    {createCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <CategoryFormFields />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={updateCategoryMutation.isPending}>
                    {updateCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* SKU Attributes Dialog */}
        <Dialog open={isAttrOpen} onOpenChange={setIsAttrOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>SKU Attributes — {attrCategory?.name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Define the variant attributes for this category. Products in this category will use these attributes when creating SKU variants.
            </p>
            <div className="space-y-3">
              {categoryAttributes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attributes defined yet. Add attributes like "Color", "Size", "RAM", etc.
                </p>
              ) : (
                <div className="space-y-2">
                  {categoryAttributes.map((attr) => (
                    <div key={attr.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{attr.display_order + 1}</Badge>
                        <span className="text-sm font-medium">{attr.attribute_name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteAttributeMutation.mutate(attr.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Color, Size, RAM..."
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newAttrName.trim() && attrCategory) {
                      e.preventDefault();
                      addAttributeMutation.mutate({ categoryId: attrCategory.id, name: newAttrName });
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={!newAttrName.trim() || addAttributeMutation.isPending}
                  onClick={() => attrCategory && addAttributeMutation.mutate({ categoryId: attrCategory.id, name: newAttrName })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAttrOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            Error loading categories. Please try again.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>SKU Attributes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No categories found. Create your first category to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => {
                    const attrCount = getAttributeCount(category.id);
                    const attrs = allAttributes.filter(a => a.category_id === category.id);
                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.description || "-"}</TableCell>
                        <TableCell>
                          {attrCount === 0 ? (
                            <span className="text-muted-foreground text-xs">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {attrs.map(a => (
                                <Badge key={a.id} variant="outline" className="text-xs">{a.attribute_name}</Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            category.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {category.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleManageAttributes(category)} title="Manage SKU Attributes">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoriesManager;
