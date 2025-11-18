import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";

const taxTypeSchema = z.object({
  code: z.string().min(1, "Tax type code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  country: z.string().optional(),
});

type TaxTypeForm = z.infer<typeof taxTypeSchema>;

const TaxTypesManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTaxType, setEditingTaxType] = useState<any>(null);

  const form = useForm<TaxTypeForm>({
    resolver: zodResolver(taxTypeSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      country: "",
    },
  });

  // Fetch tax types
  const { data: taxTypes = [], isLoading } = useQuery({
    queryKey: ["tax_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_types")
        .select("*")
        .order("code");

      if (error) throw error;
      return data;
    },
  });

  const createTaxTypeMutation = useMutation({
    mutationFn: async (values: TaxTypeForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("tax_types")
        .insert({
          code: values.code,
          name: values.name,
          description: values.description || null,
          country: values.country || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_types"] });
      toast({ title: "Tax type created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating tax type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaxTypeMutation = useMutation({
    mutationFn: async (values: TaxTypeForm) => {
      const { error } = await supabase
        .from("tax_types")
        .update({
          code: values.code,
          name: values.name,
          description: values.description || null,
          country: values.country || null,
        })
        .eq("id", editingTaxType.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_types"] });
      toast({ title: "Tax type updated successfully" });
      setIsDialogOpen(false);
      setEditingTaxType(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating tax type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaxTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tax_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_types"] });
      toast({ title: "Tax type deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting tax type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (taxType: any) => {
    setEditingTaxType(taxType);
    form.reset({
      code: taxType.code,
      name: taxType.name,
      description: taxType.description || "",
      country: taxType.country || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: TaxTypeForm) => {
    if (editingTaxType) {
      updateTaxTypeMutation.mutate(values);
    } else {
      createTaxTypeMutation.mutate(values);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tax Types</CardTitle>
            <CardDescription>
              Define tax type categories (e.g., GST, VAT, Sales Tax) that group related tax codes
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingTaxType(null); form.reset(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTaxType ? "Edit Tax Type" : "Add Tax Type"}</DialogTitle>
              </DialogHeader>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Tax types define the broad category of taxes (like GST, VAT, Sales Tax). 
                  Specific tax codes (like IGST, CGST, SGST) will reference these types.
                </AlertDescription>
              </Alert>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Type Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., GST, VAT, SALES_TAX" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for this tax type
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Goods and Services Tax" {...field} />
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
                            placeholder="Describe when this tax type applies and its characteristics" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., India, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTaxType ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading tax types...</p>
        ) : taxTypes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No tax types found. Create one to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxTypes.map((taxType) => (
                <TableRow key={taxType.id}>
                  <TableCell className="font-medium">{taxType.code}</TableCell>
                  <TableCell>{taxType.name}</TableCell>
                  <TableCell>{taxType.country || "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {taxType.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={taxType.is_active ? "default" : "secondary"}>
                      {taxType.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(taxType)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this tax type?")) {
                            deleteTaxTypeMutation.mutate(taxType.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxTypesManager;