import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, RequestStatus } from '@/types';
import { canDeleteProcurementRequest, deleteProcurementRequest } from '@/lib/supabase/rpcActions';

// Utility function to get approval details for an entity
export const getApprovalDetails = async (entityType: string, entityId: string) => {
  try {
    const { data, error } = await supabase
      .from('approvals')
      .select(`
        id,
        status,
        created_at,
        approval_date,
        comments,
        entity_type,
        entity_id,
        requester_id,
        approver_id
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    // If we have approvals, fetch the profile data separately to avoid join issues
    if (data && data.length > 0) {
      const requesterIds = [...new Set(data.map(approval => approval.requester_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', requesterIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue without profile names if profiles fetch fails
        return data.map(approval => ({
          ...approval,
          profiles: { full_name: 'Unknown user' }
        }));
      }
      
      // Map profile data to approvals
      return data.map(approval => {
        const profile = profiles?.find(p => p.id === approval.requester_id);
        return {
          ...approval,
          profiles: { full_name: profile?.full_name || 'Unknown user' }
        };
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching approval details:', error);
    return [];
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
      .select('role_id, custom_roles(name)')
      .eq('user_id', requesterId);
      
    if (rolesError) throw rolesError;
    
    const isAdmin = userRoles?.some(r => ((r.custom_roles as any)?.name || '').toLowerCase() === 'admin');
    
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

// Create a new approval request
export const createApprovalRequest = async (
  entityType: string,
  entityId: string,
  requesterId: string,
  entityTitle: string = "",
  status: string = "pending"
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`Creating approval request for ${entityType}, ${entityId}, ${requesterId}, ${entityTitle}`);
    
    // First check if there's already an approval request for this entity
    const { data: existingApprovals } = await supabase
      .from('approvals')
      .select('id, status')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (existingApprovals && existingApprovals.length > 0) {
      // If the most recent approval is still pending, don't create a new one
      if (existingApprovals[0].status === 'pending') {
        return {
          success: true,
          message: 'Approval request already exists'
        };
      }
    }
    
    // Determine if user is admin for auto-approval
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role_id, custom_roles(name)')
      .eq('user_id', requesterId);
      
    if (rolesError) throw rolesError;
    
    const isAdmin = userRoles?.some(r => ((r.custom_roles as any)?.name || '').toLowerCase() === 'admin');
    
    // If admin, auto-approve the request
    if (isAdmin) {
      status = 'approved';
    }
    
    // Insert the approval request
    const { data, error } = await supabase
      .from('approvals')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        requester_id: requesterId,
        status: status,
        approval_date: status === 'approved' ? new Date().toISOString() : null,
        comments: entityTitle ? `Title: ${entityTitle}` : null
      })
      .select();
    
    if (error) throw error;
    
    console.log(`Approval request created:`, data);
    
    // For inventory checkout requests, update the transaction status if auto-approved
    if (entityType === 'inventory_checkout' && status === 'approved') {
      const { error: updateError } = await supabase
        .from('inventory_transactions')
        .update({ approval_status: 'approved' })
        .eq('id', entityId);
      
      if (updateError) {
        console.error('Error updating inventory transaction status:', updateError);
      }
    }
    
    return {
      success: true,
      message: status === 'approved' 
        ? 'Request auto-approved as administrator' 
        : 'Approval request created successfully'
    };
    
  } catch (error: any) {
    console.error('Error creating approval request:', error);
    return {
      success: false,
      message: 'Failed to create approval request: ' + error.message
    };
  }
};

// Function to track approval history
export const logApprovalAction = async (
  entityType: string,
  entityId: string,
  userId: string,
  action: string,
  details: any = {}
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        details: details
      });
    
    if (error) {
      console.error('Error logging approval action:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in activity logging:', error);
    return false;
  }
};

// Component that provides approval workflow functions through context
export const useApprovalWorkflow = () => {
  const { userData } = useAuth();
  // Case-insensitive role check
  const userRolesLower = userData?.roles?.map(r => r.toLowerCase()) || [];
  const isAdmin = userRolesLower.includes(UserRole.ADMIN.toLowerCase());
  
  return {
    handleAdminRequestApproval,
    canDeleteProcurementRequest,
    deleteProcurementRequest,
    getApprovalDetails,
    logApprovalAction,
    createApprovalRequest,
    isAdmin
  };
};

export default useApprovalWorkflow;
