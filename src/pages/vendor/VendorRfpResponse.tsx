import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Save, Send, Calendar, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RfpResponseForm {
  total_bid_amount: string;
  currency: string;
  delivery_timeline: string;
  warranty_period: string;
  bid_validity_until: string;
  payment_terms_accepted: boolean;
  technical_notes: string;
  commercial_notes: string;
  compliance_notes: string;
}

const VendorRfpResponse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<RfpResponseForm>({
    total_bid_amount: '',
    currency: 'INR',
    delivery_timeline: '',
    warranty_period: '',
    bid_validity_until: '',
    payment_terms_accepted: false,
    technical_notes: '',
    commercial_notes: '',
    compliance_notes: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch RFP details
  const { data: rfp, isLoading: rfpLoading } = useQuery({
    queryKey: ["vendor_rfp_detail", id],
    queryFn: async () => {
      if (!id) throw new Error('RFP ID is required');
      
      const { data, error } = await supabase
        .from('rfps')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
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

  // Check if already responded
  const { data: existingResponse } = useQuery({
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
      return data;
    },
    enabled: !!id && !!vendorReg?.id,
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async (responseData: any) => {
      const { data, error } = await supabase
        .from('rfp_responses')
        .insert([responseData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Response Submitted Successfully",
        description: "Your RFP response has been submitted for evaluation.",
      });
      queryClient.invalidateQueries({ queryKey: ["vendor_rfp_response"] });
      navigate(`/vendor/rfps/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit response. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (field: keyof RfpResponseForm, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vendorReg || !rfp) {
      toast({
        title: "Error",
        description: "Vendor registration or RFP data not found.",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (!formData.total_bid_amount || parseFloat(formData.total_bid_amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid bid amount.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.delivery_timeline) {
      toast({
        title: "Validation Error",
        description: "Please specify the delivery timeline.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.payment_terms_accepted) {
      toast({
        title: "Validation Error",
        description: "Please accept the payment terms to proceed.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate response number
      const responseNumber = `RES-${rfp.rfp_number}-${vendorReg.id.substring(0, 8)}`;
      
      const responseData = {
        rfp_id: id,
        vendor_id: vendorReg.id,
        response_number: responseNumber,
        total_bid_amount: parseFloat(formData.total_bid_amount),
        currency: formData.currency,
        delivery_timeline: formData.delivery_timeline,
        warranty_period: formData.warranty_period || null,
        bid_validity_until: formData.bid_validity_until ? new Date(formData.bid_validity_until).toISOString() : null,
        payment_terms_accepted: formData.payment_terms_accepted,
        technical_documents: formData.technical_notes ? { notes: formData.technical_notes } : null,
        commercial_documents: formData.commercial_notes ? { notes: formData.commercial_notes } : null,
        compliance_documents: formData.compliance_notes ? { notes: formData.compliance_notes } : null,
        status: 'submitted'
      };

      await submitResponseMutation.mutateAsync(responseData);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
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
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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

  if (existingResponse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/vendor/rfps/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to RFP Details
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Response Already Submitted</h1>
            <p className="text-muted-foreground">You have already submitted a response to this RFP</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You submitted your response on {format(new Date(existingResponse.submitted_at), 'MMM dd, yyyy HH:mm')}.
            Your response number is <strong>{existingResponse.response_number}</strong>.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button onClick={() => navigate(`/vendor/rfps/${id}`)}>
            <FileText className="w-4 h-4 mr-2" />
            View RFP Details
          </Button>
          <Button variant="outline" onClick={() => navigate(`/vendor/rfps/${id}/response`)}>
            <FileText className="w-4 h-4 mr-2" />
            View My Response
          </Button>
        </div>
      </div>
    );
  }

  const daysUntilDeadline = getDaysUntilDeadline(rfp.submission_deadline);
  const isExpired = daysUntilDeadline <= 0;

  if (isExpired) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/vendor/rfps/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to RFP Details
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Submission Deadline Passed</h1>
            <p className="text-muted-foreground">This RFP is no longer accepting responses</p>
          </div>
        </div>

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
            Back to RFP Details
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Submit RFP Response</h1>
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

      {/* Response Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Commercial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Commercial Proposal
            </CardTitle>
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
                  value={formData.total_bid_amount}
                  onChange={(e) => handleInputChange('total_bid_amount', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  placeholder="e.g., INR, USD"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery_timeline">Delivery Timeline *</Label>
                <Input
                  id="delivery_timeline"
                  placeholder="e.g., 15 days from PO"
                  value={formData.delivery_timeline}
                  onChange={(e) => handleInputChange('delivery_timeline', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="warranty_period">Warranty Period</Label>
                <Input
                  id="warranty_period"
                  placeholder="e.g., 12 months"
                  value={formData.warranty_period}
                  onChange={(e) => handleInputChange('warranty_period', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bid_validity_until">Bid Valid Until</Label>
              <Input
                id="bid_validity_until"
                type="date"
                value={formData.bid_validity_until}
                onChange={(e) => handleInputChange('bid_validity_until', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="commercial_notes">Commercial Notes</Label>
              <Textarea
                id="commercial_notes"
                placeholder="Any additional commercial terms, conditions, or notes..."
                value={formData.commercial_notes}
                onChange={(e) => handleInputChange('commercial_notes', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Technical Information */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Proposal</CardTitle>
            <CardDescription>
              Provide technical details and specifications for your proposal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="technical_notes">Technical Specifications & Notes</Label>
              <Textarea
                id="technical_notes"
                placeholder="Describe your technical approach, specifications, implementation details..."
                value={formData.technical_notes}
                onChange={(e) => handleInputChange('technical_notes', e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Compliance Information */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance & Documentation</CardTitle>
            <CardDescription>
              Provide compliance information and supporting documentation details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="compliance_notes">Compliance Notes</Label>
              <Textarea
                id="compliance_notes"
                placeholder="Detail how you meet the eligibility criteria and compliance requirements..."
                value={formData.compliance_notes}
                onChange={(e) => handleInputChange('compliance_notes', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Terms Acceptance */}
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
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
                checked={formData.payment_terms_accepted}
                onCheckedChange={(checked) => handleInputChange('payment_terms_accepted', checked as boolean)}
              />
              <Label htmlFor="payment_terms_accepted" className="text-sm">
                I accept the payment terms and conditions specified in this RFP *
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/vendor/rfps/${id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.payment_terms_accepted}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Response
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VendorRfpResponse;