import { supabase } from "@/integrations/supabase/client";

/**
 * Check if technical responses can be viewed based on opening date
 */
export const canViewTechnicalResponses = async (rfpId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('can_view_technical_responses', { p_rfp_id: rfpId });
    
    if (error) {
      console.error('Error checking technical viewing permission:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error checking technical viewing permission:', error);
    return false;
  }
};

/**
 * Check if commercial responses can be viewed based on opening date
 */
export const canViewCommercialResponses = async (rfpId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('can_view_commercial_responses', { p_rfp_id: rfpId });
    
    if (error) {
      console.error('Error checking commercial viewing permission:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error checking commercial viewing permission:', error);
    return false;
  }
};

/**
 * Get RFP opening status
 */
export const getRfpOpeningStatus = async (rfpId: string) => {
  try {
    const { data: rfp, error } = await supabase
      .from('rfps')
      .select('technical_opening_date, commercial_opening_date')
      .eq('id', rfpId)
      .single();
    
    if (error) throw error;
    
    const now = new Date();
    const technicalDate = rfp.technical_opening_date ? new Date(rfp.technical_opening_date) : null;
    const commercialDate = rfp.commercial_opening_date ? new Date(rfp.commercial_opening_date) : null;
    
    return {
      technicalOpened: !technicalDate || now >= technicalDate,
      commercialOpened: !commercialDate || now >= commercialDate,
      technicalOpeningDate: technicalDate,
      commercialOpeningDate: commercialDate,
    };
  } catch (error) {
    console.error('Error fetching RFP opening status:', error);
    return {
      technicalOpened: true, // Default to open for backward compatibility
      commercialOpened: true,
      technicalOpeningDate: null,
      commercialOpeningDate: null,
    };
  }
};

/**
 * Filter response data based on blind evaluation rules
 */
export const filterResponseByBlindEvaluation = (
  response: any,
  canViewTechnical: boolean,
  canViewCommercial: boolean
) => {
  const filtered = { ...response };
  
  // Hide technical data if not yet opened
  if (!canViewTechnical) {
    filtered.technical_documents = null;
    filtered.compliance_documents = null;
    filtered.technical_score = null;
    filtered.technical_submission_status = 'sealed';
  }
  
  // Hide commercial data if not yet opened
  if (!canViewCommercial) {
    filtered.total_bid_amount = null;
    filtered.currency = null;
    filtered.delivery_timeline = null;
    filtered.warranty_period = null;
    filtered.bid_validity_until = null;
    filtered.commercial_documents = null;
    filtered.commercial_score = null;
    filtered.commercial_submission_status = 'sealed';
  }
  
  return filtered;
};
