
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
  return await supabase
    .rpc('update_transaction_delivery_details', {
      transaction_id: transactionId,
      details: deliveryDetails
    });
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
 * Delete a procurement request
 * 
 * @param requestId - The ID of the procurement request to delete
 * @returns The result of the operation
 */
export const deleteProcurementRequest = async (
  requestId: string
) => {
  // Delete related request items first
  const { error: itemsError } = await supabase
    .from('procurement_request_items')
    .delete()
    .eq('request_id', requestId);
  
  if (itemsError) {
    console.error('Error deleting request items:', itemsError);
    return { error: itemsError };
  }
  
  // Then delete the request itself
  return await supabase
    .from('procurement_requests')
    .delete()
    .eq('id', requestId);
};
