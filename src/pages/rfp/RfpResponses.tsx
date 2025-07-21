
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Eye, Download, Award, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RFPResponse {
  id: string;
  response_number: string;
  submitted_at: string;
  status: string;
  technical_score: number;
  commercial_score: number;
  total_score: number;
  total_bid_amount: number;
  currency: string;
  delivery_timeline: string;
  warranty_period: string;
  vendor_id: string;
  vendor_registrations: {
    company_name: string;
    primary_email: string;
    primary_phone: string;
  };
  rfp_response_items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    brand_model: string;
    specifications: string;
  }>;
}

interface EvaluatedRFPResponse extends RFPResponse {
  finalScore: number;
  rank: number;
  recommendedStatus: string;
}

interface RFP {
  id: string;
  title: string;
  rfp_number: string;
  status: string;
  description?: string;
  estimated_value?: number;
  currency?: string;
  submission_deadline: string;
  technical_evaluation_deadline?: string;
  commercial_evaluation_deadline?: string;
  pre_bid_meeting_date?: string;
  pre_bid_meeting_venue?: string;
  bid_validity_period?: number;
  terms_and_conditions?: string;
  payment_terms?: string;
  delivery_terms?: string;
  warranty_requirements?: string;
  minimum_eligibility_criteria?: string;
  created_at: string;
  evaluation_criteria?: {
    type: string; // 'qcbs', 'price_l1', 'technical_l1'
    technical_weight?: number;
    commercial_weight?: number;
  };
}

const RfpResponses = () => {
  const { id: rfpId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [rfp, setRfp] = useState<RFP | null>(null);
  const [responses, setResponses] = useState<RFPResponse[]>([]);
  const [allRfps, setAllRfps] = useState<RFP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRfpId, setSelectedRfpId] = useState<string>(rfpId || "");
  const [rfpSearchTerm, setRfpSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    fetchAllRfps();
    if (rfpId) {
      setSelectedRfpId(rfpId);
      fetchRfpData(rfpId);
      fetchResponses(rfpId);
    } else {
      setIsLoading(false);
    }
  }, [rfpId]);

  useEffect(() => {
    if (selectedRfpId && selectedRfpId !== rfpId) {
      fetchRfpData(selectedRfpId);
      fetchResponses(selectedRfpId);
    }
  }, [selectedRfpId]);

  const fetchAllRfps = async () => {
    try {
      // Mock RFPs data
      const mockRfps: RFP[] = [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          title: "IT Equipment Procurement",
          rfp_number: "RFP-2024-001",
          status: "active",
          submission_deadline: "2024-03-01T23:59:59Z",
          created_at: "2024-01-01T00:00:00Z",
          evaluation_criteria: {
            type: "qcbs",
            technical_weight: 70,
            commercial_weight: 30
          }
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          title: "Office Furniture Supply",
          rfp_number: "RFP-2024-002",
          status: "completed",
          submission_deadline: "2024-02-15T23:59:59Z",
          created_at: "2024-01-15T00:00:00Z",
          evaluation_criteria: {
            type: "price_l1"
          }
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440003",
          title: "Security Services",
          rfp_number: "RFP-2023-015",
          status: "awarded",
          submission_deadline: "2023-12-30T23:59:59Z",
          created_at: "2023-12-01T00:00:00Z",
          evaluation_criteria: {
            type: "technical_l1"
          }
        }
      ];
      
      setAllRfps(mockRfps);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch RFPs",
        variant: "destructive",
      });
    }
  };

  const fetchRfpData = async (id: string) => {
    try {
      // First try to fetch from database
      const { data: rfpData, error } = await supabase
        .from("rfps")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && rfpData) {
        // Transform the database response to match our RFP interface
        const transformedRfp: RFP = {
          ...rfpData,
          evaluation_criteria: typeof rfpData.evaluation_criteria === 'string' 
            ? JSON.parse(rfpData.evaluation_criteria) 
            : rfpData.evaluation_criteria
        };
        setRfp(transformedRfp);
      } else {
        // Fallback to mock data
        const selectedRfp = allRfps.find(r => r.id === id);
        if (selectedRfp) {
          setRfp(selectedRfp);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch RFP data",
        variant: "destructive",
      });
    }
  };

  const fetchResponses = async (id: string) => {
    try {
      // Mock responses with multiple vendors for evaluation
      const mockResponses: RFPResponse[] = [
        {
          id: "660e8400-e29b-41d4-a716-446655440001",
          response_number: "RFP-RESP-001",
          submitted_at: "2024-01-15T10:00:00Z",
          status: "submitted",
          technical_score: 85,
          commercial_score: 90,
          total_score: 87.5,
          total_bid_amount: 125000,
          currency: "USD",
          delivery_timeline: "4-6 weeks",
          warranty_period: "2 years",
          vendor_id: "vendor-1",
          vendor_registrations: {
            company_name: "Tech Solutions Inc",
            primary_email: "contact@techsolutions.com",
            primary_phone: "+1-555-0123"
          },
          rfp_response_items: [
            {
              id: "item-1",
              description: "Laptop Computers",
              quantity: 50,
              unit_price: 1200,
              total_price: 60000,
              brand_model: "Dell Latitude 5520",
              specifications: "Intel i7, 16GB RAM, 512GB SSD"
            }
          ]
        },
        {
          id: "660e8400-e29b-41d4-a716-446655440002",
          response_number: "RFP-RESP-002",
          submitted_at: "2024-01-18T14:00:00Z",
          status: "under_evaluation",
          technical_score: 78,
          commercial_score: 95,
          total_score: 86.5,
          total_bid_amount: 118000,
          currency: "USD",
          delivery_timeline: "6-8 weeks",
          warranty_period: "3 years",
          vendor_id: "vendor-2",
          vendor_registrations: {
            company_name: "Global IT Corp",
            primary_email: "sales@globalit.com",
            primary_phone: "+1-555-0456"
          },
          rfp_response_items: [
            {
              id: "item-2",
              description: "Desktop Workstations",
              quantity: 25,
              unit_price: 1800,
              total_price: 45000,
              brand_model: "HP Z440",
              specifications: "Intel Xeon, 32GB RAM, 1TB SSD"
            }
          ]
        },
        {
          id: "660e8400-e29b-41d4-a716-446655440003",
          response_number: "RFP-RESP-003",
          submitted_at: "2024-01-20T16:00:00Z",
          status: "submitted",
          technical_score: 92,
          commercial_score: 75,
          total_score: 83.5,
          total_bid_amount: 135000,
          currency: "USD",
          delivery_timeline: "3-4 weeks",
          warranty_period: "2 years",
          vendor_id: "vendor-3",
          vendor_registrations: {
            company_name: "Premium Systems Ltd",
            primary_email: "info@premiumsystems.com",
            primary_phone: "+1-555-0789"
          },
          rfp_response_items: [
            {
              id: "item-3",
              description: "Server Equipment",
              quantity: 10,
              unit_price: 3500,
              total_price: 35000,
              brand_model: "Dell PowerEdge R750",
              specifications: "Dual Xeon, 128GB RAM, 2TB SSD"
            }
          ]
        }
      ];

      setResponses(mockResponses);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch responses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "submitted":
        return "default";
      case "under_evaluation":
        return "outline";
      case "shortlisted":
        return "secondary";
      case "awarded":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleAwardResponse = async (responseId: string) => {
    try {
      // For mock data, we'll just update the local state
      setResponses(prev => prev.map(response => 
        response.id === responseId 
          ? { ...response, status: "awarded" }
          : response
      ));

      if (rfp) {
        setRfp(prev => prev ? { ...prev, status: "awarded" } : null);
      }

      toast({
        title: "Success",
        description: "Response awarded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to award response",
        variant: "destructive",
      });
    }
  };

  const getEvaluationRanking = (): EvaluatedRFPResponse[] => {
    if (!rfp?.evaluation_criteria || responses.length === 0) return responses.map(r => ({
      ...r,
      finalScore: r.total_score,
      rank: 1,
      recommendedStatus: "Under Review"
    }));

    const { type, technical_weight = 70, commercial_weight = 30 } = rfp.evaluation_criteria;
    
    return responses.map(response => {
      let finalScore = 0;
      let rank = 0;
      let recommendedStatus = "Under Review";

      switch (type) {
        case "qcbs": // Quality and Cost Based Selection
          finalScore = (response.technical_score * technical_weight / 100) + 
                     (response.commercial_score * commercial_weight / 100);
          break;
        case "price_l1": // Lowest Price
          finalScore = response.commercial_score;
          break;
        case "technical_l1": // Highest Technical Score
          finalScore = response.technical_score;
          break;
        default:
          finalScore = response.total_score;
      }

      return { ...response, finalScore, rank, recommendedStatus };
    }).sort((a, b) => b.finalScore - a.finalScore)
      .map((response, index) => ({
        ...response,
        rank: index + 1,
        recommendedStatus: index === 0 ? "Recommended" : index === 1 ? "Second Choice" : "Not Recommended"
      }));
  };

  const filteredRfps = allRfps.filter(rfp => {
    const rfpYear = new Date(rfp.submission_deadline).getFullYear().toString();
    const matchesYear = yearFilter === "all" || rfpYear === yearFilter;
    const matchesSearch = rfp.title.toLowerCase().includes(rfpSearchTerm.toLowerCase()) ||
                         rfp.rfp_number.toLowerCase().includes(rfpSearchTerm.toLowerCase());
    return matchesYear && matchesSearch;
  });

  const availableYears = [...new Set(allRfps.map(rfp => 
    new Date(rfp.submission_deadline).getFullYear().toString()
  ))].sort((a, b) => b.localeCompare(a));

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      {/* RFP Selection Section - Only show if no rfpId in URL */}
      {!rfpId && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">RFP Responses</h1>
          
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search RFPs..."
                      value={rfpSearchTerm}
                      onChange={(e) => setRfpSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRfpId} onValueChange={setSelectedRfpId}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select RFP to view responses" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRfps.map(rfp => (
                      <SelectItem key={rfp.id} value={rfp.id}>
                        {rfp.rfp_number} - {rfp.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Show page title when accessing specific RFP */}
      {rfpId && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">RFP Responses</h1>
        </div>
      )}

      {rfp && (
        <div className="mb-6 space-y-4">
          {/* RFP Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{rfp.title}</span>
                <Badge variant={getStatusBadgeVariant(rfp.status)}>
                  {rfp.status.charAt(0).toUpperCase() + rfp.status.slice(1)}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                RFP Number: {rfp.rfp_number}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {rfp.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{rfp.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rfp.estimated_value && (
                  <div>
                    <span className="font-medium">Estimated Value:</span>{" "}
                    {rfp.currency || 'USD'} {rfp.estimated_value.toLocaleString()}
                  </div>
                )}
                <div>
                  <span className="font-medium">Submission Deadline:</span>{" "}
                  {format(new Date(rfp.submission_deadline), "PPp")}
                </div>
                {rfp.technical_evaluation_deadline && (
                  <div>
                    <span className="font-medium">Technical Evaluation:</span>{" "}
                    {format(new Date(rfp.technical_evaluation_deadline), "PPp")}
                  </div>
                )}
                {rfp.commercial_evaluation_deadline && (
                  <div>
                    <span className="font-medium">Commercial Evaluation:</span>{" "}
                    {format(new Date(rfp.commercial_evaluation_deadline), "PPp")}
                  </div>
                )}
                {rfp.pre_bid_meeting_date && (
                  <div>
                    <span className="font-medium">Pre-bid Meeting:</span>{" "}
                    {format(new Date(rfp.pre_bid_meeting_date), "PPp")}
                  </div>
                )}
                {rfp.pre_bid_meeting_venue && (
                  <div>
                    <span className="font-medium">Meeting Venue:</span>{" "}
                    {rfp.pre_bid_meeting_venue}
                  </div>
                )}
                {rfp.bid_validity_period && (
                  <div>
                    <span className="font-medium">Bid Validity:</span>{" "}
                    {rfp.bid_validity_period} days
                  </div>
                )}
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {format(new Date(rfp.created_at), "PPp")}
                </div>
              </div>

              {/* Terms and Conditions */}
              {(rfp.terms_and_conditions || rfp.payment_terms || rfp.delivery_terms || rfp.warranty_requirements) && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-3">Terms & Conditions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {rfp.payment_terms && (
                      <div>
                        <span className="font-medium">Payment Terms:</span>
                        <p className="text-muted-foreground mt-1">{rfp.payment_terms}</p>
                      </div>
                    )}
                    {rfp.delivery_terms && (
                      <div>
                        <span className="font-medium">Delivery Terms:</span>
                        <p className="text-muted-foreground mt-1">{rfp.delivery_terms}</p>
                      </div>
                    )}
                    {rfp.warranty_requirements && (
                      <div>
                        <span className="font-medium">Warranty Requirements:</span>
                        <p className="text-muted-foreground mt-1">{rfp.warranty_requirements}</p>
                      </div>
                    )}
                    {rfp.minimum_eligibility_criteria && (
                      <div>
                        <span className="font-medium">Eligibility Criteria:</span>
                        <p className="text-muted-foreground mt-1">{rfp.minimum_eligibility_criteria}</p>
                      </div>
                    )}
                  </div>
                  {rfp.terms_and_conditions && (
                    <div className="mt-3">
                      <span className="font-medium">General Terms:</span>
                      <p className="text-muted-foreground mt-1">{rfp.terms_and_conditions}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedRfpId && responses.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Received Responses ({responses.length})
            </h2>
          </div>

          <Tabs defaultValue="evaluation" className="w-full">
            <TabsList>
              <TabsTrigger value="evaluation">Evaluation Summary</TabsTrigger>
              <TabsTrigger value="details">Response Details</TabsTrigger>
            </TabsList>

            <TabsContent value="evaluation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Evaluation Summary</CardTitle>
                  {rfp?.evaluation_criteria && (
                    <p className="text-sm text-muted-foreground">
                      Evaluation Method: {rfp.evaluation_criteria.type?.toUpperCase().replace('_', ' ')}
                      {rfp.evaluation_criteria.type === 'qcbs' && 
                        ` (Technical: ${rfp.evaluation_criteria.technical_weight}%, Commercial: ${rfp.evaluation_criteria.commercial_weight}%)`}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Technical Score</TableHead>
                        <TableHead>Commercial Score</TableHead>
                        <TableHead>Final Score</TableHead>
                        <TableHead>Bid Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getEvaluationRanking().map((response) => (
                        <TableRow key={response.id}>
                          <TableCell>
                            <Badge variant={response.rank === 1 ? "default" : "outline"}>
                              #{response.rank}
                            </Badge>
                          </TableCell>
                          <TableCell>{response.vendor_registrations?.company_name}</TableCell>
                          <TableCell>{response.technical_score}/100</TableCell>
                          <TableCell>{response.commercial_score}/100</TableCell>
                          <TableCell>
                            <span className={response.rank === 1 ? "font-bold text-green-600" : ""}>
                              {response.finalScore.toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell>{response.currency} {response.total_bid_amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={
                              response.recommendedStatus === "Recommended" ? "default" :
                              response.recommendedStatus === "Second Choice" ? "secondary" : "outline"
                            }>
                              {response.recommendedStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {response.status === "submitted" && rfp?.status !== "awarded" && response.rank === 1 && (
                              <Button
                                size="sm"
                                onClick={() => handleAwardResponse(response.id)}
                              >
                                <Award className="h-4 w-4 mr-2" />
                                Award
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {responses.map((response) => (
                <Card key={response.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {response.vendor_registrations?.company_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Response Number: {response.response_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Submitted: {format(new Date(response.submitted_at), "PPP p")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(response.status)}>
                          {response.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        {response.status === "submitted" && rfp?.status !== "awarded" && (
                          <Button
                            size="sm"
                            onClick={() => handleAwardResponse(response.id)}
                          >
                            <Award className="h-4 w-4 mr-2" />
                            Award
                          </Button>
                        )}
                      </div>
                    </div>

                    <Tabs defaultValue="summary" className="w-full">
                      <TabsList>
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="items">Line Items</TabsTrigger>
                        <TabsTrigger value="scores">Evaluation</TabsTrigger>
                      </TabsList>

                      <TabsContent value="summary" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">Financial Details</h4>
                            <p className="text-2xl font-bold text-green-600">
                              {response.currency} {response.total_bid_amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">Total Bid Amount</p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">Delivery Timeline</h4>
                            <p className="text-lg">{response.delivery_timeline || "Not specified"}</p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium mb-2">Warranty Period</h4>
                            <p className="text-lg">{response.warranty_period || "Not specified"}</p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="items" className="space-y-4">
                        <div className="space-y-3">
                          {response.rfp_response_items.map((item) => (
                            <Card key={item.id}>
                              <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                  <div className="md:col-span-2">
                                    <h5 className="font-medium">{item.description}</h5>
                                    {item.brand_model && (
                                      <p className="text-sm text-muted-foreground">
                                        Brand/Model: {item.brand_model}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Quantity</p>
                                    <p>{item.quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Unit Price</p>
                                    <p>{response.currency} {item.unit_price.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Total Price</p>
                                    <p className="font-semibold">
                                      {response.currency} {item.total_price.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                {item.specifications && (
                                  <div className="mt-3">
                                    <p className="text-sm font-medium">Specifications:</p>
                                    <p className="text-sm text-muted-foreground">{item.specifications}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="scores" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-sm font-medium">Technical Score</p>
                            <p className="text-2xl font-bold">
                              {response.technical_score || "N/A"}
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-sm font-medium">Commercial Score</p>
                            <p className="text-2xl font-bold">
                              {response.commercial_score || "N/A"}
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-sm font-medium">Total Score</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {response.total_score || "N/A"}
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg text-center">
                            <p className="text-sm font-medium">Status</p>
                            <Badge variant={getStatusBadgeVariant(response.status)} className="mt-2">
                              {response.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {selectedRfpId && responses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No responses received for this RFP yet.</p>
          </CardContent>
        </Card>
      )}

      {!selectedRfpId && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please select an RFP to view its responses.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RfpResponses;
