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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
    defaultValues: { code: "", name: "", description: "", country: "" },
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
        ...values, description: values.description || null, country: values.country || null, created_by: user.id
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
  });

  const updateTaxTypeMutation = useMutation({
    mutationFn: async (values: TaxTypeForm) => {
      const { error } = await supabase.from("tax_types").update({
        ...values, description: values.description || null, country: values.country || null
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Tax Types</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Define tax categories (e.g., GST, VAT, Sales Tax)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTaxType(null); form.reset(); }}>
              <Plus className="h-4 w-4 mr-2" />Add Tax Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTaxType ? "Edit Tax Type" : "Add Tax Type"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => editingTaxType ? updateTaxTypeMutation.mutate(values) : createTaxTypeMutation.mutate(values))} className="space-y-4">
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Type Code *</FormLabel>
                    <FormControl><Input placeholder="e.g., GST, VAT" {...field} /></FormControl>
                    <FormDescription>Unique identifier</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input placeholder="e.g., Goods and Services Tax" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe this tax type" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl><Input placeholder="e.g., India" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingTaxType ? "Update" : "Create"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <p>Loading...</p> : taxTypes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No tax types found.</p>
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
                  <TableCell className="max-w-xs truncate">{taxType.description || "-"}</TableCell>
                  <TableCell><Badge variant={taxType.is_active ? "default" : "secondary"}>{taxType.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingTaxType(taxType); form.reset(taxType); setIsDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => confirm("Delete this tax type?") && deleteTaxTypeMutation.mutate(taxType.id)}>
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
