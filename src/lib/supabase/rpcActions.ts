
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
    // First check if the request is in a status that allows deletion
    const { data: requestData, error: requestError } = await supabase
      .from('procurement_requests')
      .select('status')
      .eq('id', requestId)
      .single();
    
    if (requestError) {
      console.error('Error fetching request status:', requestError);
      return { canDelete: false, message: 'Error checking request status' };
    }
    
    if (!['draft', 'submitted'].includes(requestData.status)) {
      return { 
        canDelete: false, 
        message: `Cannot delete request with status "${requestData.status}". Only draft or submitted requests can be deleted.` 
      };
    }
    
    // Check if there are any inventory transactions linked to this request
    const { data: transactions, error: transactionError } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('request_id', requestId)
      .limit(1);
    
    if (transactionError) {
      console.error('Error checking for linked transactions:', transactionError);
      return { canDelete: false, message: 'Error checking for linked inventory transactions' };
    }
    
    if (transactions && transactions.length > 0) {
      return { 
        canDelete: false, 
        message: 'This request cannot be deleted because it is linked to inventory transactions' 
      };
    }
    
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
    
    // First check if the request can be deleted
    const { canDelete, message } = await canDeleteProcurementRequest(requestId);
    
    if (!canDelete) {
      console.error(`Cannot delete request: ${message}`);
      return { data: null, error: new Error(message || 'Request cannot be deleted') };
    }
    
    console.log('Request can be deleted, proceeding with deletion');
    
    // Start a transaction to ensure atomicity
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) {
      console.error('Error starting transaction:', transactionError);
      return { data: null, error: transactionError };
    }
    
    try {
      // Delete related request items first
      const { error: itemsError } = await supabase
        .from('procurement_request_items')
        .delete()
        .eq('request_id', requestId);
      
      if (itemsError) {
        console.error('Error deleting request items:', itemsError);
        await supabase.rpc('rollback_transaction');
        return { data: null, error: itemsError };
      }
      
      // Delete related approvals if any
      const { error: approvalsError } = await supabase
        .from('approvals')
        .delete()
        .eq('entity_type', 'procurement_request')
        .eq('entity_id', requestId);
      
      if (approvalsError) {
        console.error('Error deleting request approvals:', approvalsError);
        // We don't rollback for approvals errors, just log and continue
      }
      
      // Then delete the request itself
      const { data, error } = await supabase
        .from('procurement_requests')
        .delete()
        .eq('id', requestId)
        .select();
      
      if (error) {
        console.error('Error deleting procurement request:', error);
        // Check for specific error messages from the trigger
        await supabase.rpc('rollback_transaction');
        if (error.message.includes('violates foreign key constraint')) {
          return { 
            data: null, 
            error: new Error('This request cannot be deleted because it is referenced by other records in the system.') 
          };
        }
        return { data: null, error };
      }
      
      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) {
        console.error('Error committing transaction:', commitError);
        await supabase.rpc('rollback_transaction');
        return { data: null, error: commitError };
      }
      
      console.log('Request deleted successfully:', data);
      return { data, error: null };
      
    } catch (innerError: any) {
      // If any error occurs during deletion, roll back the transaction
      await supabase.rpc('rollback_transaction');
      console.error('Exception during deletion transaction:', innerError);
      return { data: null, error: innerError };
    }
    
  } catch (error: any) {
    console.error('Exception in deleteProcurementRequest:', error);
    return { data: null, error };
  }
};
