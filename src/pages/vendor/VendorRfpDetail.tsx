import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, DollarSign, Clock, Building, FileText, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const VendorRfpDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch RFP details
  const { data: rfp, isLoading } = useQuery({
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

  // Check if vendor has responded
  const { data: response } = useQuery({
    queryKey: ["vendor_rfp_response", id, user?.id],
    queryFn: async () => {
      if (!id || !user?.id) return null;
      
      // Get vendor registration first
      const { data: vendorReg } = await supabase
        .from("vendor_registrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .single();
      
      if (!vendorReg) return null;
      
      const { data, error } = await supabase
        .from('rfp_responses')
        .select('*')
        .eq('rfp_id', id)
        .eq('vendor_id', vendorReg.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
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

  const daysUntilDeadline = getDaysUntilDeadline(rfp.submission_deadline);
  const hasResponded = !!response;
  const canRespond = !hasResponded && daysUntilDeadline > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/vendor/rfps')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to RFPs
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{rfp.title}</h1>
            <p className="text-muted-foreground">RFP #{rfp.rfp_number}</p>
          </div>
        </div>
        {canRespond && (
          <Button onClick={() => navigate(`/vendor/rfps/${rfp.id}/respond`)}>
            <Send className="w-4 h-4 mr-2" />
            Submit Response
          </Button>
        )}
        {hasResponded && (
          <Button 
            variant="outline"
            onClick={() => navigate(`/vendor/rfps/${rfp.id}/response`)}
          >
            <FileText className="w-4 h-4 mr-2" />
            View My Response
          </Button>
        )}
      </div>

      {/* Status and Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timeline & Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {hasResponded ? (
                  <Badge variant="secondary">Response Submitted</Badge>
                ) : canRespond ? (
                  <Badge>Open for Responses</Badge>
                ) : (
                  <Badge variant="outline">Deadline Passed</Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submission Deadline</p>
              <p className="font-medium flex items-center gap-1 mt-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(rfp.submission_deadline), 'MMM dd, yyyy HH:mm')}
              </p>
              {daysUntilDeadline > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {daysUntilDeadline} days remaining
                </p>
              ) : (
                <p className="text-xs text-red-600">Deadline has passed</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Published Date</p>
              <p className="font-medium mt-1">
                {format(new Date(rfp.created_at), 'MMM dd, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Value</p>
              <p className="font-medium mt-1">
                {rfp.estimated_value && rfp.currency 
                  ? `${rfp.currency} ${rfp.estimated_value.toLocaleString()}`
                  : 'Not specified'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{rfp.description || 'No description provided.'}</p>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      {rfp.terms_and_conditions && (
        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{rfp.terms_and_conditions}</p>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rfp.minimum_eligibility_criteria && (
          <Card>
            <CardHeader>
              <CardTitle>Eligibility Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{rfp.minimum_eligibility_criteria}</p>
            </CardContent>
          </Card>
        )}
        
        {rfp.warranty_requirements && (
          <Card>
            <CardHeader>
              <CardTitle>Warranty Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{rfp.warranty_requirements}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rfp.payment_terms && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{rfp.payment_terms}</p>
            </CardContent>
          </Card>
        )}
        
        {rfp.delivery_terms && (
          <Card>
            <CardHeader>
              <CardTitle>Delivery Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{rfp.delivery_terms}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rfp.pre_bid_meeting_date && (
            <div>
              <p className="font-medium">Pre-bid Meeting</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(rfp.pre_bid_meeting_date), 'MMM dd, yyyy HH:mm')}
                {rfp.pre_bid_meeting_venue && ` at ${rfp.pre_bid_meeting_venue}`}
              </p>
            </div>
          )}
          
          {rfp.bid_validity_period && (
            <div>
              <p className="font-medium">Bid Validity Period</p>
              <p className="text-sm text-muted-foreground">{rfp.bid_validity_period} days</p>
            </div>
          )}

          {rfp.technical_evaluation_deadline && (
            <div>
              <p className="font-medium">Technical Evaluation Deadline</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(rfp.technical_evaluation_deadline), 'MMM dd, yyyy')}
              </p>
            </div>
          )}

          {rfp.commercial_evaluation_deadline && (
            <div>
              <p className="font-medium">Commercial Evaluation Deadline</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(rfp.commercial_evaluation_deadline), 'MMM dd, yyyy')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorRfpDetail;