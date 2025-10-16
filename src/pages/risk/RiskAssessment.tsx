import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Plus, Search, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface RiskCategory {
  id: string;
  name: string;
  color: string;
}

interface RiskAssessment {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  probability: number;
  impact: number;
  risk_score: number;
  risk_level: string;
  mitigation_strategy: string | null;
  owner_id: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  category?: RiskCategory;
}

const RiskAssessment = () => {
  const { toast } = useToast();
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [filteredRisks, setFilteredRisks] = useState<RiskAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      probability: 1,
      impact: 1,
      mitigation_strategy: "",
      due_date: "",
    },
  });

  useEffect(() => {
    fetchCategories();
    fetchRisks();
  }, []);

  useEffect(() => {
    filterRisks();
  }, [risks, searchTerm, categoryFilter, riskLevelFilter]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("risk_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchRisks = async () => {
    try {
      const { data, error } = await supabase
        .from("risk_assessments")
        .select(`
          *,
          category:risk_categories(id, name, color)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const transformedData = (data || []).map(item => ({
        ...item,
        category: item.category as RiskCategory | undefined
      }));
      
      setRisks(transformedData as RiskAssessment[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch risk assessments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterRisks = () => {
    let filtered = risks;

    if (searchTerm) {
      filtered = filtered.filter(
        (risk) =>
          risk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (risk.description && risk.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((risk) => risk.category_id === categoryFilter);
    }

    if (riskLevelFilter !== "all") {
      filtered = filtered.filter((risk) => risk.risk_level === riskLevelFilter);
    }

    setFilteredRisks(filtered);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "Critical":
        return "destructive";
      case "High":
        return "destructive";
      case "Medium":
        return "secondary";
      case "Low":
        return "outline";
      default:
        return "secondary";
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create risk assessments",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("risk_assessments")
        .insert({
          title: data.title,
          description: data.description || null,
          category_id: data.category_id || null,
          probability: parseInt(data.probability),
          impact: parseInt(data.impact),
          mitigation_strategy: data.mitigation_strategy || null,
          due_date: data.due_date || null,
          created_by: user.id,
          owner_id: user.id,
        });

      if (error) throw error;

      await fetchRisks();
      setIsCreateDialogOpen(false);
      form.reset();
      
      toast({
        title: "Success",
        description: "Risk assessment created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create risk assessment",
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
        <h1 className="text-2xl font-bold">Risk Assessment</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Risk Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Risk Assessment</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter risk title" {...field} required />
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
                        <Textarea placeholder="Describe the risk" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
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
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="probability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Probability (1-5)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 - Very Low</SelectItem>
                            <SelectItem value="2">2 - Low</SelectItem>
                            <SelectItem value="3">3 - Medium</SelectItem>
                            <SelectItem value="4">4 - High</SelectItem>
                            <SelectItem value="5">5 - Very High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="impact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impact (1-5)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 - Very Low</SelectItem>
                            <SelectItem value="2">2 - Low</SelectItem>
                            <SelectItem value="3">3 - Medium</SelectItem>
                            <SelectItem value="4">4 - High</SelectItem>
                            <SelectItem value="5">5 - Very High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="mitigation_strategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mitigation Strategy</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe mitigation strategy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
                  <Button type="submit">Create Assessment</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{risks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical/High Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {risks.filter(r => r.risk_level === "Critical" || r.risk_level === "High").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {risks.filter(r => r.risk_level === "Medium").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {risks.filter(r => r.risk_level === "Low").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search risks..."
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
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Risk List */}
      <div className="grid gap-4">
        {filteredRisks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No risks found matching your criteria.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first risk assessment to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRisks.map((risk) => (
            <Card key={risk.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold">{risk.title}</h3>
                      <Badge variant={getRiskLevelColor(risk.risk_level)}>
                        {risk.risk_level}
                      </Badge>
                      <Badge variant="outline">Score: {risk.risk_score}</Badge>
                      <Badge>{risk.status}</Badge>
                    </div>
                    {risk.description && (
                      <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                    )}
                    {risk.category && (
                      <Badge variant="secondary" className="mr-2">
                        {risk.category.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Probability:</span> {risk.probability}/5
                  </div>
                  <div>
                    <span className="font-medium">Impact:</span> {risk.impact}/5
                  </div>
                  {risk.due_date && (
                    <div>
                      <span className="font-medium">Due:</span>{" "}
                      {format(new Date(risk.due_date), "PP")}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {format(new Date(risk.created_at), "PP")}
                  </div>
                </div>
                {risk.mitigation_strategy && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <span className="text-sm font-medium">Mitigation Strategy:</span>
                    <p className="text-sm text-muted-foreground mt-1">{risk.mitigation_strategy}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default RiskAssessment;
