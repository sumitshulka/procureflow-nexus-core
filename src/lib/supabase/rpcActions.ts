
import { supabase } from "@/integrations/supabase/client";

/**
 * Updates inventory transaction delivery details using RPC
 * This is a workaround if the delivery_details column doesn't exist directly
 */
export const updateTransactionDeliveryDetails = async (
  transactionId: string, 
  details: Record<string, any>
) => {
  try {
    // Try direct update first
    const { error } = await supabase
      .from("inventory_transactions")
      .update({
        delivery_details: details
      })
      .eq("id", transactionId);
    
    if (!error) return { success: true };

    // If direct update fails (column might not exist), try JSON metadata update
    console.log("Falling back to metadata update for delivery details");
    const { data, error: metaError } = await supabase
      .from("inventory_transactions")
      .update({
        notes: JSON.stringify({
          delivery_details: details,
          original_notes: details.delivery_notes || ""
        })
      })
      .eq("id", transactionId)
      .select();

    if (metaError) throw metaError;
    
    return { success: true, data };
  } catch (error) {
    console.error("Failed to update delivery details:", error);
    return { success: false, error };
  }
};
