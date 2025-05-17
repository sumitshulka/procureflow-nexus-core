
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

// Function to check if a procurement request is used in inventory checkout
export const isProcurementRequestUsedInInventory = async (requestId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('id')
    .eq('request_id', requestId)
    .limit(1);
  
  if (error) {
    console.error('Error checking if procurement request is used in inventory:', error);
    return false;
  }
  
  return (data && data.length > 0);
};

// Function to handle admin request approval logic
export const handleAdminRequestApproval = async (
  entityType: string, 
  entityId: string, 
  requesterId: string,
  assignedApprover?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Determine if requestor has admin role
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requesterId);
      
    if (rolesError) throw rolesError;
    
    const isAdmin = userRoles?.some(r => r.role === 'admin');
    
    if (isAdmin) {
      // If admin and has explicit approver, create pending approval
      if (assignedApprover) {
        const { error } = await supabase
          .from('approvals')
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            requester_id: requesterId,
            approver_id: assignedApprover,
            status: 'pending'
          });
        
        if (error) throw error;
        
        return { 
          success: true, 
          message: 'Approval request created and assigned to approver' 
        };
      } 
      // If admin but no explicit approver, auto-approve
      else {
        const { error } = await supabase
          .from('approvals')
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            requester_id: requesterId,
            status: 'approved',
            approval_date: new Date().toISOString()
          });
        
        if (error) throw error;
        
        return { 
          success: true, 
          message: 'Request auto-approved as administrator with no assigned approver' 
        };
      }
    }
    
    // Non-admin case - proceed with normal approval flow
    return { success: true, message: 'Request submitted for approval' };
    
  } catch (error) {
    console.error('Error in admin approval process:', error);
    return { 
      success: false, 
      message: 'Failed to process approval request' 
    };
  }
};

// Component that provides approval workflow functions through context
export const useApprovalWorkflow = () => {
  const { userData } = useAuth();
  const isAdmin = userData?.roles?.includes(UserRole.ADMIN);
  
  // Check if current user can delete a procurement request
  const canDeleteProcurementRequest = async (requestId: string): Promise<boolean> => {
    // Only admins can delete requests
    if (!isAdmin) return false;
    
    // Check if the request is used in inventory
    const isUsedInInventory = await isProcurementRequestUsedInInventory(requestId);
    
    // Cannot delete if used in inventory
    if (isUsedInInventory) return false;
    
    return true;
  };
  
  return {
    handleAdminRequestApproval,
    canDeleteProcurementRequest,
    isProcurementRequestUsedInInventory
  };
};

export default useApprovalWorkflow;
