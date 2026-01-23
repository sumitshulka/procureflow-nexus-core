import { supabase } from "@/integrations/supabase/client";

export type BudgetAction = 
  | 'budget_created'
  | 'budget_submitted'
  | 'budget_approved'
  | 'budget_rejected'
  | 'budget_revision_requested'
  | 'budget_updated'
  | 'budget_revoked'
  | 'cycle_created'
  | 'cycle_updated'
  | 'head_created'
  | 'head_updated';

interface LogBudgetActivityParams {
  action: BudgetAction;
  entityType: 'budget_allocation' | 'budget_cycle' | 'budget_head';
  entityId: string;
  details?: Record<string, any>;
}

export const logBudgetActivity = async ({
  action,
  entityType,
  entityId,
  details
}: LogBudgetActivityParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details || null
    });
  } catch (error) {
    // Don't throw - logging should not break the main flow
    console.error('Failed to log budget activity:', error);
  }
};

// Batch log multiple allocations
export const logBudgetActivitiesBatch = async (
  action: BudgetAction,
  allocationIds: string[],
  details?: Record<string, any>
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const logs = allocationIds.map(id => ({
      user_id: user.id,
      action,
      entity_type: 'budget_allocation' as const,
      entity_id: id,
      details: details || null
    }));

    await supabase.from('activity_logs').insert(logs);
  } catch (error) {
    console.error('Failed to log budget activities:', error);
  }
};
