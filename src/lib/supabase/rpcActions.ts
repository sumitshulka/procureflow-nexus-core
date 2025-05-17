
import { supabase } from "@/integrations/supabase/client";

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
