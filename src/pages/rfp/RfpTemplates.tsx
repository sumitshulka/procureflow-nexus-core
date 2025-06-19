
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Search, Copy, Edit, Trash2, FileText, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { format } from "date-fns";

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

interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date';
  required: boolean;
  options?: string[];
  description?: string;
}

const RfpTemplates = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<RfpTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RfpTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RfpTemplate | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "",
      title: "",
      templateDescription: "",
      terms_and_conditions: "",
      evaluation_type: "qcbs",
      technical_weight: 70,
      commercial_weight: 30,
      fields: [] as TemplateField[]
    }
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, categoryFilter]);

  const fetchTemplates = async () => {
    try {
      // Mock templates data based on our database design
      const mockTemplates: RfpTemplate[] = [
        {
          id: "1",
          name: "IT Equipment Standard",
          description: "Standard template for IT equipment procurement with technical specifications",
          category: "IT",
          template_data: {
            title: "Request for Proposal - IT Equipment",
            description: "We are seeking proposals for the procurement of IT equipment including computers, servers, and networking equipment.",
            terms_and_conditions: "Standard terms and conditions for IT procurement",
            evaluation_criteria: {
              type: "qcbs",
              technical_weight: 70,
              commercial_weight: 30
            },
            fields: [
              {
                name: "technical_specifications",
                label: "Technical Specifications",
                type: "textarea",
                required: true,
                description: "Detailed technical requirements"
              },
              {
                name: "warranty_period",
                label: "Warranty Period",
                type: "select",
                options: ["1 year", "2 years", "3 years"],
                required: true
              },
              {
                name: "delivery_timeline",
                label: "Required Delivery Timeline",
                type: "text",
                required: true
              }
            ]
          },
          created_at: "2024-06-15T10:00:00Z",
          updated_at: "2024-06-15T10:00:00Z",
          is_active: true,
          is_default: true,
          usage_count: 15
        },
        {
          id: "2",
          name: "Services Procurement",
          description: "Template for procuring professional services",
          category: "Services",
          template_data: {
            title: "Request for Proposal - Professional Services",
            description: "We are seeking proposals for professional services.",
            terms_and_conditions: "Standard terms and conditions for services procurement",
            evaluation_criteria: {
              type: "technical_l1"
            },
            fields: [
              {
                name: "service_description",
                label: "Service Description",
                type: "textarea",
                required: true
              },
              {
                name: "team_composition",
                label: "Team Composition",
                type: "textarea",
                required: true
              },
              {
                name: "project_timeline",
                label: "Project Timeline",
                type: "text",
                required: true
              }
            ]
          },
          created_at: "2024-06-10T14:30:00Z",
          updated_at: "2024-06-10T14:30:00Z",
          is_active: true,
          is_default: false,
          usage_count: 8
        },
        {
          id: "3",
          name: "Construction Works",
          description: "Template for construction and infrastructure projects",
          category: "Construction",
          template_data: {
            title: "Request for Proposal - Construction Works",
            description: "We are seeking proposals for construction works.",
            terms_and_conditions: "Standard terms and conditions for construction procurement",
            evaluation_criteria: {
              type: "qcbs",
              technical_weight: 60,
              commercial_weight: 40
            },
            fields: [
              {
                name: "project_scope",
                label: "Project Scope",
                type: "textarea",
                required: true
              },
              {
                name: "completion_timeline",
                label: "Completion Timeline",
                type: "text",
                required: true
              },
              {
                name: "safety_requirements",
                label: "Safety Requirements",
                type: "textarea",
                required: true
              }
            ]
          },
          created_at: "2024-06-05T09:15:00Z",
          updated_at: "2024-06-05T09:15:00Z",
          is_active: true,
          is_default: false,
          usage_count: 3
        }
      ];

      setTemplates(mockTemplates);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates.filter(t => t.is_active);

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = async (data: any) => {
    try {
      const templateData = {
        title: data.title,
        description: data.templateDescription,
        terms_and_conditions: data.terms_and_conditions,
        evaluation_criteria: {
          type: data.evaluation_type,
          ...(data.evaluation_type === 'qcbs' && {
            technical_weight: data.technical_weight,
            commercial_weight: data.commercial_weight
          })
        },
        fields: data.fields
      };

      const newTemplate: RfpTemplate = {
        id: Date.now().toString(),
        name: data.name,
        description: data.description,
        category: data.category,
        template_data: templateData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        is_default: false,
        usage_count: 0
      };

      setTemplates(prev => [newTemplate, ...prev]);
      setIsCreateDialogOpen(false);
      form.reset();
      
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const handleUseTemplate = (template: RfpTemplate) => {
    // Navigate to RFP creation with template data
    const templateData = encodeURIComponent(JSON.stringify(template));
    navigate(`/rfp/create-wizard?template=${templateData}`);
  };

  const handleDuplicateTemplate = (template: RfpTemplate) => {
    const duplicatedTemplate: RfpTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_default: false,
      usage_count: 0
    };

    setTemplates(prev => [duplicatedTemplate, ...prev]);
    
    toast({
      title: "Success",
      description: "Template duplicated successfully",
    });
  };

  const categories = [...new Set(templates.map(t => t.category))];

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">RFP Templates</h1>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New RFP Template</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateTemplate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter template name" {...field} />
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
                        <Textarea placeholder="Enter template description" {...field} />
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
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., IT, Services, Construction" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default RFP Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter default RFP title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="templateDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default RFP Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter default RFP description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="evaluation_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evaluation Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select evaluation method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="qcbs">QCBS (Quality & Cost Based)</SelectItem>
                          <SelectItem value="price_l1">Price L1 (Lowest Price)</SelectItem>
                          <SelectItem value="technical_l1">Technical L1 (Highest Technical Score)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit">Create Template</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
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

      {/* Templates Grid */}
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
                  <p>Evaluation: {template.template_data.evaluation_criteria?.type?.toUpperCase().replace('_', ' ')}</p>
                  <p>Fields: {template.template_data.fields?.length || 0} custom fields</p>
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
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-4 w-4" />
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
            <p className="text-muted-foreground">No templates found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RfpTemplates;
