import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const taxTypeSchema = z.object({
  code: z.string().min(1, "Tax type code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  country: z.string().optional(),
  tax_elements: z.array(z.object({
    name: z.string().min(1, "Element name is required"),
    applicability_condition: z.enum(["always", "intra_state", "inter_state", "international"]),
  })).min(1, "At least one tax element is required"),
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
      tax_elements: [{ name: "", applicability_condition: "always" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tax_elements",
  });

  const { data: taxTypes = [], isLoading } = useQuery({
    queryKey: ["tax_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tax_types").select("*").order("code");
      if (error) throw error;
      return data;
    },
  });

  const createTaxTypeMutation = useMutation({
    mutationFn: async (values: TaxTypeForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase.from("tax_types").insert({
        code: values.code,
        name: values.name,
        description: values.description || null,
        country: values.country || null,
        tax_elements: values.tax_elements,
        created_by: user.id
      }).select().single();
      
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
      const { error } = await supabase.from("tax_types").update({
        code: values.code,
        name: values.name,
        description: values.description || null,
        country: values.country || null,
        tax_elements: values.tax_elements
      }).eq("id", editingTaxType.id);
      
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
      const { error } = await supabase.from("tax_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_types"] });
      toast({ title: "Tax type deleted successfully" });
    },
  });

  const handleEdit = (taxType: any) => {
    setEditingTaxType(taxType);
    const tax_elements = Array.isArray(taxType.tax_elements) 
      ? taxType.tax_elements 
      : [{ name: "", applicability_condition: "always" }];
    
    form.reset({
      code: taxType.code,
      name: taxType.name,
      description: taxType.description || "",
      country: taxType.country || "",
      tax_elements,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: TaxTypeForm) => {
    if (editingTaxType) {
      await updateTaxTypeMutation.mutateAsync(data);
    } else {
      await createTaxTypeMutation.mutateAsync(data);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tax Types</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTaxType(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Tax Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTaxType ? "Edit Tax Type" : "Add Tax Type"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="GST" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Goods and Services Tax" {...field} />
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
                      <FormLabel>Country (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="India" {...field} />
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Tax type description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel>Tax Elements</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ name: "", applicability_condition: "always" })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Element
                    </Button>
                  </div>
                  <FormDescription>
                    Define the tax components (e.g., IGST, SGST, CGST) and their applicability conditions
                  </FormDescription>
                  
                  <div className="space-y-3 border rounded-md p-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-start">
                        <FormField
                          control={form.control}
                          name={`tax_elements.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Element name (e.g., IGST)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`tax_elements.${index}.applicability_condition`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Condition" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="always">Always</SelectItem>
                                  <SelectItem value="intra_state">Intra-State</SelectItem>
                                  <SelectItem value="inter_state">Inter-State</SelectItem>
                                  <SelectItem value="international">International</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTaxTypeMutation.isPending || updateTaxTypeMutation.isPending}>
                    {editingTaxType ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Tax Elements</TableHead>
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
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(taxType.tax_elements) && taxType.tax_elements.length > 0 ? (
                        taxType.tax_elements.map((element: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {element.name} ({element.applicability_condition})
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No elements</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={taxType.is_active ? "default" : "secondary"}>
                      {taxType.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(taxType)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
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
