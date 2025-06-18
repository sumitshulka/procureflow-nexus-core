
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Plus, Search, Edit, Eye, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";

interface RiskAssessment {
  id: string;
  title: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  risk_score: number;
  risk_level: string;
  mitigation_strategy: string;
  owner: string;
  status: string;
  created_at: string;
  updated_at: string;
  due_date: string;
}

const RiskAssessment = () => {
  const { toast } = useToast();
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
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
      category: "",
      probability: 1,
      impact: 1,
      mitigation_strategy: "",
      owner: "",
      due_date: "",
    },
  });

  useEffect(() => {
    fetchRisks();
  }, []);

  useEffect(() => {
    filterRisks();
  }, [risks, searchTerm, categoryFilter, riskLevelFilter]);

  const fetchRisks = async () => {
    // Mock data - replace with actual database queries
    const mockRisks: RiskAssessment[] = [
      {
        id: "1",
        title: "Vendor Dependency Risk",
        description: "Over-reliance on single vendor for critical supplies",
        category: "Vendor",
        probability: 3,
        impact: 4,
        risk_score: 12,
        risk_level: "High",
        mitigation_strategy: "Identify and qualify alternative vendors",
        owner: "Procurement Manager",
        status: "Active",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-20T15:30:00Z",
        due_date: "2024-03-15T00:00:00Z"
      },
      {
        id: "2",
        title: "Price Volatility Risk",
        description: "Fluctuating raw material prices affecting procurement costs",
        category: "Financial",
        probability: 4,
        impact: 3,
        risk_score: 12,
        risk_level: "High",
        mitigation_strategy: "Implement price hedging and long-term contracts",
        owner: "Finance Manager",
        status: "Under Review",
        created_at: "2024-01-10T08:00:00Z",
        updated_at: "2024-01-18T12:00:00Z",
        due_date: "2024-02-28T00:00:00Z"
      },
      {
        id: "3",
        title: "Supply Chain Disruption",
        description: "Potential disruptions due to geopolitical issues",
        category: "Operational",
        probability: 2,
        impact: 5,
        risk_score: 10,
        risk_level: "Medium",
        mitigation_strategy: "Develop contingency supply chains",
        owner: "Supply Chain Manager",
        status: "Mitigated",
        created_at: "2024-01-05T14:00:00Z",
        updated_at: "2024-01-25T10:00:00Z",
        due_date: "2024-04-30T00:00:00Z"
      }
    ];

    setRisks(mockRisks);
    setIsLoading(false);
  };

  const filterRisks = () => {
    let filtered = risks;

    if (searchTerm) {
      filtered = filtered.filter(
        (risk) =>
          risk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          risk.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((risk) => risk.category === categoryFilter);
    }

    if (riskLevelFilter !== "all") {
      filtered = filtered.filter((risk) => risk.risk_level === riskLevelFilter);
    }

    setFilteredRisks(filtered);
  };

  const calculateRiskScore = (probability: number, impact: number) => {
    return probability * impact;
  };

  const getRiskLevel = (score: number) => {
    if (score >= 15) return "Critical";
    if (score >= 10) return "High";
    if (score >= 5) return "Medium";
    return "Low";
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

  const onSubmit = (data: any) => {
    const riskScore = calculateRiskScore(data.probability, data.impact);
    const riskLevel = getRiskLevel(riskScore);

    const newRisk: RiskAssessment = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description,
      category: data.category,
      probability: data.probability,
      impact: data.impact,
      risk_score: riskScore,
      risk_level: riskLevel,
      mitigation_strategy: data.mitigation_strategy,
      owner: data.owner,
      status: "Active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      due_date: data.due_date
    };

    setRisks([newRisk, ...risks]);
    setIsCreateDialogOpen(false);
    form.reset();
    
    toast({
      title: "Success",
      description: "Risk assessment created successfully",
    });
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
              <form onSubmit={form.handleSubmit(onSubm]} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter risk title" {...field} />
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
                    name="category"
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
                            <SelectItem value="Vendor">Vendor</SelectItem>
                            <SelectItem value="Financial">Financial</SelectItem>
                            <SelectItem value="Operational">Operational</SelectItem>
                            <SelectItem value="Compliance">Compliance</SelectItem>
                            <SelectItem value="Technology">Technology</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Owner</FormLabel>
                        <FormControl>
                          <Input placeholder="Risk owner" {...field} />
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
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
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
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
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
                <SelectItem value="Vendor">Vendor</SelectItem>
                <SelectItem value="Financial">Financial</SelectItem>
                <SelectItem value="Operational">Operational</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
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
                      <Badge variant="outline">{risk.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{risk.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="font-medium">Probability:</span> {risk.probability}/5
                      </div>
                      <div>
                        <span className="font-medium">Impact:</span> {risk.impact}/5
                      </div>
                      <div>
                        <span className="font-medium">Risk Score:</span> {risk.risk_score}
                      </div>
                      <div>
                        <span className="font-medium">Owner:</span> {risk.owner}
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="font-medium text-sm">Mitigation Strategy:</span>
                      <p className="text-sm text-muted-foreground mt-1">{risk.mitigation_strategy}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default RiskAssessment;
