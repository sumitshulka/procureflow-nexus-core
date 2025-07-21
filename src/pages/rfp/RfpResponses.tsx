
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
import { RfpCommunications } from "@/components/rfp/RfpCommunications";
import { RfpAddendums } from "@/components/rfp/RfpAddendums";
import { RfpTimeline } from "@/components/rfp/RfpTimeline";
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

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options?: any;
  is_required: boolean;
  description?: string;
  display_order: number;
  use_in_evaluation?: boolean;
}

interface CustomFieldsSection {
  rfpId: string;
}

const CustomFieldsSection = ({ rfpId }: CustomFieldsSection) => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [rfpCurrency, setRfpCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomFields();
  }, [rfpId]);

  const fetchCustomFields = async () => {
    try {
      // Get RFP data to check for custom fields and currency
      const { data: rfpData, error: rfpError } = await supabase
        .from('rfps')
        .select('currency, evaluation_criteria')
        .eq('id', rfpId)
        .single();

      if (rfpError) throw rfpError;
      
      // Set currency from RFP
      setRfpCurrency(rfpData?.currency || 'USD');
      
      // Parse evaluation criteria to extract custom fields
      let customFieldsFromRfp: any[] = [];
      if (rfpData?.evaluation_criteria) {
        const criteria = typeof rfpData.evaluation_criteria === 'string' 
          ? JSON.parse(rfpData.evaluation_criteria) 
          : rfpData.evaluation_criteria;
        
        customFieldsFromRfp = criteria?.custom_fields || [];
      }
      
      // If no custom fields in RFP, don't show any
      if (customFieldsFromRfp.length === 0) {
        setCustomFields([]);
        setCustomFieldValues({});
        return;
      }
      
      setCustomFields(customFieldsFromRfp);
      
      // Extract values from the custom fields
      const fieldValues: Record<string, any> = {};
      customFieldsFromRfp.forEach(field => {
        if (field.value !== undefined) {
          fieldValues[field.field_name] = field.value;
        }
      });
      setCustomFieldValues(fieldValues);
      
    } catch (error: any) {
      console.error('Error fetching custom fields:', error);
      setCustomFields([]);
      setCustomFieldValues({});
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading custom fields...</div>;
  }

  if (customFields.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Requirements & Evaluation Criteria</CardTitle>
        <p className="text-sm text-muted-foreground">
          Additional fields defined for this RFP that vendors must provide and will be used in evaluation.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">{field.field_label}</span>
                  {field.is_required && (
                    <span className="text-red-500 text-xs ml-1">*Required</span>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {field.use_in_evaluation ? "Used in Evaluation" : "Information Only"}
                </Badge>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="font-medium">
                  {customFieldValues[field.field_name] !== undefined ? 
                    `${customFieldValues[field.field_name]}${field.field_type === 'number' ? '' : ''}` : 
                    'Not specified'
                  }
                </p>
                {field.field_type === 'number' && field.field_name === 'turnover' && (
                  <p className="text-xs text-muted-foreground">{rfpCurrency} (Annual)</p>
                )}
              </div>
              
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Evaluation Information</h4>
          <p className="text-sm text-blue-700">
            Custom fields marked as "Used in Evaluation" will be considered when scoring vendor responses. 
            Vendors must provide accurate information for these fields as they directly impact the selection process.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

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
      const { data, error } = await supabase
        .from("rfps")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our RFP interface
      const transformedRfps = (data || []).map(rfp => ({
        ...rfp,
        evaluation_criteria: typeof rfp.evaluation_criteria === 'string' 
          ? JSON.parse(rfp.evaluation_criteria) 
          : rfp.evaluation_criteria
      }));
      
      setAllRfps(transformedRfps);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch RFPs",
        variant: "destructive",
      });
    }
  };

  const fetchRfpData = async (id: string) => {
    try {
      const { data: rfpData, error } = await supabase
        .from("rfps")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Transform the database response to match our RFP interface
      const transformedRfp: RFP = {
        ...rfpData,
        evaluation_criteria: typeof rfpData.evaluation_criteria === 'string' 
          ? JSON.parse(rfpData.evaluation_criteria) 
          : rfpData.evaluation_criteria
      };
      setRfp(transformedRfp);
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
      const { data, error } = await supabase
        .from("rfp_responses")
        .select(`
          *,
          vendor_registrations:vendor_id (
            company_name,
            primary_email,
            primary_phone
          ),
          rfp_response_items (
            id,
            description,
            quantity,
            unit_price,
            total_price,
            brand_model,
            specifications
          )
        `)
        .eq("rfp_id", id)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setResponses(data || []);
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

  const handleAwardResponse = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from("rfp_responses")
        .update({ status: "awarded" })
        .eq("id", responseId);

      if (error) throw error;

      // Update local state
      setResponses(prev => prev.map(response => 
        response.id === responseId 
          ? { ...response, status: "awarded" }
          : response
      ));

      // Update RFP status to awarded
      if (rfp) {
        const { error: rfpError } = await supabase
          .from("rfps")
          .update({ status: "awarded" })
          .eq("id", rfp.id);

        if (!rfpError) {
          setRfp(prev => prev ? { ...prev, status: "awarded" } : null);
        }
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
      case "draft":
        return "secondary";
      case "published":
        return "default";
      case "evaluation":
        return "outline";
      case "canceled":
        return "destructive";
      case "expired":
        return "secondary";
      default:
        return "secondary";
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
        <Tabs defaultValue="rfp-details" className="w-full">
          <TabsList>
            <TabsTrigger value="rfp-details">RFP Details</TabsTrigger>
            <TabsTrigger value="addendums">Addendums</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="responses">Responses ({responses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rfp-details" className="space-y-6">
            {/* Basic Information Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Basic Information ({rfp.rfp_number})</span>
                  <Badge variant={getStatusBadgeVariant(rfp.status)}>
                    {rfp.status.charAt(0).toUpperCase() + rfp.status.slice(1)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">RFP Title</span>
                      <p className="font-medium">{rfp.title}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">RFP Number</span>
                      <p className="font-medium">{rfp.rfp_number}</p>
                    </div>
                    {rfp.description && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Description</span>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{rfp.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {rfp.estimated_value && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Estimated Value</span>
                        <p className="font-medium">{rfp.currency || 'USD'} {rfp.estimated_value.toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Created Date</span>
                      <p className="font-medium">{format(new Date(rfp.created_at), "PPp")}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Status</span>
                      <p className="font-medium">{rfp.status.charAt(0).toUpperCase() + rfp.status.slice(1)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline & Deadlines Section */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline & Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Submission Deadline</span>
                    <p className="font-medium text-red-600">{format(new Date(rfp.submission_deadline), "PPp")}</p>
                  </div>
                  {rfp.technical_evaluation_deadline && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Technical Evaluation Deadline</span>
                      <p className="font-medium">{format(new Date(rfp.technical_evaluation_deadline), "PPp")}</p>
                    </div>
                  )}
                  {rfp.commercial_evaluation_deadline && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Commercial Evaluation Deadline</span>
                      <p className="font-medium">{format(new Date(rfp.commercial_evaluation_deadline), "PPp")}</p>
                    </div>
                  )}
                  {rfp.pre_bid_meeting_date && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Pre-bid Meeting Date</span>
                      <p className="font-medium">{format(new Date(rfp.pre_bid_meeting_date), "PPp")}</p>
                    </div>
                  )}
                  {rfp.pre_bid_meeting_venue && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Meeting Venue</span>
                      <p className="font-medium">{rfp.pre_bid_meeting_venue}</p>
                    </div>
                  )}
                  {rfp.bid_validity_period && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Bid Validity Period</span>
                      <p className="font-medium">{rfp.bid_validity_period} days</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Evaluation Criteria Section */}
            {rfp.evaluation_criteria && (
              <Card>
                <CardHeader>
                  <CardTitle>Evaluation Criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Evaluation Method</span>
                      <p className="font-medium capitalize">
                        {rfp.evaluation_criteria.type === 'qcbs' ? 'Quality & Cost Based Selection' : 
                         rfp.evaluation_criteria.type === 'price_l1' ? 'Lowest Price' :
                         rfp.evaluation_criteria.type === 'technical_l1' ? 'Highest Technical Score' :
                         rfp.evaluation_criteria.type}
                      </p>
                    </div>
                    {rfp.evaluation_criteria.technical_weight && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Technical Weight</span>
                        <p className="font-medium">{rfp.evaluation_criteria.technical_weight}%</p>
                      </div>
                    )}
                    {rfp.evaluation_criteria.commercial_weight && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Commercial Weight</span>
                        <p className="font-medium">{rfp.evaluation_criteria.commercial_weight}%</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terms & Conditions Section */}
            {(rfp.terms_and_conditions || rfp.payment_terms || rfp.delivery_terms || rfp.warranty_requirements || rfp.minimum_eligibility_criteria) && (
              <Card>
                <CardHeader>
                  <CardTitle>Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rfp.payment_terms && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Payment Terms</span>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{rfp.payment_terms}</p>
                      </div>
                    )}
                    {rfp.delivery_terms && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Delivery Terms</span>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{rfp.delivery_terms}</p>
                      </div>
                    )}
                    {rfp.warranty_requirements && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Warranty Requirements</span>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{rfp.warranty_requirements}</p>
                      </div>
                    )}
                    {rfp.minimum_eligibility_criteria && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Minimum Eligibility Criteria</span>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{rfp.minimum_eligibility_criteria}</p>
                      </div>
                    )}
                  </div>
                  {rfp.terms_and_conditions && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">General Terms & Conditions</span>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{rfp.terms_and_conditions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Custom Fields Section - We'll need to fetch and display these */}
            <CustomFieldsSection rfpId={rfp.id} />
          </TabsContent>

          <TabsContent value="responses" className="space-y-4">
            {responses.length > 0 ? (
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
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No responses received for this RFP yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="addendums" className="space-y-4">
            <RfpAddendums 
              rfpId={rfp.id}
              rfpData={rfp}
              canManage={rfp.status === 'published'} 
            />
          </TabsContent>

          <TabsContent value="communications" className="space-y-4">
            <RfpCommunications 
              rfpId={rfp.id}
              userRole="organization"
              isVendor={false}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <RfpTimeline rfpId={rfp.id} />
          </TabsContent>
        </Tabs>
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
