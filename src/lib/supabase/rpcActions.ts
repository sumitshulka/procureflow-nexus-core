
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";

/**
 * Update the delivery details for a transaction
 * 
 * @param transactionId - The transaction ID to update
 * @param deliveryDetails - The delivery details object
 * @returns The updated transaction or an error
 */
export const updateTransactionDeliveryDetails = async (
  transactionId: string,
  deliveryDetails: Record<string, any>
) => {
  console.log(`Updating delivery details for transaction ${transactionId}`);
  console.log('Delivery details:', deliveryDetails);

  try {
    // Use the dedicated RPC function instead of a direct update
    const { data, error } = await supabase
      .rpc('update_transaction_delivery_details', {
        transaction_id: transactionId,
        details: deliveryDetails
      });
    
    if (error) {
      console.error('Error updating delivery details:', error);
      throw error;
    }
    
    console.log('Update successful, returned data:', data);
    return { data, error: null };
  } catch (error: any) {
    console.error('Exception in updateTransactionDeliveryDetails:', error);
    return { data: null, error };
  }
};

/**
 * Assign a role to a user
 * 
 * @param userId - The user ID to assign the role to
 * @param role - The role to assign
 * @returns The result of the operation
 */
export const assignRoleToUser = async (
  userId: string,
  role: UserRole
) => {
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: role
    });

  return { data, error };
};

/**
 * Check if a user has a specific role
 * 
 * @param userId - The user ID to check
 * @param role - The role to check for
 * @returns Boolean indicating if the user has the role
 */
export const hasUserRole = async (
  userId: string,
  role: UserRole
) => {
  const { data, error } = await supabase
    .rpc('has_role', {
      user_id: userId,
      required_role: role
    });
  
  if (error) {
    console.error('Error checking user role:', error);
    return false;
  }
  
  return data || false;
};

/**
 * Get all roles for a user
 * 
 * @param userId - The user ID to get roles for
 * @returns Array of roles or an error
 */
export const getUserRoles = async (
  userId: string
) => {
  return await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
};

/**
 * Update a user's password (admin only)
 * 
 * @param userId - The user ID to update
 * @param newPassword - The new password
 * @returns The result of the operation
 */
export const updateUserPassword = async (
  userId: string,
  newPassword: string
) => {
  return await supabase.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );
};

/**
 * Check if a procurement request can be deleted
 * 
 * @param requestId - The ID of the procurement request to check
 * @returns Object with canDelete flag and error message if any
 */
export const canDeleteProcurementRequest = async (
  requestId: string
) => {
  try {
    // Call the database function to do validation with renamed parameter
    const { data, error } = await supabase
      .rpc('can_delete_procurement_request', {
        p_request_id: requestId
      });
    
    if (error) {
      console.error('Error calling can_delete_procurement_request function:', error);
      return { canDelete: false, message: error.message || 'Error checking request status' };
    }
    
    // Parse the JSON response data safely
    const result = data as { success: boolean; message: string; data?: any };
    
    // If the function returns success: false, the request cannot be deleted
    if (result && !result.success) {
      return { 
        canDelete: false, 
        message: result.message || 'This request cannot be deleted'
      };
    }
    
    // If we get here, the request can be deleted
    return { canDelete: true, message: null };
  } catch (error: any) {
    console.error('Error in canDeleteProcurementRequest:', error);
    return { canDelete: false, message: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Delete a procurement request
 * 
 * @param requestId - The ID of the procurement request to delete
 * @returns The result of the operation
 */
export const deleteProcurementRequest = async (
  requestId: string
) => {
  try {
    console.log(`Attempting to delete procurement request: ${requestId}`);
    
    // Use the database function to delete the request with renamed parameter
    const { data, error } = await supabase
      .rpc('delete_procurement_request', {
        p_request_id: requestId
      });
      
    if (error) {
      console.error('Error calling delete_procurement_request function:', error);
      return { data: null, error };
    }
    
    // Parse the JSON response data safely
    const result = data as { success: boolean; message: string; data?: any };
    
    if (!result.success) {
      console.error(`Cannot delete request: ${result.message}`);
      return { data: null, error: new Error(result.message || 'Request cannot be deleted') };
    }
    
    console.log('Request deleted successfully:', data);
    return { data: result.data, error: null };
  } catch (error: any) {
    console.error('Exception in deleteProcurementRequest:', error);
    return { data: null, error };
  }
};
