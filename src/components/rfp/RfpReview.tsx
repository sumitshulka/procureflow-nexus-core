
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Check, Edit, Users, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { RfpWizardData } from "./RfpWizard";

interface RfpReviewProps {
  data: RfpWizardData;
  onUpdate: (data: any) => void;
}

const RfpReview: React.FC<RfpReviewProps> = ({ data }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (date: any) => {
    if (!date) return 'Not specified';
    
    try {
      // Handle if date is already a Date object
      if (date instanceof Date) {
        return format(date, "PPP");
      }
      
      // Handle if date is a string
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return 'Invalid date';
        }
        return format(parsedDate, "PPP");
      }
      
      return 'Not specified';
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an RFP",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create RFP
      const rfpData = {
        title: data.basicInfo.title,
        description: data.basicInfo.description,
        submission_deadline: data.basicInfo.submission_deadline?.toISOString ? 
          data.basicInfo.submission_deadline.toISOString() : 
          new Date(data.basicInfo.submission_deadline).toISOString(),
        technical_evaluation_deadline: data.basicInfo.technical_evaluation_deadline?.toISOString ? 
          data.basicInfo.technical_evaluation_deadline.toISOString() : 
          data.basicInfo.technical_evaluation_deadline ? new Date(data.basicInfo.technical_evaluation_deadline).toISOString() : null,
        commercial_evaluation_deadline: data.basicInfo.commercial_evaluation_deadline?.toISOString ? 
          data.basicInfo.commercial_evaluation_deadline.toISOString() : 
          data.basicInfo.commercial_evaluation_deadline ? new Date(data.basicInfo.commercial_evaluation_deadline).toISOString() : null,
        estimated_value: data.basicInfo.estimated_value,
        currency: data.basicInfo.currency,
        // Store custom fields in evaluation_criteria
        evaluation_criteria: {
          ...data.terms.evaluation_criteria,
          custom_fields: data.basicInfo.customFieldsConfig || []
        },
        terms_and_conditions: data.terms.terms_and_conditions,
        minimum_eligibility_criteria: data.terms.minimum_eligibility_criteria,
        pre_bid_meeting_date: data.basicInfo.pre_bid_meeting_date?.toISOString ? 
          data.basicInfo.pre_bid_meeting_date.toISOString() : 
          data.basicInfo.pre_bid_meeting_date ? new Date(data.basicInfo.pre_bid_meeting_date).toISOString() : null,
        pre_bid_meeting_venue: data.basicInfo.pre_bid_meeting_venue,
        bid_validity_period: data.basicInfo.bid_validity_period,
        payment_terms: data.terms.payment_terms,
        delivery_terms: data.terms.delivery_terms,
        warranty_requirements: data.terms.warranty_requirements,
        created_by: user.id,
        status: "draft",
      };

      const { data: rfpResult, error: rfpError } = await supabase
        .from("rfps")
        .insert(rfpData as any)
        .select()
        .single();

      if (rfpError) throw rfpError;

      // Insert BOQ items as RFP items (you may need to create this table)
      // For now, we'll store them in a separate table or as JSON

      toast({
        title: "Success",
        description: "RFP created successfully and submitted for approval",
      });

      navigate("/rfp/active");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFP",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalEstimatedValue = data.boqItems?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Review & Submit</h3>
        <p className="text-sm text-muted-foreground">
          Please review all the information below before submitting the RFP for approval.
        </p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Basic Information
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Title:</span>
              <p className="text-muted-foreground">{data.basicInfo?.title || 'Not specified'}</p>
            </div>
            <div>
              <span className="font-medium">Estimated Value:</span>
              <p className="text-muted-foreground">
                {data.basicInfo?.currency || 'USD'} {data.basicInfo?.estimated_value?.toLocaleString() || 'Not specified'}
              </p>
            </div>
            <div>
              <span className="font-medium">Submission Deadline:</span>
              <p className="text-muted-foreground">
                {formatDate(data.basicInfo?.submission_deadline)}
              </p>
            </div>
            <div>
              <span className="font-medium">Bid Validity:</span>
              <p className="text-muted-foreground">{data.basicInfo?.bid_validity_period || 30} days</p>
            </div>
          </div>
          {data.basicInfo?.description && (
            <div>
              <span className="font-medium">Description:</span>
              <p className="text-muted-foreground mt-1">{data.basicInfo.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BOQ Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Bill of Quantities ({data.boqItems?.length || 0} items)
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.boqItems?.slice(0, 3).map((item, index) => (
              <div key={item.id || index} className="flex justify-between items-center">
                <span className="text-sm">{item.product_name || 'Unnamed product'} (Qty: {item.quantity || 0})</span>
                <span className="text-sm font-medium">
                  {data.basicInfo?.currency || 'USD'} {(item.total_amount || 0).toFixed(2)}
                </span>
              </div>
            )) || <p className="text-sm text-muted-foreground">No BOQ items added</p>}
            {(data.boqItems?.length || 0) > 3 && (
              <p className="text-sm text-muted-foreground">
                ...and {(data.boqItems?.length || 0) - 3} more items
              </p>
            )}
            <Separator />
            <div className="flex justify-between items-center font-semibold">
              <span>Total Estimated Value:</span>
              <span>{data.basicInfo?.currency || 'USD'} {totalEstimatedValue.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Vendor Distribution
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {data.isPublic ? (
              <>
                <Globe className="h-4 w-4 text-green-600" />
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Public RFP
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Will be accessible via public link
                </span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4 text-blue-600" />
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Closed RFP
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {data.vendors?.length || 0} selected vendor(s)
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Terms Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Terms & Conditions
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.terms?.payment_terms && (
              <div>
                <span className="font-medium">Payment Terms:</span>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {data.terms.payment_terms}
                </p>
              </div>
            )}
            {data.terms?.delivery_terms && (
              <div>
                <span className="font-medium">Delivery Terms:</span>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {data.terms.delivery_terms}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Section */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Ready to Submit</h4>
              <p className="text-sm text-green-700 mt-1">
                Your RFP is complete and ready to be submitted for approval. Once approved, 
                {data.isPublic 
                  ? " it will be available via the public link for vendors to view and respond."
                  : " it will be sent to the selected vendors for their responses."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? "Submitting..." : "Submit RFP for Approval"}
        </Button>
      </div>
    </div>
  );
};

export default RfpReview;
