
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Download, Award } from "lucide-react";
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

interface RFP {
  id: string;
  title: string;
  rfp_number: string;
  status: string;
  submission_deadline: string;
}

const RfpResponses = () => {
  const { rfpId } = useParams<{ rfpId: string }>();
  const { toast } = useToast();
  const [rfp, setRfp] = useState<RFP | null>(null);
  const [responses, setResponses] = useState<RFPResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If no rfpId is provided, show all responses
    if (!rfpId) {
      fetchAllResponses();
    } else {
      fetchRfpData();
      fetchResponses();
    }
  }, [rfpId]);

  const fetchRfpData = async () => {
    try {
      // Mock RFP data for when specific RFP ID is provided
      const mockRfp: RFP = {
        id: rfpId!,
        title: "IT Equipment Procurement",
        rfp_number: "RFP-2024-001",
        status: "active",
        submission_deadline: "2024-03-01T23:59:59Z"
      };
      
      setRfp(mockRfp);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch RFP data",
        variant: "destructive",
      });
    }
  };

  const fetchResponses = async () => {
    try {
      // Mock responses specific to the RFP
      const mockResponses: RFPResponse[] = [
        {
          id: "1",
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

  const fetchAllResponses = async () => {
    try {
      // Mock data for all RFP responses when no specific RFP is selected
      const mockResponses: RFPResponse[] = [
        {
          id: "1",
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
          id: "2",
          response_number: "RFP-RESP-002",
          submitted_at: "2024-01-18T14:00:00Z",
          status: "under_evaluation",
          technical_score: 78,
          commercial_score: 85,
          total_score: 81.5,
          total_bid_amount: 140000,
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
      // Update response status to awarded
      const { error: updateError } = await supabase
        .from("rfp_responses")
        .update({ status: "awarded" })
        .eq("id", responseId);

      if (updateError) throw updateError;

      // Update RFP status to awarded
      const { error: rfpError } = await supabase
        .from("rfps")
        .update({ status: "awarded" })
        .eq("id", rfpId);

      if (rfpError) throw rfpError;

      toast({
        title: "Success",
        description: "Response awarded successfully",
      });

      if (rfpId) {
        fetchResponses();
        fetchRfpData();
      } else {
        fetchAllResponses();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to award response",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      {rfp ? (
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">RFP Responses</h1>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <span className="font-medium">RFP:</span> {rfp.title}
                </div>
                <div>
                  <span className="font-medium">Number:</span> {rfp.rfp_number}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <Badge variant={getStatusBadgeVariant(rfp.status)}>
                    {rfp.status.charAt(0).toUpperCase() + rfp.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Deadline:</span>{" "}
                  {format(new Date(rfp.submission_deadline), "PPP")}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">All RFP Responses</h1>
          <p className="text-muted-foreground">View all submitted RFP responses across all projects</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Received Responses ({responses.length})
          </h2>
        </div>

        {responses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No responses received yet.</p>
            </CardContent>
          </Card>
        ) : (
          responses.map((response) => (
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
          ))
        )}
      </div>
    </div>
  );
};

export default RfpResponses;
