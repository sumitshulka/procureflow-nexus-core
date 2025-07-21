import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calculator, Table, Settings, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PricingTemplate {
  id: string;
  name: string;
  description: string;
  template_data: any;
  category: string;
  usage_count: number;
  created_at: string;
}

interface PricingField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'number' | 'text' | 'dropdown' | 'calculated';
  field_options?: any;
  is_required: boolean;
  row_number: number;
  column_number: number;
  calculation_formula?: string;
  description?: string;
}

interface RfpPricingFormatProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

const RfpPricingFormat: React.FC<RfpPricingFormatProps> = ({ data, onUpdate, onNext }) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PricingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(data.pricingTemplate?.id || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'general'
  });
  const [templateFields, setTemplateFields] = useState<PricingField[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PricingTemplate | null>(null);

  useEffect(() => {
    fetchPricingTemplates();
  }, []);

  const fetchPricingTemplates = async () => {
    try {
      const { data: templatesData, error } = await supabase
        .from('pricing_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(templatesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch pricing templates",
        variant: "destructive",
      });
    }
  };

  const addTableField = () => {
    const newField: PricingField = {
      id: `field_${Date.now()}`,
      field_name: `field_${templateFields.length + 1}`,
      field_label: `Field ${templateFields.length + 1}`,
      field_type: 'text',
      is_required: false,
      row_number: Math.floor(templateFields.length / 3) + 1,
      column_number: (templateFields.length % 3) + 1,
      description: ''
    };
    setTemplateFields([...templateFields, newField]);
  };

  const updateField = (fieldId: string, updates: Partial<PricingField>) => {
    setTemplateFields(prev => 
      prev.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );
  };

  const removeField = (fieldId: string) => {
    setTemplateFields(prev => prev.filter(field => field.id !== fieldId));
  };

  const saveNewTemplate = async () => {
    try {
      const { data: templateData, error } = await supabase
        .from('pricing_templates')
        .insert({
          name: newTemplate.name,
          description: newTemplate.description,
          category: newTemplate.category,
          template_data: {
            fields: templateFields.map(field => ({
              id: field.id,
              field_name: field.field_name,
              field_label: field.field_label,
              field_type: field.field_type,
              field_options: field.field_options || null,
              is_required: field.is_required,
              row_number: field.row_number,
              column_number: field.column_number,
              calculation_formula: field.calculation_formula || null,
              description: field.description || null
            })),
            structure: {
              rows: Math.max(...templateFields.map(f => f.row_number), 1),
              columns: 3
            }
          } as any,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Save template fields
      if (templateFields.length > 0) {
        const fieldsToInsert = templateFields.map(field => ({
          template_id: templateData.id,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options,
          is_required: field.is_required,
          row_number: field.row_number,
          column_number: field.column_number,
          calculation_formula: field.calculation_formula,
          description: field.description,
          display_order: templateFields.indexOf(field)
        }));

        const { error: fieldsError } = await supabase
          .from('pricing_template_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      toast({
        title: "Success",
        description: "Pricing template created successfully",
      });

      setSelectedTemplate(templateData.id);
      setIsCreatingNew(false);
      fetchPricingTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create pricing template",
        variant: "destructive",
      });
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onUpdate({
        pricingTemplate: template
      });
    }
  };

  const handleContinue = () => {
    if (!selectedTemplate && !isCreatingNew) {
      toast({
        title: "Error",
        description: "Please select a pricing template or create a new one",
        variant: "destructive",
      });
      return;
    }

    if (isCreatingNew) {
      if (!newTemplate.name || templateFields.length === 0) {
        toast({
          title: "Error",
          description: "Please provide template name and add at least one field",
          variant: "destructive",
        });
        return;
      }
      saveNewTemplate();
      return;
    }

    onNext();
  };

  const previewTemplateStructure = async (template: PricingTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Pricing Format Selection</h3>
        <p className="text-sm text-muted-foreground">
          Choose how vendors should submit their pricing information. You can select an existing template or create a custom pricing format.
        </p>
      </div>

      <Tabs value={isCreatingNew ? "create" : "select"} onValueChange={(value) => setIsCreatingNew(value === "create")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="select">Select Existing Template</TabsTrigger>
          <TabsTrigger value="create">Create New Template</TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card 
                key={template.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{template.category}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          previewTemplateStructure(template);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Used {template.usage_count} times</span>
                    <span>{new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Table className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pricing templates available.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first pricing template to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Template Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="templateName">Template Name *</Label>
                  <Input
                    id="templateName"
                    placeholder="e.g., Standard BOQ Format"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newTemplate.category} 
                    onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="goods">Goods Procurement</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe when to use this pricing format..."
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Pricing Table Structure
                </CardTitle>
                <Button onClick={addTableField} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {templateFields.length === 0 ? (
                <div className="text-center py-8">
                  <Table className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No fields added yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add fields to define your pricing table structure.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {templateFields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Field Label</Label>
                          <Input
                            value={field.field_label}
                            onChange={(e) => updateField(field.id, { field_label: e.target.value })}
                            placeholder="e.g., Unit Price"
                          />
                        </div>
                        <div>
                          <Label>Field Type</Label>
                          <Select 
                            value={field.field_type} 
                            onValueChange={(value) => updateField(field.id, { field_type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="dropdown">Dropdown</SelectItem>
                              <SelectItem value="calculated">Calculated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeField(field.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {field.field_type === 'calculated' && (
                        <div className="mt-3">
                          <Label>Calculation Formula</Label>
                          <Input
                            value={field.calculation_formula || ''}
                            onChange={(e) => updateField(field.id, { calculation_formula: e.target.value })}
                            placeholder="e.g., quantity * unit_price"
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Template Structure Preview</h4>
              <p className="text-sm text-muted-foreground">
                This shows how vendors will see the pricing form based on this template.
              </p>
            </div>
            
            {previewTemplate?.template_data?.fields && (
              <div className="border rounded-lg p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Field</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Input</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTemplate.template_data.fields.map((field: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{field.field_label}</td>
                        <td className="p-2">
                          <Badge variant="outline">{field.field_type}</Badge>
                        </td>
                        <td className="p-2">
                          {field.field_type === 'number' ? (
                            <Input type="number" placeholder="0.00" disabled />
                          ) : field.field_type === 'calculated' ? (
                            <Input value="Auto-calculated" disabled />
                          ) : (
                            <Input placeholder={`Enter ${field.field_label.toLowerCase()}`} disabled />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end">
        <Button onClick={handleContinue}>
          {isCreatingNew ? 'Save Template & Continue' : 'Continue to Terms & Conditions'}
        </Button>
      </div>
    </div>
  );
};

export default RfpPricingFormat;