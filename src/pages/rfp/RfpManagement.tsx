import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Eye, 
  Edit, 
  Search, 
  Plus, 
  Lock, 
  MoreVertical, 
  FileText, 
  MessageSquare,
  Copy,
  Trash2,
  Star,
  Calculator,
  Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface RFP {
  id: string;
  title: string;
  rfp_number: string;
  status: string;
  estimated_value: number;
  currency: string;
  submission_deadline: string;
  created_at: string;
  created_by: string;
}

interface RfpTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template_data: any;
  created_at: string;
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
  created_at: string;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
}

const RfpManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab state
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "rfps");
  const [templateTab, setTemplateTab] = useState("rfp");
  
  // RFPs state
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [filteredRfps, setFilteredRfps] = useState<RFP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Templates state
  const [templates, setTemplates] = useState<RfpTemplate[]>([]);
  const [pricingTemplates, setPricingTemplates] = useState<PricingTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RfpTemplate[]>([]);
  const [filteredPricingTemplates, setFilteredPricingTemplates] = useState<PricingTemplate[]>([]);
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchRfps();
    fetchTemplates();
    fetchPricingTemplates();
  }, []);

  useEffect(() => {
    filterRfps();
  }, [rfps, searchTerm, statusFilter]);

  useEffect(() => {
    filterTemplates();
    filterPricingTemplates();
  }, [templates, pricingTemplates, templateSearchTerm, categoryFilter]);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);

  const fetchRfps = async () => {
    try {
      const { data, error } = await supabase
        .from("rfps")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRfps(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch RFPs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      console.error("Error fetching RFP templates:", error);
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
      console.error("Error fetching pricing templates:", error);
    }
  };

  const filterRfps = () => {
    let filtered = rfps;

    if (searchTerm) {
      filtered = filtered.filter(
        (rfp) =>
          rfp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rfp.rfp_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((rfp) => rfp.status === statusFilter);
    }

    setFilteredRfps(filtered);
  };

  const filterTemplates = () => {
    let filtered = templates.filter(t => t.is_active);

    if (templateSearchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(templateSearchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    setFilteredTemplates(filtered);
  };

  const filterPricingTemplates = () => {
    let filtered = pricingTemplates.filter(t => t.is_active);

    if (templateSearchTerm) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(templateSearchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    setFilteredPricingTemplates(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "published": return "default";
      case "evaluation": return "outline";
      case "awarded": return "default";
      case "canceled": return "destructive";
      case "closed": return "destructive";
      case "expired": return "secondary";
      default: return "secondary";
    }
  };

  const handleCloseRfp = async (rfpId: string) => {
    try {
      const { error } = await supabase
        .from("rfps")
        .update({ status: "closed" })
        .eq("id", rfpId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "RFP has been closed",
      });
      fetchRfps();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to close RFP",
        variant: "destructive",
      });
    }
  };

  const handlePublishRfp = async (rfpId: string) => {
    try {
      const { error } = await supabase
        .from("rfps")
        .update({ status: "published" })
        .eq("id", rfpId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "RFP published successfully",
      });
      fetchRfps();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish RFP",
        variant: "destructive",
      });
    }
  };

  const handleUseTemplate = async (template: RfpTemplate) => {
    try {
      const { data: fields, error } = await supabase
        .from('rfp_template_fields')
        .select('*')
        .eq('template_id', template.id)
        .order('display_order');

      if (error) throw error;

      const templateWithFields = {
        ...template,
        fields: fields || []
      };

      const templateData = encodeURIComponent(JSON.stringify(templateWithFields));
      navigate(`/rfp/create-wizard?template=${templateData}`);

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

  const handleDeleteTemplate = async (templateId: string, type: 'rfp' | 'pricing') => {
    try {
      if (type === 'rfp') {
        const { error } = await supabase
          .rpc('soft_delete_rfp_template', { p_template_id: templateId });
        if (error) throw error;
        setTemplates(prev => prev.filter(t => t.id !== templateId));
      } else {
        const { error } = await supabase
          .from('pricing_templates')
          .update({ is_active: false })
          .eq('id', templateId);
        if (error) throw error;
        setPricingTemplates(prev => prev.filter(t => t.id !== templateId));
      }
      
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

  const categories = [...new Set([...templates.map(t => t.category), ...pricingTemplates.map(t => t.category)])];

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">RFP Management</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab("templates")}>
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => navigate("/rfp/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create RFP
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="rfps" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All RFPs
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* All RFPs Tab */}
        <TabsContent value="rfps" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search RFPs by title or number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="evaluation">Under Evaluation</SelectItem>
                    <SelectItem value="awarded">Awarded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFP Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Estimated Value</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRfps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No RFPs found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRfps.map((rfp) => (
                      <TableRow key={rfp.id}>
                        <TableCell className="font-medium">{rfp.rfp_number}</TableCell>
                        <TableCell>{rfp.title}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(rfp.status)}>
                            {rfp.status.charAt(0).toUpperCase() + rfp.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rfp.estimated_value 
                            ? `${rfp.currency} ${rfp.estimated_value.toLocaleString()}` 
                            : "N/A"}
                        </TableCell>
                        <TableCell>{format(new Date(rfp.submission_deadline), "PP")}</TableCell>
                        <TableCell>{format(new Date(rfp.created_at), "PP")}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/rfp/${rfp.id}/responses`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details & Responses
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/rfp/wizard?rfpId=${rfp.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit RFP
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {rfp.status === "draft" && (
                                <DropdownMenuItem onClick={() => handlePublishRfp(rfp.id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Publish RFP
                                </DropdownMenuItem>
                              )}
                              {(rfp.status === "published" || rfp.status === "evaluation") && (
                                <DropdownMenuItem onClick={() => handleCloseRfp(rfp.id)}>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Close RFP
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <Tabs value={templateTab} onValueChange={setTemplateTab}>
              <TabsList>
                <TabsTrigger value="rfp" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  RFP Templates
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Pricing Templates
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => navigate(templateTab === "rfp" ? "/rfp/templates/create" : "/rfp/pricing-templates/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create {templateTab === "rfp" ? "RFP" : "Pricing"} Template
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={templateSearchTerm}
                      onChange={(e) => setTemplateSearchTerm(e.target.value)}
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

          {templateTab === "rfp" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No RFP templates found.
                  </CardContent>
                </Card>
              ) : (
                filteredTemplates.map((template) => (
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
                      <div className="text-sm text-muted-foreground mb-4">
                        Created: {format(new Date(template.created_at), "PPP")}
                      </div>
                      <div className="flex gap-2">
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
                          onClick={() => handleDeleteTemplate(template.id, 'rfp')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPricingTemplates.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No pricing templates found.
                  </CardContent>
                </Card>
              ) : (
                filteredPricingTemplates.map((template) => (
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
                      <div className="text-sm text-muted-foreground mb-4">
                        Created: {format(new Date(template.created_at), "PPP")}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteTemplate(template.id, 'pricing')}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RfpManagement;
