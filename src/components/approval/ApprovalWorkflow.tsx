
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, RequestStatus } from '@/types';

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

// Function to check if a procurement request can be deleted
export const canDeleteProcurementRequest = async (requestId: string): Promise<{
  canDelete: boolean;
  message?: string;
}> => {
  try {
    // Get the request status
    const { data: request, error: requestError } = await supabase
      .from('procurement_requests')
      .select('status')
      .eq('id', requestId)
      .single();
    
    if (requestError) throw requestError;
    
    // Check if request is in a state that allows deletion (draft or submitted)
    const allowedStatuses = ['draft', 'submitted'];
    
    if (!allowedStatuses.includes(request.status)) {
      return { 
        canDelete: false, 
        message: `Request cannot be deleted because it is in ${request.status} status` 
      };
    }
    
    // Check if the request is used in inventory
    const isUsedInInventory = await isProcurementRequestUsedInInventory(requestId);
    
    if (isUsedInInventory) {
      return { 
        canDelete: false, 
        message: 'Request cannot be deleted because it is used in inventory transactions' 
      };
    }
    
    return { canDelete: true };
    
  } catch (error) {
    console.error('Error checking if request can be deleted:', error);
    return { 
      canDelete: false, 
      message: 'Could not determine if request can be deleted' 
    };
  }
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
  
  return {
    handleAdminRequestApproval,
    canDeleteProcurementRequest,
    isProcurementRequestUsedInInventory
  };
};

export default useApprovalWorkflow;
