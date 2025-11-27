import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Copy, Eye, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  template_key: z.string().min(1, "Template key is required").regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores allowed"),
  category: z.string().min(1, "Category is required"),
  subject_template: z.string().min(1, "Subject template is required"),
  body_template: z.string().min(1, "Body template is required"),
  available_variables: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
});

type TemplateForm = z.infer<typeof templateSchema>;

// Predefined variables for each category
const CATEGORY_VARIABLES: Record<string, Array<{ name: string; description: string }>> = {
  general: [
    { name: "organization_name", description: "Organization name" },
    { name: "sender_name", description: "Name of person sending the email" },
    { name: "sender_email", description: "Email address of sender" },
    { name: "date", description: "Current date" },
  ],
  purchase_orders: [
    { name: "po_number", description: "Purchase Order number" },
    { name: "vendor_name", description: "Vendor/supplier name" },
    { name: "vendor_email", description: "Vendor email address" },
    { name: "po_date", description: "Purchase Order date" },
    { name: "total_amount", description: "Total PO amount with currency" },
    { name: "delivery_date", description: "Expected delivery date" },
    { name: "payment_terms", description: "Payment terms" },
    { name: "created_by", description: "User who created the PO" },
    { name: "organization_name", description: "Organization name" },
  ],
  invoices: [
    { name: "invoice_number", description: "Invoice number" },
    { name: "vendor_name", description: "Vendor name" },
    { name: "invoice_date", description: "Invoice date" },
    { name: "due_date", description: "Payment due date" },
    { name: "total_amount", description: "Total invoice amount with currency" },
    { name: "po_number", description: "Related Purchase Order number" },
    { name: "created_by", description: "User who created the invoice" },
    { name: "organization_name", description: "Organization name" },
  ],
  rfp: [
    { name: "rfp_title", description: "RFP/RFQ title" },
    { name: "rfp_number", description: "RFP/RFQ reference number" },
    { name: "vendor_name", description: "Vendor name" },
    { name: "submission_deadline", description: "Submission deadline" },
    { name: "opening_date", description: "Technical/financial opening date" },
    { name: "rfp_type", description: "RFP type (single part, two part)" },
    { name: "created_by", description: "User who created the RFP" },
    { name: "organization_name", description: "Organization name" },
  ],
  users: [
    { name: "user_name", description: "User's full name" },
    { name: "user_email", description: "User's email address" },
    { name: "username", description: "Username for login" },
    { name: "temporary_password", description: "Temporary password (for new users)" },
    { name: "reset_link", description: "Password reset link" },
    { name: "role", description: "User's role" },
    { name: "department", description: "User's department" },
    { name: "organization_name", description: "Organization name" },
  ],
  inventory: [
    { name: "product_name", description: "Product name" },
    { name: "product_code", description: "Product code/SKU" },
    { name: "warehouse_name", description: "Warehouse name" },
    { name: "quantity", description: "Quantity" },
    { name: "transaction_type", description: "Transaction type (check-in, check-out, transfer)" },
    { name: "transaction_date", description: "Transaction date" },
    { name: "requested_by", description: "User who requested" },
    { name: "organization_name", description: "Organization name" },
  ],
};

const EmailTemplatesManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      template_key: "",
      category: "general",
      subject_template: "",
      body_template: "",
      available_variables: [],
    },
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (values: TemplateForm) => {
      const { data, error } = await supabase
        .from("email_templates")
        .insert({
          name: values.name,
          description: values.description,
          template_key: values.template_key,
          category: values.category,
          subject_template: values.subject_template,
          body_template: values.body_template,
          available_variables: values.available_variables as any,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates"] });
      toast({ title: "Email template created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (values: TemplateForm) => {
      if (!editingTemplate) return;

      const { error } = await supabase
        .from("email_templates")
        .update({
          name: values.name,
          description: values.description,
          template_key: values.template_key,
          category: values.category,
          subject_template: values.subject_template,
          body_template: values.body_template,
          available_variables: values.available_variables as any,
        })
        .eq("id", editingTemplate.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates"] });
      toast({ title: "Email template updated successfully" });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates"] });
      toast({ title: "Email template deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      template_key: template.template_key,
      category: template.category,
      subject_template: template.subject_template,
      body_template: template.body_template,
      available_variables: template.available_variables || [],
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: any) => {
    setEditingTemplate(null);
    form.reset({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      template_key: `${template.template_key}_copy`,
      category: template.category,
      subject_template: template.subject_template,
      body_template: template.body_template,
      available_variables: template.available_variables || [],
    });
    setIsDialogOpen(true);
  };

  const handlePreview = (template: any) => {
    setPreviewTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleAddVariable = () => {
    const currentVars = form.getValues("available_variables");
    form.setValue("available_variables", [...currentVars, { name: "", description: "" }]);
  };

  const handleRemoveVariable = (index: number) => {
    const currentVars = form.getValues("available_variables");
    form.setValue("available_variables", currentVars.filter((_, i) => i !== index));
  };

  const onSubmit = (values: TemplateForm) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate(values);
    } else {
      createTemplateMutation.mutate(values);
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      purchase_orders: "bg-blue-100 text-blue-800",
      invoices: "bg-green-100 text-green-800",
      rfp: "bg-purple-100 text-purple-800",
      users: "bg-orange-100 text-orange-800",
      general: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.general;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>
            Manage email templates for different functionalities. Use variables like &#123;&#123;variable_name&#125;&#125; for dynamic content.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTemplate(null); form.reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Email Template" : "Create Email Template"}</DialogTitle>
              <DialogDescription>
                Create a new email template with dynamic variables. Variables should be enclosed in double curly braces like &#123;&#123;variable_name&#125;&#125;.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Purchase Order Email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="template_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Key *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., purchase_order" 
                            {...field} 
                            disabled={editingTemplate?.is_system}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique identifier (lowercase, underscores only)
                        </FormDescription>
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
                        <Input placeholder="Brief description of when this template is used" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Auto-populate available variables based on category
                          const categoryVars = CATEGORY_VARIABLES[value] || CATEGORY_VARIABLES.general;
                          form.setValue("available_variables", categoryVars);
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="purchase_orders">Purchase Orders</SelectItem>
                          <SelectItem value="invoices">Invoices</SelectItem>
                          <SelectItem value="rfp">RFP/RFQ</SelectItem>
                          <SelectItem value="users">User Management</SelectItem>
                          <SelectItem value="inventory">Inventory</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Selecting a category will auto-populate available variables
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="subject_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Purchase Order - {{po_number}}" {...field} />
                      </FormControl>
                      <FormDescription>
                        Use &#123;&#123;variable_name&#125;&#125; for dynamic content
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Body *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Dear {{vendor_name}},&#10;&#10;Please find attached...&#10;&#10;Best regards,&#10;{{sender_name}}" 
                          {...field}
                          rows={12}
                        />
                      </FormControl>
                      <FormDescription>
                        Use &#123;&#123;variable_name&#125;&#125; for dynamic content
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>Available Variables</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddVariable}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Variable
                    </Button>
                  </div>
                  <Alert>
                    <AlertDescription className="text-xs">
                      Variables are automatically populated based on the selected category. You can add custom variables or modify the existing ones.
                      Use these variables in your subject and body templates like: &#123;&#123;variable_name&#125;&#125;
                    </AlertDescription>
                  </Alert>

                  {form.watch("available_variables").map((_, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <FormField
                        control={form.control}
                        name={`available_variables.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Variable name (e.g., po_number)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`available_variables.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="flex-[2]">
                            <FormControl>
                              <Input placeholder="Description (e.g., Purchase Order Number)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveVariable(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTemplate ? "Update Template" : "Create Template"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading templates...</p>
        ) : templates.length === 0 ? (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              No email templates found. Create your first template to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Template Key</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryBadgeColor(template.category)}>
                      {template.category.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{template.template_key}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(template.available_variables) && template.available_variables.slice(0, 3).map((variable: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          &#123;&#123;{variable.name}&#125;&#125;
                        </Badge>
                      ))}
                      {Array.isArray(template.available_variables) && template.available_variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.available_variables.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {template.is_system && (
                      <Badge variant="outline" className="ml-1">System</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreview(template)}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(template)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!template.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this template?")) {
                              deleteTemplateMutation.mutate(template.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              This is how the email template looks. Variables are shown in their original format.
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Subject:</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm">{previewTemplate.subject_template}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Body:</Label>
                <div className="mt-1 p-4 bg-muted rounded-md">
                  <pre className="text-sm whitespace-pre-wrap font-sans">{previewTemplate.body_template}</pre>
                </div>
              </div>
              {previewTemplate.available_variables && Array.isArray(previewTemplate.available_variables) && previewTemplate.available_variables.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Available Variables:</Label>
                  <div className="mt-2 space-y-2">
                    {previewTemplate.available_variables.map((variable: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <code className="bg-muted px-2 py-1 rounded text-xs">&#123;&#123;{variable.name}&#125;&#125;</code>
                        <span className="text-muted-foreground">- {variable.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EmailTemplatesManager;