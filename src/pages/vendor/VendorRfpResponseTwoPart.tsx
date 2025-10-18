import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Save, Send, Calendar, DollarSign, Clock, AlertCircle, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VendorTechnicalResponse from '@/components/rfp/VendorTechnicalResponse';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TechnicalFormData {
  technical_notes: string;
  compliance_notes: string;
}

interface CommercialFormData {
  total_bid_amount: string;
  currency: string;
  delivery_timeline: string;
  warranty_period: string;
  bid_validity_until: string;
  payment_terms_accepted: boolean;
  commercial_notes: string;
}

const VendorRfpResponseTwoPart = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [technicalData, setTechnicalData] = useState<TechnicalFormData>({
    technical_notes: '',
    compliance_notes: '',
  });
  
  const [commercialData, setCommercialData] = useState<CommercialFormData>({
    total_bid_amount: '',
    currency: 'INR',
    delivery_timeline: '',
    warranty_period: '',
    bid_validity_until: '',
    payment_terms_accepted: false,
    commercial_notes: '',
  });
  
  const [isSubmittingTechnical, setIsSubmittingTechnical] = useState(false);
  const [isSubmittingCommercial, setIsSubmittingCommercial] = useState(false);

  // Fetch RFP details
  const { data: rfp, isLoading: rfpLoading } = useQuery({
    queryKey: ["vendor_rfp_detail", id],
    queryFn: async () => {
      if (!id) throw new Error('RFP ID is required');
      
      const { data, error } = await supabase
        .from('rfps')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Get vendor registration
  const { data: vendorReg } = useQuery({
    queryKey: ["vendor_registration", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check existing response
  const { data: existingResponse, refetch: refetchResponse } = useQuery({
    queryKey: ["vendor_rfp_response", id, vendorReg?.id],
    queryFn: async () => {
      if (!id || !vendorReg?.id) return null;
      
      const { data, error } = await supabase
        .from('rfp_responses')
        .select('*')
        .eq('rfp_id', id)
        .eq('vendor_id', vendorReg.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Load existing data if found
      if (data) {
        const techDocs = data.technical_documents as any;
        const commDocs = data.commercial_documents as any;
        
        setTechnicalData({
          technical_notes: techDocs?.notes || '',
          compliance_notes: (data.compliance_documents as any)?.notes || '',
        });
        
        setCommercialData({
          total_bid_amount: data.total_bid_amount?.toString() || '',
          currency: data.currency || 'INR',
          delivery_timeline: data.delivery_timeline || '',
          warranty_period: data.warranty_period || '',
          bid_validity_until: data.bid_validity_until ? format(new Date(data.bid_validity_until), 'yyyy-MM-dd') : '',
          payment_terms_accepted: data.payment_terms_accepted || false,
          commercial_notes: commDocs?.notes || '',
        });
      }
      
      return data;
    },
    enabled: !!id && !!vendorReg?.id,
  });

  const handleSubmitTechnical = async () => {
    if (!vendorReg || !rfp) {
      toast({
        title: "Error",
        description: "Vendor registration or RFP data not found.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingTechnical(true);

    try {
      const responseNumber = `RES-${rfp.rfp_number}-${vendorReg.id.substring(0, 8)}`;
      
      if (existingResponse) {
        // Update existing response
        const { error } = await supabase
          .from('rfp_responses')
          .update({
            technical_documents: { notes: technicalData.technical_notes },
            compliance_documents: { notes: technicalData.compliance_notes },
            technical_submission_status: 'submitted',
            technical_submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResponse.id);
          
        if (error) throw error;
      } else {
        // Create new response with only technical part
        const { error } = await supabase
          .from('rfp_responses')
          .insert({
            rfp_id: id,
            vendor_id: vendorReg.id,
            response_number: responseNumber,
            technical_documents: { notes: technicalData.technical_notes },
            compliance_documents: { notes: technicalData.compliance_notes },
            technical_submission_status: 'submitted',
            technical_submitted_at: new Date().toISOString(),
            commercial_submission_status: 'draft',
            total_bid_amount: 0, // Placeholder
            status: 'draft'
          });
          
        if (error) throw error;
      }

      toast({
        title: "Technical Part Submitted",
        description: "Your technical proposal has been submitted successfully.",
      });
      
      await refetchResponse();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingTechnical(false);
    }
  };

  const handleSubmitCommercial = async () => {
    if (!vendorReg || !rfp) {
      toast({
        title: "Error",
        description: "Vendor registration or RFP data not found.",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (!commercialData.total_bid_amount || parseFloat(commercialData.total_bid_amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid bid amount.",
        variant: "destructive",
      });
      return;
    }

    if (!commercialData.delivery_timeline) {
      toast({
        title: "Validation Error",
        description: "Please specify the delivery timeline.",
        variant: "destructive",
      });
      return;
    }

    if (!commercialData.payment_terms_accepted) {
      toast({
        title: "Validation Error",
        description: "Please accept the payment terms to proceed.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingCommercial(true);

    try {
      const responseNumber = `RES-${rfp.rfp_number}-${vendorReg.id.substring(0, 8)}`;
      
      if (existingResponse) {
        // Update existing response
        const { error } = await supabase
          .from('rfp_responses')
          .update({
            total_bid_amount: parseFloat(commercialData.total_bid_amount),
            currency: commercialData.currency,
            delivery_timeline: commercialData.delivery_timeline,
            warranty_period: commercialData.warranty_period || null,
            bid_validity_until: commercialData.bid_validity_until ? new Date(commercialData.bid_validity_until).toISOString() : null,
            payment_terms_accepted: commercialData.payment_terms_accepted,
            commercial_documents: { notes: commercialData.commercial_notes },
            commercial_submission_status: 'submitted',
            commercial_submitted_at: new Date().toISOString(),
            status: existingResponse.technical_submission_status === 'submitted' ? 'submitted' : 'draft',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResponse.id);
          
        if (error) throw error;
      } else {
        // Create new response with only commercial part
        const { error } = await supabase
          .from('rfp_responses')
          .insert({
            rfp_id: id,
            vendor_id: vendorReg.id,
            response_number: responseNumber,
            total_bid_amount: parseFloat(commercialData.total_bid_amount),
            currency: commercialData.currency,
            delivery_timeline: commercialData.delivery_timeline,
            warranty_period: commercialData.warranty_period || null,
            bid_validity_until: commercialData.bid_validity_until ? new Date(commercialData.bid_validity_until).toISOString() : null,
            payment_terms_accepted: commercialData.payment_terms_accepted,
            commercial_documents: { notes: commercialData.commercial_notes },
            commercial_submission_status: 'submitted',
            commercial_submitted_at: new Date().toISOString(),
            technical_submission_status: 'draft',
            status: 'draft'
          });
          
        if (error) throw error;
      }

      toast({
        title: "Commercial Part Submitted",
        description: "Your commercial proposal has been submitted successfully.",
      });
      
      await refetchResponse();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCommercial(false);
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (rfpLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Loading RFP details...</span>
        </div>
      </div>
    );
  }

  if (!rfp) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">RFP Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The requested RFP could not be found or you don't have access to view it.
            </p>
            <Button onClick={() => navigate('/vendor/rfps')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to RFPs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (rfp.status !== 'published') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This RFP is currently {rfp.status}. Only published RFPs accept vendor responses.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/vendor/rfps')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to RFPs
        </Button>
      </div>
    );
  }

  const daysUntilDeadline = getDaysUntilDeadline(rfp.submission_deadline);
  const isExpired = daysUntilDeadline <= 0;

  if (isExpired) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The submission deadline for this RFP has passed. Responses are no longer being accepted.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(`/vendor/rfps/${id}`)}>
          <FileText className="w-4 h-4 mr-2" />
          View RFP Details
        </Button>
      </div>
    );
  }

  const technicalSubmitted = existingResponse?.technical_submission_status === 'submitted';
  const commercialSubmitted = existingResponse?.commercial_submission_status === 'submitted';
  const bothSubmitted = technicalSubmitted && commercialSubmitted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/vendor/rfps/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Submit RFP Response (Two-Part)</h1>
            <p className="text-muted-foreground">
              {rfp.title} • RFP #{rfp.rfp_number}
            </p>
          </div>
        </div>
        <Badge variant={daysUntilDeadline <= 3 ? "destructive" : "secondary"}>
          <Clock className="w-3 h-3 mr-1" />
          {daysUntilDeadline} days left
        </Badge>
      </div>

      {/* Deadline Warning */}
      {daysUntilDeadline <= 3 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Urgent:</strong> Only {daysUntilDeadline} days remaining until the submission deadline 
            ({format(new Date(rfp.submission_deadline), 'MMM dd, yyyy HH:mm')}).
          </AlertDescription>
        </Alert>
      )}

      {/* Submission Status */}
      {(technicalSubmitted || commercialSubmitted) && (
        <Card>
          <CardHeader>
            <CardTitle>Submission Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Technical Part:</span>
              <Badge variant={technicalSubmitted ? "default" : "secondary"}>
                {technicalSubmitted ? 'Submitted' : 'Draft'}
              </Badge>
              {technicalSubmitted && existingResponse?.technical_submitted_at && (
                <span className="text-sm text-muted-foreground">
                  on {format(new Date(existingResponse.technical_submitted_at), 'MMM dd, yyyy HH:mm')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Commercial Part:</span>
              <Badge variant={commercialSubmitted ? "default" : "secondary"}>
                {commercialSubmitted ? 'Submitted' : 'Draft'}
              </Badge>
              {commercialSubmitted && existingResponse?.commercial_submitted_at && (
                <span className="text-sm text-muted-foreground">
                  on {format(new Date(existingResponse.commercial_submitted_at), 'MMM dd, yyyy HH:mm')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-Part Form Tabs */}
      <Tabs defaultValue="technical" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="technical" className="gap-2">
            <Package className="w-4 h-4" />
            Technical Part
            {technicalSubmitted && <Badge variant="outline" className="ml-2">Submitted</Badge>}
          </TabsTrigger>
          <TabsTrigger value="commercial" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Commercial Part
            {commercialSubmitted && <Badge variant="outline" className="ml-2">Submitted</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="technical" className="space-y-4">
          {/* Technical Scoring Section (if enabled) */}
          {rfp?.enable_technical_scoring && existingResponse && (
            <VendorTechnicalResponse 
              rfpId={rfp.id} 
              responseId={existingResponse.id}
              disabled={technicalSubmitted}
            />
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Technical Proposal</CardTitle>
              <CardDescription>
                Provide technical details and specifications for your proposal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="technical_notes">Technical Specifications & Notes</Label>
                <Textarea
                  id="technical_notes"
                  placeholder="Describe your technical approach, specifications, implementation details..."
                  value={technicalData.technical_notes}
                  onChange={(e) => setTechnicalData(prev => ({ ...prev, technical_notes: e.target.value }))}
                  rows={6}
                  disabled={technicalSubmitted}
                />
              </div>
              
              <div>
                <Label htmlFor="compliance_notes">Compliance Notes</Label>
                <Textarea
                  id="compliance_notes"
                  placeholder="Detail how you meet the eligibility criteria and compliance requirements..."
                  value={technicalData.compliance_notes}
                  onChange={(e) => setTechnicalData(prev => ({ ...prev, compliance_notes: e.target.value }))}
                  rows={4}
                  disabled={technicalSubmitted}
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmitTechnical} 
                  disabled={isSubmittingTechnical || technicalSubmitted}
                >
                  {isSubmittingTechnical ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : technicalSubmitted ? (
                    <>Technical Part Submitted</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Technical Part
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commercial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commercial Proposal</CardTitle>
              <CardDescription>
                Provide your pricing and commercial terms for this RFP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_bid_amount">Total Bid Amount *</Label>
                  <Input
                    id="total_bid_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter total bid amount"
                    value={commercialData.total_bid_amount}
                    onChange={(e) => setCommercialData(prev => ({ ...prev, total_bid_amount: e.target.value }))}
                    disabled={commercialSubmitted}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={commercialData.currency}
                    onChange={(e) => setCommercialData(prev => ({ ...prev, currency: e.target.value }))}
                    placeholder="e.g., INR, USD"
                    disabled={commercialSubmitted}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery_timeline">Delivery Timeline *</Label>
                  <Input
                    id="delivery_timeline"
                    placeholder="e.g., 15 days from PO"
                    value={commercialData.delivery_timeline}
                    onChange={(e) => setCommercialData(prev => ({ ...prev, delivery_timeline: e.target.value }))}
                    disabled={commercialSubmitted}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="warranty_period">Warranty Period</Label>
                  <Input
                    id="warranty_period"
                    placeholder="e.g., 12 months"
                    value={commercialData.warranty_period}
                    onChange={(e) => setCommercialData(prev => ({ ...prev, warranty_period: e.target.value }))}
                    disabled={commercialSubmitted}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bid_validity_until">Bid Valid Until</Label>
                <Input
                  id="bid_validity_until"
                  type="date"
                  value={commercialData.bid_validity_until}
                  onChange={(e) => setCommercialData(prev => ({ ...prev, bid_validity_until: e.target.value }))}
                  disabled={commercialSubmitted}
                />
              </div>

              <div>
                <Label htmlFor="commercial_notes">Commercial Notes</Label>
                <Textarea
                  id="commercial_notes"
                  placeholder="Any additional commercial terms, conditions, or notes..."
                  value={commercialData.commercial_notes}
                  onChange={(e) => setCommercialData(prev => ({ ...prev, commercial_notes: e.target.value }))}
                  rows={3}
                  disabled={commercialSubmitted}
                />
              </div>
              
              <div className="border-t pt-4">
                {rfp.payment_terms && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Payment Terms:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {rfp.payment_terms}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="payment_terms_accepted"
                    checked={commercialData.payment_terms_accepted}
                    onCheckedChange={(checked) => setCommercialData(prev => ({ ...prev, payment_terms_accepted: checked as boolean }))}
                    disabled={commercialSubmitted}
                  />
                  <Label htmlFor="payment_terms_accepted" className="text-sm">
                    I accept the payment terms and conditions specified in this RFP *
                  </Label>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmitCommercial} 
                  disabled={isSubmittingCommercial || commercialSubmitted || !commercialData.payment_terms_accepted}
                >
                  {isSubmittingCommercial ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : commercialSubmitted ? (
                    <>Commercial Part Submitted</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Commercial Part
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {bothSubmitted && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Both technical and commercial parts have been submitted. Your complete response is now under evaluation.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default VendorRfpResponseTwoPart;
