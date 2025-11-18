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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";

const taxCodeSchema = z.object({
  code: z.string().min(1, "Tax code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  country: z.string().optional(),
  tax_type_id: z.string().optional(),
  rates: z.array(z.object({
    rate_name: z.string().min(1, "Rate name is required"),
    tax_element_name: z.string().optional(),
    rate_percentage: z.number().min(0).max(100, "Rate must be between 0 and 100"),
  })).min(1, "At least one tax rate is required"),
});

type TaxCodeForm = z.infer<typeof taxCodeSchema>;

const TaxCodesManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTaxCode, setEditingTaxCode] = useState<any>(null);

  const form = useForm<TaxCodeForm>({
    resolver: zodResolver(taxCodeSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      country: "",
      tax_type_id: "",
      rates: [{ rate_name: "", tax_element_name: "", rate_percentage: 0 }],
    },
  });

  // Fetch tax types for dropdown
  const { data: taxTypes = [] } = useQuery({
    queryKey: ["tax_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_types")
        .select("id, code, name, tax_elements")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch tax codes with their rates
  const { data: taxCodes = [], isLoading } = useQuery({
    queryKey: ["tax_codes"],
    queryFn: async () => {
      const { data: codes, error: codesError } = await supabase
        .from("tax_codes")
        .select("*")
        .order("code");

      if (codesError) throw codesError;

      const codesWithRates = await Promise.all(
        codes.map(async (code) => {
          const { data: rates } = await supabase
            .from("tax_rates")
            .select("*")
            .eq("tax_code_id", code.id)
            .eq("is_active", true)
            .order("rate_name");
          
          return { ...code, rates: rates || [] };
        })
      );

      return codesWithRates;
    },
  });

  const createTaxCodeMutation = useMutation({
    mutationFn: async (values: TaxCodeForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create tax code
      const { data: taxCode, error: taxCodeError } = await supabase
        .from("tax_codes")
        .insert({
        code: values.code,
        name: values.name,
        description: values.description || null,
        country: values.country || null,
        tax_type_id: values.tax_type_id || null,
        created_by: user.id,
        })
        .select()
        .single();

      if (taxCodeError) throw taxCodeError;

      // Create tax rates
      const ratesData = values.rates.map(rate => ({
        tax_code_id: taxCode.id,
        rate_name: rate.rate_name,
        rate_percentage: rate.rate_percentage,
      }));

      const { error: ratesError } = await supabase
        .from("tax_rates")
        .insert(ratesData);

      if (ratesError) throw ratesError;

      return taxCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_codes"] });
      toast({ title: "Tax code created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating tax code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaxCodeMutation = useMutation({
    mutationFn: async (values: TaxCodeForm) => {
      if (!editingTaxCode) return;

      // Update tax code
      const { error: taxCodeError } = await supabase
        .from("tax_codes")
        .update({
        code: values.code,
        name: values.name,
        description: values.description || null,
        country: values.country || null,
        tax_type_id: values.tax_type_id || null,
      })
      .eq("id", editingTaxCode.id);

      if (taxCodeError) throw taxCodeError;

      // Delete existing rates and recreate
      await supabase
        .from("tax_rates")
        .delete()
        .eq("tax_code_id", editingTaxCode.id);

      const ratesData = values.rates.map(rate => ({
        tax_code_id: editingTaxCode.id,
        rate_name: rate.rate_name,
        rate_percentage: rate.rate_percentage,
      }));

      const { error: ratesError } = await supabase
        .from("tax_rates")
        .insert(ratesData);

      if (ratesError) throw ratesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_codes"] });
      toast({ title: "Tax code updated successfully" });
      setIsDialogOpen(false);
      setEditingTaxCode(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating tax code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaxCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tax_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_codes"] });
      toast({ title: "Tax code deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting tax code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (taxCode: any) => {
    setEditingTaxCode(taxCode);
    form.reset({
      code: taxCode.code,
      name: taxCode.name,
      description: taxCode.description || "",
      country: taxCode.country || "",
      tax_type_id: taxCode.tax_type_id || "",
      rates: taxCode.rates.map((r: any) => ({
        rate_name: r.rate_name,
        tax_element_name: r.tax_element_name || r.rate_name,
        rate_percentage: r.rate_percentage,
      })),
    });
    setIsDialogOpen(true);
  };

  const handleAddRate = () => {
    const currentRates = form.getValues("rates");
    form.setValue("rates", [...currentRates, { rate_name: "", rate_percentage: 0 }]);
  };

  const handleRemoveRate = (index: number) => {
    const currentRates = form.getValues("rates");
    if (currentRates.length > 1) {
      form.setValue("rates", currentRates.filter((_, i) => i !== index));
    }
  };

  const onSubmit = (values: TaxCodeForm) => {
    if (editingTaxCode) {
      updateTaxCodeMutation.mutate(values);
    } else {
      createTaxCodeMutation.mutate(values);
    }
  };

  const calculateTotalRate = (rates: any[]) => {
    return rates.reduce((sum, rate) => sum + (rate.rate_percentage || 0), 0).toFixed(2);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tax Codes</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTaxCode(null); form.reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tax Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTaxCode ? "Edit Tax Code" : "Add Tax Code"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Tax codes are specific implementations of tax types. For example, for GST tax type, you might create IGST, CGST, and SGST tax codes.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="tax_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Type (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tax type (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taxTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name} ({type.code})
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
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., IGST, CGST, SGST" {...field} />
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
                        <Textarea placeholder="Tax code description" {...field} />
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

                <FormField
                  control={form.control}
                  name="tax_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tax type (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          
                          {taxTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.code} - {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(() => {
                  const st = taxTypes.find((t: any) => t.id === form.watch("tax_type_id"));
                  if (st && Array.isArray(st.tax_elements) && st.tax_elements.length > 0) {
                    return (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Tax conditions are inherited from the selected Tax Type and cannot be modified here.
                        </AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}


                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>Tax Rates *</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddRate}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Rate
                    </Button>
                  </div>

                  {form.watch("rates").map((_, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <FormField
                        control={form.control}
                        name={`rates.${index}.rate_name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Rate name (e.g., CGST, SGST)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`rates.${index}.rate_percentage`}
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Rate %"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("rates").length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRate(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTaxCode ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading tax codes...</p>
        ) : taxCodes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No tax codes found. Create one to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Tax Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Applicability</TableHead>
                <TableHead>Tax Rates</TableHead>
                <TableHead>Total Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxCodes.map((taxCode) => (
                <TableRow key={taxCode.id}>
                  <TableCell className="font-medium">{taxCode.code}</TableCell>
                  <TableCell>{taxCode.name}</TableCell>
                  <TableCell>
                    {taxCode.tax_type_id ? (
                      <Badge variant="outline">
                        {taxTypes.find(t => t.id === taxCode.tax_type_id)?.name || "Unknown"}
                      </Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{taxCode.country || "-"}</TableCell>
                  <TableCell>
                    {taxCode.tax_type_id ? (
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const taxType = taxTypes.find(t => t.id === taxCode.tax_type_id);
                          if (!taxType || !Array.isArray(taxType.tax_elements) || taxType.tax_elements.length === 0) {
                            return <span className="text-muted-foreground text-sm">No conditions</span>;
                          }
                          return taxType.tax_elements.map((element: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {element.applicability_condition}
                            </Badge>
                          ));
                        })()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {taxCode.rates.map((rate: any) => (
                        <Badge key={rate.id} variant="secondary" className="text-xs">
                          {rate.rate_name}: {rate.rate_percentage}%
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{calculateTotalRate(taxCode.rates)}%</TableCell>
                  <TableCell>
                    <Badge variant={taxCode.is_active ? "default" : "secondary"}>
                      {taxCode.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(taxCode)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this tax code?")) {
                            deleteTaxCodeMutation.mutate(taxCode.id);
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

export default TaxCodesManager;
