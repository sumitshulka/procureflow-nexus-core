
import { supabase } from "@/integrations/supabase/client";

export async function updateTransactionDeliveryDetails(
  transactionId: string,
  deliveryDetails: any
) {
  try {
    console.info("[rpcActions] Updating delivery details for transaction", transactionId);
    console.info("[rpcActions] Delivery details:", deliveryDetails);
    
    const { data, error } = await supabase.rpc(
      "update_transaction_delivery_details",
      {
        transaction_id: transactionId,
        details: deliveryDetails,
      }
    );

    if (error) {
      console.error("[rpcActions] Error calling RPC function:", error);
      console.error("[rpcActions] Error breakdown:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.info("[rpcActions] RPC call successful, result:", data);
    return data;
    
  } catch (error: any) {
    console.error("[rpcActions] Exception in updateTransactionDeliveryDetails:", error);
    console.error("[rpcActions] Exception details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    throw error;
  }
}
