
import { supabase } from "@/integrations/supabase/client";

export async function canDeleteProcurementRequest(requestId: string): Promise<{ canDelete: boolean; message?: string }> {
  try {
    console.info("[rpcActions] Checking if procurement request can be deleted:", requestId);
    
    // Check if the request exists and get its status
    const { data: request, error: fetchError } = await supabase
      .from('procurement_requests')
      .select('status')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      console.error("[rpcActions] Error fetching procurement request:", fetchError);
      throw fetchError;
    }

    if (!request) {
      return { canDelete: false, message: "Request not found" };
    }

    // Only allow deletion of draft and submitted requests
    if (request.status === 'draft' || request.status === 'submitted') {
      console.info("[rpcActions] Request can be deleted - status:", request.status);
      return { canDelete: true };
    } else {
      console.info("[rpcActions] Request cannot be deleted - status:", request.status);
      return { 
        canDelete: false, 
        message: `Cannot delete request with status: ${request.status}` 
      };
    }
  } catch (error: any) {
    console.error("[rpcActions] Exception in canDeleteProcurementRequest:", error);
    return { 
      canDelete: false, 
      message: "Error checking request status" 
    };
  }
}

export async function deleteProcurementRequest(requestId: string) {
  try {
    console.info("[rpcActions] Deleting procurement request:", requestId);
    
    // First delete related items
    const { error: itemsError } = await supabase
      .from('procurement_request_items')
      .delete()
      .eq('request_id', requestId);

    if (itemsError) {
      console.error("[rpcActions] Error deleting request items:", itemsError);
      throw itemsError;
    }

    // Then delete the request itself
    const { data, error } = await supabase
      .from('procurement_requests')
      .delete()
      .eq('id', requestId)
      .select();

    if (error) {
      console.error("[rpcActions] Error deleting procurement request:", error);
      throw error;
    }

    console.info("[rpcActions] Procurement request deleted successfully:", data);
    return { data, error: null };
    
  } catch (error: any) {
    console.error("[rpcActions] Exception in deleteProcurementRequest:", error);
    return { data: null, error };
  }
}
