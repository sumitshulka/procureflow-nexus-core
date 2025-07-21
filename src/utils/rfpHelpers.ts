import { supabase } from "@/integrations/supabase/client";

/**
 * Get effective RFP data with addendum overrides applied
 * This function combines the original RFP data with any published addendum overrides
 */
export const getEffectiveRfpData = async (rfpId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_effective_rfp_data', {
      p_rfp_id: rfpId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching effective RFP data:', error);
    return null;
  }
};

/**
 * Check if RFP can be edited directly (not published)
 * Once published, changes can only be made through addendums
 */
export const canEditRfpDirectly = (rfpStatus: string): boolean => {
  return rfpStatus === 'draft';
};

/**
 * Check if addendums can be created for this RFP
 * Addendums can only be created for published RFPs
 */
export const canCreateAddendums = (rfpStatus: string): boolean => {
  return ['published', 'evaluation', 'awarded'].includes(rfpStatus);
};

/**
 * Format RFP field name for display
 */
export const formatFieldName = (fieldName: string): string => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get list of editable RFP fields that can be overridden in addendums
 */
export const getEditableRfpFields = () => {
  return [
    'title',
    'description', 
    'estimated_value',
    'currency',
    'submission_deadline',
    'technical_evaluation_deadline',
    'commercial_evaluation_deadline',
    'pre_bid_meeting_date',
    'pre_bid_meeting_venue',
    'bid_validity_period',
    'terms_and_conditions',
    'payment_terms',
    'delivery_terms',
    'warranty_requirements',
    'minimum_eligibility_criteria'
  ];
};