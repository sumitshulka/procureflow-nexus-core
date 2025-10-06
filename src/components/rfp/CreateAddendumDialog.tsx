import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, DollarSign, Clock, MapPin, FileText, AlertTriangle } from "lucide-react";

interface RFP {
  id: string;
  title: string;
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
  status?: string;
  updated_at?: string;
}

interface CreateAddendumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfpId: string;
  rfpData: RFP;
  onSuccess: () => void;
}

const RFP_FIELD_LABELS = {
  title: "RFP Title",
  description: "Description",
  estimated_value: "Estimated Value",
  currency: "Currency",
  submission_deadline: "Submission Deadline",
  technical_evaluation_deadline: "Technical Evaluation Deadline",
  commercial_evaluation_deadline: "Commercial Evaluation Deadline",
  pre_bid_meeting_date: "Pre-bid Meeting Date",
  pre_bid_meeting_venue: "Pre-bid Meeting Venue",
  bid_validity_period: "Bid Validity Period (days)",
  terms_and_conditions: "Terms and Conditions",
  payment_terms: "Payment Terms",
  delivery_terms: "Delivery Terms",
  warranty_requirements: "Warranty Requirements",
  minimum_eligibility_criteria: "Minimum Eligibility Criteria"
};

const EDITABLE_FIELDS = [
  'title', 'description', 'estimated_value', 'currency', 'submission_deadline',
  'technical_evaluation_deadline', 'commercial_evaluation_deadline',
  'pre_bid_meeting_date', 'pre_bid_meeting_venue', 'bid_validity_period',
  'terms_and_conditions', 'payment_terms', 'delivery_terms',
  'warranty_requirements', 'minimum_eligibility_criteria'
];

export const CreateAddendumDialog: React.FC<CreateAddendumDialogProps> = ({
  open,
  onOpenChange,
  rfpId,
  rfpData,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [addendumData, setAddendumData] = useState({
    title: '',
    description: '',
    content: '',
    field_overrides: {} as Record<string, any>,
    auto_publish: false
  });

  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const handleFieldToggle = (fieldName: string, checked: boolean) => {
    const newSelectedFields = new Set(selectedFields);
    if (checked) {
      newSelectedFields.add(fieldName);
    } else {
      newSelectedFields.delete(fieldName);
      const newOverrides = { ...addendumData.field_overrides };
      delete newOverrides[fieldName];
      setAddendumData(prev => ({
        ...prev,
        field_overrides: newOverrides
      }));
    }
    setSelectedFields(newSelectedFields);
  };

  const handleFieldValueChange = (fieldName: string, value: any) => {
    setAddendumData(prev => ({
      ...prev,
      field_overrides: {
        ...prev.field_overrides,
        [fieldName]: value
      }
    }));
  };

  const renderFieldInput = (fieldName: string, currentValue: any) => {
    const fieldType = typeof currentValue;
    const isDateField = fieldName.includes('deadline') || fieldName.includes('date');
    
    if (isDateField) {
      const dateValue = addendumData.field_overrides[fieldName];
      const formattedValue = dateValue ? new Date(dateValue).toISOString().slice(0, 16) : '';
      return (
        <Input
          type="datetime-local"
          value={formattedValue}
          onChange={(e) => handleFieldValueChange(fieldName, e.target.value)}
          className="mt-2"
        />
      );
    }
    
    if (fieldType === 'number' || fieldName === 'estimated_value' || fieldName === 'bid_validity_period') {
      return (
        <Input
          type="number"
          step={fieldName === 'estimated_value' ? '0.01' : '1'}
          value={addendumData.field_overrides[fieldName] || ''}
          onChange={(e) => handleFieldValueChange(fieldName, fieldName === 'estimated_value' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
          className="mt-2"
        />
      );
    }
    
    if (fieldName.includes('terms') || fieldName.includes('conditions') || fieldName.includes('requirements') || fieldName === 'description') {
      return (
        <Textarea
          value={addendumData.field_overrides[fieldName] || ''}
          onChange={(e) => handleFieldValueChange(fieldName, e.target.value)}
          rows={3}
          className="mt-2"
        />
      );
    }
    
    return (
      <Input
        value={addendumData.field_overrides[fieldName] || ''}
        onChange={(e) => handleFieldValueChange(fieldName, e.target.value)}
        className="mt-2"
      />
    );
  };

  const formatCurrentValue = (fieldName: string, value: any) => {
    if (!value && value !== 0) return 'Not set';
    
    const isDateField = fieldName.includes('deadline') || fieldName.includes('date');
    if (isDateField) {
      try {
        return format(new Date(value), "PPp");
      } catch {
        return 'Invalid date';
      }
    }
    
    if (fieldName === 'estimated_value') {
      return `${rfpData.currency || 'USD'} ${value.toLocaleString()}`;
    }
    
    if (fieldName === 'bid_validity_period') {
      return `${value} days`;
    }
    
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    
    return value.toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addendumData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the addendum",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedFields.size === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one field to override",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let shouldReopenRfp = false;

      // If auto-publishing and RFP is closed, check if we can reopen it
      if (addendumData.auto_publish && rfpData?.status === 'closed') {
        // Get organization settings for time limit
        const { data: orgSettings, error: settingsError } = await supabase
          .from('organization_settings')
          .select('rfp_reopen_time_limit_days')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!settingsError && orgSettings) {
          const timeLimitDays = orgSettings.rfp_reopen_time_limit_days || 30;
          const rfpUpdatedDate = new Date(rfpData.updated_at);
          const now = new Date();
          const daysSinceClosed = Math.floor((now.getTime() - rfpUpdatedDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceClosed <= timeLimitDays) {
            shouldReopenRfp = true;
          } else {
            toast({
              title: "Cannot Reopen RFP",
              description: `This RFP was closed ${daysSinceClosed} days ago. The time limit of ${timeLimitDays} days has expired.`,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }
      }

      // If we need to reopen the RFP, do it first
      if (shouldReopenRfp) {
        const { error: reopenError } = await supabase
          .from('rfps')
          .update({ status: 'published' })
          .eq('id', rfpId);

        if (reopenError) throw reopenError;
      }

      // Create the addendum
      const { error } = await supabase
        .from('rfp_addendums')
        .insert({
          rfp_id: rfpId,
          title: addendumData.title,
          description: addendumData.description || null,
          content: addendumData.content || null,
          field_overrides: addendumData.field_overrides as any,
          is_published: addendumData.auto_publish,
          published_at: addendumData.auto_publish ? new Date().toISOString() : null,
          created_by: user.id
        } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: shouldReopenRfp
          ? "Addendum created, published, and RFP has been reopened for submissions"
          : (addendumData.auto_publish 
            ? "Addendum created and published successfully"
            : "Addendum created successfully"),
      });

      // Reset form
      setAddendumData({
        title: '',
        description: '',
        content: '',
        field_overrides: {},
        auto_publish: false
      });
      setSelectedFields(new Set());
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create addendum",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create RFP Addendum</DialogTitle>
        </DialogHeader>
        
        {rfpData?.status === 'closed' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">RFP Reopening Notice</span>
            </div>
            <p className="text-sm text-blue-700 mt-2">
              This RFP is currently closed. If you publish this addendum and the RFP is within the configured reopen time limit, 
              it will automatically be reopened for vendor submissions.
            </p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-800">Important Note</span>
          </div>
          <p className="text-sm text-amber-700 mt-2">
            Once published, this addendum will override the specified RFP fields. 
            The original RFP values will remain unchanged in the database, but the addendum values will be considered current.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Addendum Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Addendum Title *</Label>
              <Input
                id="title"
                value={addendumData.title}
                onChange={(e) => setAddendumData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Extension of Submission Deadline"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={addendumData.description}
                onChange={(e) => setAddendumData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of changes"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="content">Additional Content</Label>
              <Textarea
                id="content"
                value={addendumData.content}
                onChange={(e) => setAddendumData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Any additional information or notes"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Field Overrides */}
          <div>
            <h3 className="text-lg font-semibold mb-4">RFP Field Overrides</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the RFP fields you want to modify in this addendum. The new values will override the original RFP values.
            </p>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {EDITABLE_FIELDS.map(fieldName => {
                const currentValue = (rfpData as any)[fieldName];
                const isSelected = selectedFields.has(fieldName);
                
                return (
                  <div key={fieldName} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Switch
                        checked={isSelected}
                        onCheckedChange={(checked) => handleFieldToggle(fieldName, checked)}
                      />
                      <Label className="font-medium">
                        {RFP_FIELD_LABELS[fieldName as keyof typeof RFP_FIELD_LABELS]}
                      </Label>
                    </div>
                    
                    <div className="ml-6">
                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Current value:</span> {formatCurrentValue(fieldName, currentValue)}
                      </div>
                      
                      {isSelected && (
                        <div>
                          <Label className="text-sm font-medium">New value:</Label>
                          {renderFieldInput(fieldName, currentValue)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Publishing Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={addendumData.auto_publish}
                onCheckedChange={(checked) => setAddendumData(prev => ({ ...prev, auto_publish: checked }))}
              />
              <Label>Publish immediately</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              If unchecked, the addendum will be saved as a draft and can be published later.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : addendumData.auto_publish ? "Create & Publish" : "Create Addendum"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};