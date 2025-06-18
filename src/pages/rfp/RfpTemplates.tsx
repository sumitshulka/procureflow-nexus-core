import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Copy, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";

interface RfpTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: {
    title: string;
    description: string;
    terms_and_conditions: string;
    evaluation_criteria: Array<{
      name: string;
      weight: number;
      description: string;
    }>;
    submission_requirements: string[];
  };
  created_at: string;
  updated_at: string;
  is_default: boolean;
  usage_count: number;
}

const RfpTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<RfpTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RfpTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RfpTemplate | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "",
      title: "",
      content_description: "",
      terms_and_conditions: "",
      submission_requirements: "",
    },
  });

  const editForm = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "",
      title: "",
      content_description: "",
      terms_and_conditions: "",
      submission_requirements: "",
    },
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, categoryFilter]);

  const fetchTemplates = async () => {
    // Mock data - replace with actual database queries
    const mockTemplates: RfpTemplate[] = [
      {
        id: "1",
        name: "IT Equipment Procurement",
        description: "Standard template for procuring IT equipment and hardware",
        category: "IT",
        content: {
          title: "Request for Proposal - IT Equipment",
          description: "We are seeking proposals for the procurement of IT equipment including computers, servers, and networking equipment.",
          terms_and_conditions: "Standard terms and conditions for IT procurement",
          evaluation_criteria: [
            { name: "Technical Compliance", weight: 40, description: "Technical specifications compliance" },
            { name: "Price", weight: 35, description: "Commercial evaluation" },
            { name: "Delivery Timeline", weight: 15, description: "Delivery schedule" },
            { name: "Warranty & Support", weight: 10, description: "Post-sale support" }
          ],
          submission_requirements: [
            "Technical specifications document",
            "Commercial proposal",
            "Company registration certificate",
            "Tax compliance certificate"
          ]
        },
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-20T15:30:00Z",
        is_default: true,
        usage_count: 15
      },
      {
        id: "2",
        name: "Office Supplies",
        description: "Template for office supplies and stationery procurement",
        category: "General",
        content: {
          title: "Request for Proposal - Office Supplies",
          description: "We are seeking proposals for the supply of office supplies and stationery items.",
          terms_and_conditions: "Standard terms and conditions for supplies procurement",
          evaluation_criteria: [
            { name: "Price", weight: 50, description: "Commercial evaluation" },
            { name: "Quality", weight: 25, description: "Product quality" },
            { name: "Delivery", weight: 25, description: "Delivery capability" }
          ],
          submission_requirements: [
            "Product catalog",
            "Price list",
            "Delivery schedule",
            "Quality certificates"
          ]
        },
        created_at: "2024-01-10T08:00:00Z",
        updated_at: "2024-01-18T12:00:00Z",
        is_default: false,
        usage_count: 8
      }
    ];

    setTemplates(mockTemplates);
    setIsLoading(false);
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((template) => template.category === categoryFilter);
    }

    setFilteredTemplates(filtered);
  };

  const handleEditTemplate = (template: RfpTemplate) => {
    setEditingTemplate(template);
    editForm.reset({
      name: template.name,
      description: template.description,
      category: template.category,
      title: template.content.title,
      content_description: template.content.description,
      terms_and_conditions: template.content.terms_and_conditions,
      submission_requirements: template.content.submission_requirements.join('\n'),
    });
    setIsEditDialogOpen(true);
  };

  const handleDuplicateTemplate = (template: RfpTemplate) => {
    const duplicatedTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      is_default: false
    };
    
    setTemplates([duplicatedTemplate, ...templates]);
    toast({
      title: "Success",
      description: "Template duplicated successfully",
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(t => t.id !== templateId));
    toast({
      title: "Success",
      description: "Template deleted successfully",
    });
  };

  const onSubmit = (data: any) => {
    const newTemplate: RfpTemplate = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      category: data.category,
      content: {
        title: data.title,
        description: data.content_description,
        terms_and_conditions: data.terms_and_conditions,
        evaluation_criteria: [],
        submission_requirements: data.submission_requirements.split('\n').filter((req: string) => req.trim())
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_default: false,
      usage_count: 0
    };

    setTemplates([newTemplate, ...templates]);
    setIsCreateDialogOpen(false);
    form.reset();
    
    toast({
      title: "Success",
      description: "RFP template created successfully",
    });
  };

  const onEditSubmit = (data: any) => {
    if (!editingTemplate) return;

    const updatedTemplate: RfpTemplate = {
      ...editingTemplate,
      name: data.name,
      description: data.description,
      category: data.category,
      content: {
        ...editingTemplate.content,
        title: data.title,
        description: data.content_description,
        terms_and_conditions: data.terms_and_conditions,
        submission_requirements: data.submission_requirements.split('\n').filter((req: string) => req.trim())
      },
      updated_at: new Date().toISOString(),
    };

    setTemplates(templates.map(t => t.id === editingTemplate.id ? updatedTemplate : t));
    setIsEditDialogOpen(false);
    setEditingTemplate(null);
    editForm.reset();
    
    toast({
      title: "Success",
      description: "RFP template updated successfully",
    });
  };

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">RFP Templates</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create RFP Template</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <Textarea placeholder="Template description" {...field} />
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
                        <Input placeholder="e.g., IT, General, Services" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
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

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit RFP Template</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
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
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Template description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., IT, General, Services" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-4">
                <Button type="submit">Update Template</Button>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Services">Services</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  {template.is_default && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                  <Badge variant="outline">{template.category}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium">Used:</span>  {template.usage_count} times
                </div>
                <div className="text-sm">
                  <span className="font-medium">Last updated:</span>{" "}
                  {new Date(template.updated_at).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDuplicateTemplate(template)}>
                    <Copy className="h-3 w-3 mr-1" />
                    Duplicate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  {!template.is_default && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No RFP templates found.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first template to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RfpTemplates;
