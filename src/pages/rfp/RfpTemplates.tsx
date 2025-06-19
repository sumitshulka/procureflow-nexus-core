
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Copy, Edit, Trash2, FileText, Star, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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

const RfpTemplates = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<RfpTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RfpTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, categoryFilter]);

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
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    setFilteredTemplates(filtered);
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

  const handleDuplicateTemplate = async (template: RfpTemplate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create duplicate template
      const { data: newTemplate, error: templateError } = await supabase
        .from('rfp_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          template_data: template.template_data,
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
        .eq('template_id', template.id);

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
      
      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('rfp_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      await fetchTemplates();
      
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
        <Button onClick={() => navigate("/rfp/templates/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
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
                    onClick={() => handleDuplicateTemplate(template)}
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
            <p className="text-muted-foreground">No templates found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RfpTemplates;
