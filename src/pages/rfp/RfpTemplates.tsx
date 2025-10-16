
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Copy, Edit, Trash2, FileText, Star, Settings, Eye, Table, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface RfpTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template_data: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
}

interface PricingTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template_data: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
}

const RfpTemplates = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("rfp");
  const [templates, setTemplates] = useState<RfpTemplate[]>([]);
  const [pricingTemplates, setPricingTemplates] = useState<PricingTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RfpTemplate[]>([]);
  const [filteredPricingTemplates, setFilteredPricingTemplates] = useState<PricingTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<RfpTemplate | null>(null);
  const [selectedPricingTemplate, setSelectedPricingTemplate] = useState<PricingTemplate | null>(null);
  const [templateFields, setTemplateFields] = useState<any[]>([]);
  const [pricingTemplateFields, setPricingTemplateFields] = useState<any[]>([]);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [templateToCopy, setTemplateToCopy] = useState<RfpTemplate | null>(null);
  const [pricingTemplateToCopy, setPricingTemplateToCopy] = useState<PricingTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");

  useEffect(() => {
    fetchTemplates();
    fetchPricingTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
    filterPricingTemplates();
  }, [templates, pricingTemplates, searchTerm, categoryFilter]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('rfp_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch RFP templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPricingTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPricingTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch pricing templates",
        variant: "destructive",
      });
    }
  };

  const filterTemplates = () => {
    let filtered = templates.filter(t => t.is_active);

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    setFilteredTemplates(filtered);
  };

  const filterPricingTemplates = () => {
    let filtered = pricingTemplates.filter(t => t.is_active);

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    setFilteredPricingTemplates(filtered);
  };

  const handleUseTemplate = async (template: RfpTemplate) => {
    try {
      // Fetch template fields
      const { data: fields, error } = await supabase
        .from('rfp_template_fields')
        .select('*')
        .eq('template_id', template.id)
        .order('display_order');

      if (error) throw error;

      // Include fields in template data and navigate
      const templateWithFields = {
        ...template,
        fields: fields || []
      };

      const templateData = encodeURIComponent(JSON.stringify(templateWithFields));
      navigate(`/rfp/create-wizard?template=${templateData}`);

      // Update usage count
      await supabase
        .from('rfp_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to use template",
        variant: "destructive",
      });
    }
  };

  const handleCopyTemplate = (template: RfpTemplate) => {
    setTemplateToCopy(template);
    setNewTemplateName(`${template.name} (Copy)`);
    setCopyDialogOpen(true);
  };

  const handleConfirmCopy = async (shouldEdit: boolean = false) => {
    if (!templateToCopy || !newTemplateName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a name for the new template",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to copy templates",
        variant: "destructive",
      });
      return;
    }

    try {

      // Create duplicate template
      const { data: newTemplate, error: templateError } = await supabase
        .from('rfp_templates')
        .insert({
          name: newTemplateName.trim(),
          description: templateToCopy.description,
          category: templateToCopy.category,
          template_data: templateToCopy.template_data,
          created_by: user.id,
          is_default: false,
          usage_count: 0
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Fetch and duplicate fields
      const { data: fields, error: fieldsError } = await supabase
        .from('rfp_template_fields')
        .select('*')
        .eq('template_id', templateToCopy.id);

      if (fieldsError) throw fieldsError;

      if (fields && fields.length > 0) {
        const newFields = fields.map(field => ({
          template_id: newTemplate.id,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options,
          is_required: field.is_required,
          display_order: field.display_order,
          description: field.description
        }));

        const { error: insertFieldsError } = await supabase
          .from('rfp_template_fields')
          .insert(newFields);

        if (insertFieldsError) throw insertFieldsError;
      }

      await fetchTemplates();
      
      // Close dialog and reset state
      setCopyDialogOpen(false);
      setTemplateToCopy(null);
      setNewTemplateName("");
      
      toast({
        title: "Success",
        description: `Template "${newTemplateName}" created successfully`,
      });

      // Navigate to edit if user chose to edit
      if (shouldEdit) {
        // TODO: Navigate to template editor with newTemplate.id
        // This would require implementing a template editor page
        toast({
          title: "Info",
          description: "Template editor is not yet implemented. You can use the template from the templates list.",
        });
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to copy template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('soft_delete_rfp_template', { p_template_id: templateId });

      if (error) throw error;

      // Remove the template from local state immediately
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleViewTemplate = async (template: RfpTemplate) => {
    try {
      const { data: fields, error } = await supabase
        .from('rfp_template_fields')
        .select('*')
        .eq('template_id', template.id)
        .order('display_order');

      if (error) throw error;
      
      setTemplateFields(fields || []);
      setSelectedTemplate(template);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load template details",
        variant: "destructive",
      });
    }
  };

  const categories = [...new Set([...templates.map(t => t.category), ...pricingTemplates.map(t => t.category)])];

  const handleCreateNewTemplate = () => {
    if (activeTab === "rfp") {
      navigate("/rfp/templates/create");
    } else {
      navigate("/rfp/pricing-templates/create");
    }
  };

  const handleViewPricingTemplate = async (template: PricingTemplate) => {
    try {
      const { data: fields, error } = await supabase
        .from('pricing_template_fields')
        .select('*')
        .eq('template_id', template.id)
        .order('display_order');

      if (error) throw error;
      
      setPricingTemplateFields(fields || []);
      setSelectedPricingTemplate(template);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load pricing template details",
        variant: "destructive",
      });
    }
  };

  const handleDeletePricingTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('pricing_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      setPricingTemplates(prev => prev.filter(t => t.id !== templateId));
      
      toast({
        title: "Success",
        description: "Pricing template deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete pricing template",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Templates</h1>
        </div>
        <Button onClick={handleCreateNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Create {activeTab === "rfp" ? "RFP" : "Pricing"} Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rfp" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            RFP Templates
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Pricing Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rfp" className="mt-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search RFP templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* RFP Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{template.category}</Badge>
                    <Badge variant="secondary">Used {template.usage_count} times</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p>Created: {format(new Date(template.created_at), "PPP")}</p>
                      <p>Evaluation: {template.template_data.evaluation_criteria?.type?.toUpperCase().replace('_', ' ') || 'Not specified'}</p>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        size="sm" 
                        onClick={() => handleUseTemplate(template)}
                        className="flex-1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewTemplate(template)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCopyTemplate(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No RFP templates found matching your criteria.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pricing templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPricingTemplates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        {template.name}
                        {template.is_default && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{template.category}</Badge>
                    <Badge variant="secondary">Used {template.usage_count} times</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p>Created: {format(new Date(template.created_at), "PPP")}</p>
                      <p>Type: Pricing Format Template</p>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewPricingTemplate(template)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeletePricingTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPricingTemplates.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pricing templates found matching your criteria.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create pricing templates during RFP creation to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* RFP Template Details Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedTemplate?.name}
              {selectedTemplate?.is_default && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-6">
              {/* Template Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Template Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <Badge variant="outline">{selectedTemplate.category}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Usage Count</p>
                      <p>{selectedTemplate.usage_count} times</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p>{format(new Date(selectedTemplate.created_at), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                      <p>{format(new Date(selectedTemplate.updated_at), "PPP")}</p>
                    </div>
                  </div>
                  
                  {selectedTemplate.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                      <p className="text-sm">{selectedTemplate.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Template Configuration */}
              {selectedTemplate.template_data && (
                <Card>
                  <CardHeader>
                    <CardTitle>Template Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedTemplate.template_data.evaluation_criteria && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Evaluation Criteria</p>
                        <p className="text-sm">{selectedTemplate.template_data.evaluation_criteria.type?.toUpperCase().replace('_', ' ') || 'Not specified'}</p>
                      </div>
                    )}
                    
                    {selectedTemplate.template_data.bid_validity_period && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Bid Validity Period</p>
                        <p className="text-sm">{selectedTemplate.template_data.bid_validity_period} days</p>
                      </div>
                    )}
                    
                    {selectedTemplate.template_data.currency && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Currency</p>
                        <p className="text-sm">{selectedTemplate.template_data.currency}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Template Fields */}
              {templateFields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Fields ({templateFields.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {templateFields.map((field, index) => (
                        <div key={field.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{field.field_label}</p>
                                {field.is_required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {field.field_type}
                                </Badge>
                              </div>
                              {field.description && (
                                <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                              )}
                              {field.field_options && (
                                <div className="mt-2">
                                  <p className="text-xs text-muted-foreground">Options:</p>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {Object.entries(field.field_options).map(([key, value]) => (
                                      <Badge key={key} variant="outline" className="text-xs">
                                        {String(value)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Order: {field.display_order}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                  handleUseTemplate(selectedTemplate);
                  setSelectedTemplate(null);
                }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Use This Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Copy Template Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Copy Template
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Create a copy of "{templateToCopy?.name}" with a new name.
              </p>
              
              <div className="space-y-2">
                <label htmlFor="templateName" className="text-sm font-medium">
                  New Template Name
                </label>
                <Input
                  id="templateName"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Enter template name"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button 
                onClick={() => handleConfirmCopy(false)}
                disabled={!newTemplateName.trim()}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Template
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => handleConfirmCopy(true)}
                disabled={!newTemplateName.trim()}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Copy & Edit Template
              </Button>
              
              <Button 
                variant="ghost"
                onClick={() => {
                  setCopyDialogOpen(false);
                  setTemplateToCopy(null);
                  setNewTemplateName("");
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Template Details Dialog */}
      <Dialog open={!!selectedPricingTemplate} onOpenChange={() => setSelectedPricingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {selectedPricingTemplate?.name}
              {selectedPricingTemplate?.is_default && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPricingTemplate && (
            <div className="space-y-6">
              {/* Template Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Template Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <Badge variant="outline">{selectedPricingTemplate.category}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Usage Count</p>
                      <p>{selectedPricingTemplate.usage_count} times</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p>{format(new Date(selectedPricingTemplate.created_at), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                      <p>{format(new Date(selectedPricingTemplate.updated_at), "PPP")}</p>
                    </div>
                  </div>
                  
                  {selectedPricingTemplate.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                      <p className="text-sm">{selectedPricingTemplate.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pricing Template Fields */}
              {pricingTemplateFields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Fields ({pricingTemplateFields.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pricingTemplateFields.map((field, index) => (
                        <div key={field.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{field.field_label}</p>
                                <Badge variant="secondary" className="text-xs">
                                  {field.field_type}
                                </Badge>
                                {field.is_required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Row {field.row_number}, Column {field.column_number}
                              </p>
                              {field.description && (
                                <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                              )}
                              {field.calculation_formula && (
                                <p className="text-sm font-mono bg-muted p-1 rounded mt-1">
                                  Formula: {field.calculation_formula}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RfpTemplates;
