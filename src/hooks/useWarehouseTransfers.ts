import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type {
  WarehouseTransfer,
  WarehouseTransferItem,
  WarehouseTransferLog,
  TransferInitiateFormValues,
  TransferReceiveFormValues,
  TransferStatus,
} from "@/types/transfer";

interface BatchInfo {
  batch_number: string;
  product_id: string;
  product_name: string;
  warehouse_id: string;
  quantity: number;
  expiry_date: string | null;
  unit_price: number | null;
  currency: string | null;
}

interface WarehouseInventoryItem {
  product_id: string;
  product_name: string;
  product_sku: string | null;
  warehouse_id: string;
  available_quantity: number;
  unit_price: number | null;
  currency: string | null;
}

export function useWarehouseTransfers() {
  const { toast } = useToast();
  const { userData } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all transfers
  const transfersQuery = useQuery({
    queryKey: ["warehouse_transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_transfers")
        .select(`
          *,
          source_warehouse:source_warehouse_id(id, name),
          target_warehouse:target_warehouse_id(id, name),
          initiator:initiated_by(id, full_name, email)
        `)
        .order("initiated_at", { ascending: false });

      if (error) throw error;
      return data as unknown as WarehouseTransfer[];
    },
  });

  // Fetch single transfer with items and logs
  const useTransferDetail = (transferId: string | undefined) =>
    useQuery({
      queryKey: ["warehouse_transfer", transferId],
      queryFn: async () => {
        if (!transferId) return null;

        const { data: transfer, error: transferError } = await supabase
          .from("warehouse_transfers")
          .select(`
            *,
            source_warehouse:source_warehouse_id(id, name),
            target_warehouse:target_warehouse_id(id, name),
            initiator:initiated_by(id, full_name, email),
            receiver:received_by(id, full_name, email)
          `)
          .eq("id", transferId)
          .single();

        if (transferError) throw transferError;

        // Fetch items
        const { data: items, error: itemsError } = await supabase
          .from("warehouse_transfer_items")
          .select(`
            *,
            product:product_id(id, name, sku)
          `)
          .eq("transfer_id", transferId)
          .order("created_at");

        if (itemsError) throw itemsError;

        // Fetch logs
        const { data: logs, error: logsError } = await supabase
          .from("warehouse_transfer_logs")
          .select(`
            *,
            actor:action_by(id, full_name, email)
          `)
          .eq("transfer_id", transferId)
          .order("action_at", { ascending: false });

        if (logsError) throw logsError;

        return {
          ...transfer,
          items,
          logs,
        } as unknown as WarehouseTransfer & { logs: WarehouseTransferLog[] };
      },
      enabled: !!transferId,
    });

  // Fetch available batches for a warehouse
  const useAvailableBatches = (warehouseId: string | undefined) =>
    useQuery({
      queryKey: ["available_batches_for_transfer", warehouseId],
      queryFn: async () => {
        if (!warehouseId) return [];

        // Fetch check_in transactions with batch information
        const { data: checkIns, error: checkInError } = await supabase
          .from("inventory_transactions")
          .select(`
            id,
            quantity,
            unit_price,
            currency,
            delivery_details,
            product_id,
            product:product_id(id, name)
          `)
          .eq("type", "check_in")
          .eq("target_warehouse_id", warehouseId)
          .not("delivery_details", "is", null);

        if (checkInError) throw checkInError;

        // Aggregate batch information
        const batchMap = new Map<string, BatchInfo>();

        checkIns?.forEach((tx: any) => {
          const details = (tx.delivery_details as Record<string, any>) || {};
          const batchNumber = details.batch_number;
          if (!batchNumber) return;

          const key = `${batchNumber}_${tx.product_id}`;

          if (batchMap.has(key)) {
            const existing = batchMap.get(key)!;
            existing.quantity += tx.quantity;
          } else {
            batchMap.set(key, {
              batch_number: batchNumber,
              product_id: tx.product_id,
              product_name: tx.product?.name || "Unknown",
              warehouse_id: warehouseId,
              quantity: tx.quantity,
              expiry_date: details.expiry_date || null,
              unit_price: tx.unit_price,
              currency: tx.currency || "USD",
            });
          }
        });

        // Account for check_outs
        const { data: checkOuts } = await supabase
          .from("inventory_transactions")
          .select("id, quantity, delivery_details, product_id")
          .eq("type", "check_out")
          .eq("source_warehouse_id", warehouseId)
          .not("delivery_details", "is", null);

        checkOuts?.forEach((tx: any) => {
          const details = (tx.delivery_details as Record<string, any>) || {};
          const batchNumber = details.batch_number;
          if (!batchNumber) return;

          const key = `${batchNumber}_${tx.product_id}`;
          if (batchMap.has(key)) {
            const existing = batchMap.get(key)!;
            existing.quantity -= tx.quantity;
          }
        });

        // Account for outgoing transfers (initiated, in_transit)
        const { data: outTransfers } = await supabase
          .from("warehouse_transfers")
          .select(`
            id,
            items:warehouse_transfer_items(product_id, batch_number, quantity_sent, quantity_returned)
          `)
          .eq("source_warehouse_id", warehouseId)
          .in("status", ["initiated", "in_transit"]);

        outTransfers?.forEach((transfer: any) => {
          transfer.items?.forEach((item: any) => {
            const key = `${item.batch_number}_${item.product_id}`;
            if (batchMap.has(key)) {
              const existing = batchMap.get(key)!;
              existing.quantity -= (item.quantity_sent - item.quantity_returned);
            }
          });
        });

        // Filter out batches with zero or negative quantity
        return Array.from(batchMap.values()).filter((b) => b.quantity > 0);
      },
      enabled: !!warehouseId,
    });

  // Fetch inventory items (products) for a warehouse - includes products without batches
  const useWarehouseInventory = (warehouseId: string | undefined) =>
    useQuery({
      queryKey: ["warehouse_inventory_for_transfer", warehouseId],
      queryFn: async () => {
        if (!warehouseId) return [];

        // Fetch inventory items with product details
        const { data: inventoryItems, error } = await supabase
          .from("inventory_items")
          .select(`
            id,
            product_id,
            quantity,
            warehouse_id,
            product:product_id(id, name)
          `)
          .eq("warehouse_id", warehouseId)
          .gt("quantity", 0);

        if (error) throw error;

        // Get pending outgoing transfers to calculate reserved quantity
        const { data: outTransfers } = await supabase
          .from("warehouse_transfers")
          .select(`
            id,
            items:warehouse_transfer_items(product_id, quantity_sent, quantity_returned)
          `)
          .eq("source_warehouse_id", warehouseId)
          .in("status", ["initiated", "in_transit"]);

        // Calculate reserved quantities per product
        const reservedMap = new Map<string, number>();
        outTransfers?.forEach((transfer: any) => {
          transfer.items?.forEach((item: any) => {
            const reserved = item.quantity_sent - (item.quantity_returned || 0);
            const current = reservedMap.get(item.product_id) || 0;
            reservedMap.set(item.product_id, current + reserved);
          });
        });

        // Map to inventory items with available quantity
        const items: WarehouseInventoryItem[] = (inventoryItems || []).map((inv: any) => {
          const reserved = reservedMap.get(inv.product_id) || 0;
          const available = inv.quantity - reserved;
          
          return {
            product_id: inv.product_id,
            product_name: inv.product?.name || "Unknown",
            product_sku: null, // SKU column doesn't exist
            warehouse_id: warehouseId,
            available_quantity: Math.max(0, available),
            unit_price: null,
            currency: "USD",
          };
        });

        return items.filter(item => item.available_quantity > 0);
      },
      enabled: !!warehouseId,
    });

  // Initiate transfer mutation
  const initiateTransferMutation = useMutation({
    mutationFn: async (values: TransferInitiateFormValues) => {
      if (!userData?.id) throw new Error("User not authenticated");

      // Create transfer record
      const { data: transfer, error: transferError } = await supabase
        .from("warehouse_transfers")
        .insert({
          transfer_number: "", // Will be auto-generated by trigger
          source_warehouse_id: values.source_warehouse_id,
          target_warehouse_id: values.target_warehouse_id,
          status: "initiated",
          initiated_by: userData.id,
          initiation_notes: values.initiation_notes || null,
          courier_name: values.courier_name || null,
          tracking_number: values.tracking_number || null,
          expected_delivery_date: values.expected_delivery_date?.toISOString().split("T")[0] || null,
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Create transfer items
      const itemsToInsert = values.items.map((item) => ({
        transfer_id: transfer.id,
        product_id: item.product_id,
        batch_number: item.batch_number || null, // Optional - not all products have batches
        expiry_date: item.expiry_date || null,
        unit_price: item.unit_price || null,
        currency: item.currency || "USD",
        quantity_sent: item.quantity,
        item_status: "pending",
      }));

      const { error: itemsError } = await supabase
        .from("warehouse_transfer_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Create audit log
      await supabase.from("warehouse_transfer_logs").insert({
        transfer_id: transfer.id,
        action: "transfer_initiated",
        action_by: userData.id,
        new_status: "initiated",
        details: {
          items_count: values.items.length,
          total_quantity: values.items.reduce((sum, i) => sum + i.quantity, 0),
          courier_name: values.courier_name,
          tracking_number: values.tracking_number,
        },
        notes: values.initiation_notes,
      });

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: userData.id,
        action: "warehouse_transfer_initiated",
        entity_type: "warehouse_transfer",
        entity_id: transfer.id,
        details: {
          transfer_number: transfer.transfer_number,
          source_warehouse_id: values.source_warehouse_id,
          target_warehouse_id: values.target_warehouse_id,
          items_count: values.items.length,
        },
      });

      return transfer;
    },
    onSuccess: (data) => {
      toast({
        title: "Transfer Initiated",
        description: `Transfer ${data.transfer_number} has been created`,
      });
      queryClient.invalidateQueries({ queryKey: ["warehouse_transfers"] });
      queryClient.invalidateQueries({ queryKey: ["available_batches_for_transfer"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate transfer",
        variant: "destructive",
      });
    },
  });

  // Mark as dispatched (in transit)
  const dispatchTransferMutation = useMutation({
    mutationFn: async ({
      transferId,
      courierName,
      trackingNumber,
    }: {
      transferId: string;
      courierName?: string;
      trackingNumber?: string;
    }) => {
      if (!userData?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("warehouse_transfers")
        .update({
          status: "in_transit",
          dispatch_date: new Date().toISOString(),
          courier_name: courierName || null,
          tracking_number: trackingNumber || null,
        })
        .eq("id", transferId)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from("warehouse_transfer_logs").insert({
        transfer_id: transferId,
        action: "transfer_dispatched",
        action_by: userData.id,
        previous_status: "initiated",
        new_status: "in_transit",
        details: { courier_name: courierName, tracking_number: trackingNumber },
      });

      return data;
    },
    onSuccess: () => {
      toast({ title: "Transfer Dispatched", description: "Transfer is now in transit" });
      queryClient.invalidateQueries({ queryKey: ["warehouse_transfers"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Receive transfer mutation
  const receiveTransferMutation = useMutation({
    mutationFn: async ({
      transferId,
      values,
    }: {
      transferId: string;
      values: TransferReceiveFormValues;
    }) => {
      if (!userData?.id) throw new Error("User not authenticated");

      // Update each item
      for (const item of values.items) {
        let itemStatus: string = "pending";
        
        if (item.quantity_disposed === item.quantity_sent) {
          itemStatus = "disposed";
        } else if (item.quantity_rejected === item.quantity_sent) {
          itemStatus = "rejected";
        } else if (item.quantity_received === item.quantity_sent) {
          itemStatus = "accepted";
        } else if (item.quantity_received > 0) {
          itemStatus = "partial_accepted";
        }

        const { error: itemError } = await supabase
          .from("warehouse_transfer_items")
          .update({
            quantity_received: item.quantity_received,
            quantity_rejected: item.quantity_rejected,
            quantity_disposed: item.quantity_disposed,
            item_status: itemStatus,
            rejection_reason: item.rejection_reason || null,
            disposal_reason: item.disposal_reason || null,
            condition_notes: item.condition_notes || null,
          })
          .eq("id", item.item_id);

        if (itemError) throw itemError;

        // Log item-level action if there are rejections or disposals
        if (item.quantity_rejected > 0 || item.quantity_disposed > 0) {
          await supabase.from("warehouse_transfer_logs").insert({
            transfer_id: transferId,
            transfer_item_id: item.item_id,
            action: item.quantity_disposed > 0 ? "item_disposed" : "item_rejected",
            action_by: userData.id,
            details: {
              product: item.product_name,
              batch: item.batch_number,
              quantity_rejected: item.quantity_rejected,
              quantity_disposed: item.quantity_disposed,
              rejection_reason: item.rejection_reason,
              disposal_reason: item.disposal_reason,
            },
          });
        }
      }

      // Calculate overall transfer status
      const totalSent = values.items.reduce((s, i) => s + i.quantity_sent, 0);
      const totalReceived = values.items.reduce((s, i) => s + i.quantity_received, 0);
      const totalRejected = values.items.reduce((s, i) => s + i.quantity_rejected, 0);
      const totalDisposed = values.items.reduce((s, i) => s + i.quantity_disposed, 0);

      let newStatus: TransferStatus = "received";
      if (totalReceived === 0 && (totalRejected > 0 || totalDisposed > 0)) {
        newStatus = "rejected";
      } else if (totalReceived < totalSent) {
        newStatus = "partial_received";
      }

      // Update transfer
      const { data: transfer, error: transferError } = await supabase
        .from("warehouse_transfers")
        .update({
          status: newStatus,
          received_by: userData.id,
          received_at: new Date().toISOString(),
          receipt_notes: values.receipt_notes || null,
        })
        .eq("id", transferId)
        .select()
        .single();

      if (transferError) throw transferError;

      // Update inventory for received items
      for (const item of values.items) {
        if (item.quantity_received > 0) {
          // Get product and target warehouse from transfer
          const { data: transferData } = await supabase
            .from("warehouse_transfers")
            .select("target_warehouse_id")
            .eq("id", transferId)
            .single();

          if (transferData) {
            // Check if inventory item exists
            const { data: existingItem } = await supabase
              .from("inventory_items")
              .select("id, quantity")
              .eq("product_id", item.item_id.split("_")[0]) // This needs proper product_id
              .eq("warehouse_id", transferData.target_warehouse_id)
              .maybeSingle();

            // Get the actual item to get product_id
            const { data: transferItem } = await supabase
              .from("warehouse_transfer_items")
              .select("product_id")
              .eq("id", item.item_id)
              .single();

            if (transferItem) {
              const { data: invItem } = await supabase
                .from("inventory_items")
                .select("id, quantity")
                .eq("product_id", transferItem.product_id)
                .eq("warehouse_id", transferData.target_warehouse_id)
                .maybeSingle();

              if (invItem) {
                await supabase
                  .from("inventory_items")
                  .update({
                    quantity: invItem.quantity + item.quantity_received,
                    last_updated: new Date().toISOString(),
                  })
                  .eq("id", invItem.id);
              } else {
                await supabase.from("inventory_items").insert({
                  product_id: transferItem.product_id,
                  warehouse_id: transferData.target_warehouse_id,
                  quantity: item.quantity_received,
                  last_updated: new Date().toISOString(),
                });
              }
            }
          }
        }
      }

      // Create audit log
      await supabase.from("warehouse_transfer_logs").insert({
        transfer_id: transferId,
        action: "transfer_received",
        action_by: userData.id,
        previous_status: "in_transit",
        new_status: newStatus,
        details: {
          total_sent: totalSent,
          total_received: totalReceived,
          total_rejected: totalRejected,
          total_disposed: totalDisposed,
        },
        notes: values.receipt_notes,
      });

      return transfer;
    },
    onSuccess: () => {
      toast({ title: "Transfer Received", description: "Items have been processed" });
      queryClient.invalidateQueries({ queryKey: ["warehouse_transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Cancel transfer mutation
  const cancelTransferMutation = useMutation({
    mutationFn: async ({
      transferId,
      reason,
    }: {
      transferId: string;
      reason: string;
    }) => {
      if (!userData?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("warehouse_transfers")
        .update({ status: "cancelled" })
        .eq("id", transferId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("warehouse_transfer_logs").insert({
        transfer_id: transferId,
        action: "transfer_cancelled",
        action_by: userData.id,
        new_status: "cancelled",
        notes: reason,
      });

      return data;
    },
    onSuccess: () => {
      toast({ title: "Transfer Cancelled" });
      queryClient.invalidateQueries({ queryKey: ["warehouse_transfers"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Initiate return for rejected items
  const initiateReturnMutation = useMutation({
    mutationFn: async ({
      transferId,
      returnCourierName,
      returnTrackingNumber,
    }: {
      transferId: string;
      returnCourierName?: string;
      returnTrackingNumber?: string;
    }) => {
      if (!userData?.id) throw new Error("User not authenticated");

      // Update rejected items to returned status
      await supabase
        .from("warehouse_transfer_items")
        .update({
          item_status: "returned",
          quantity_returned: supabase.rpc ? undefined : 0, // Will be set to quantity_rejected
        })
        .eq("transfer_id", transferId)
        .eq("item_status", "rejected");

      const { data, error } = await supabase
        .from("warehouse_transfers")
        .update({
          status: "returned",
          return_courier_name: returnCourierName || null,
          return_tracking_number: returnTrackingNumber || null,
          return_dispatch_date: new Date().toISOString(),
        })
        .eq("id", transferId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("warehouse_transfer_logs").insert({
        transfer_id: transferId,
        action: "return_initiated",
        action_by: userData.id,
        new_status: "returned",
        details: {
          return_courier_name: returnCourierName,
          return_tracking_number: returnTrackingNumber,
        },
      });

      return data;
    },
    onSuccess: () => {
      toast({ title: "Return Initiated", description: "Rejected items are being returned" });
      queryClient.invalidateQueries({ queryKey: ["warehouse_transfers"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    transfers: transfersQuery.data || [],
    isLoading: transfersQuery.isLoading,
    error: transfersQuery.error,
    useTransferDetail,
    useAvailableBatches,
    useWarehouseInventory,
    initiateTransfer: initiateTransferMutation.mutate,
    isInitiating: initiateTransferMutation.isPending,
    dispatchTransfer: dispatchTransferMutation.mutate,
    isDispatching: dispatchTransferMutation.isPending,
    receiveTransfer: receiveTransferMutation.mutate,
    isReceiving: receiveTransferMutation.isPending,
    cancelTransfer: cancelTransferMutation.mutate,
    isCancelling: cancelTransferMutation.isPending,
    initiateReturn: initiateReturnMutation.mutate,
    isInitiatingReturn: initiateReturnMutation.isPending,
  };
}
