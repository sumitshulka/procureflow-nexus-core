// Warehouse Transfer Types

export type TransferStatus = 
  | 'initiated' 
  | 'in_transit' 
  | 'received' 
  | 'partial_received' 
  | 'rejected' 
  | 'returned' 
  | 'cancelled';

export type TransferItemStatus = 
  | 'pending' 
  | 'accepted' 
  | 'partial_accepted' 
  | 'rejected' 
  | 'disposed' 
  | 'returned';

export interface WarehouseTransfer {
  id: string;
  transfer_number: string;
  source_warehouse_id: string;
  target_warehouse_id: string;
  status: TransferStatus;
  
  // Initiation details
  initiated_by: string;
  initiated_at: string;
  initiation_notes?: string;
  
  // Courier/Delivery details (outbound)
  courier_name?: string;
  tracking_number?: string;
  expected_delivery_date?: string;
  dispatch_date?: string;
  
  // Receipt details
  received_by?: string;
  received_at?: string;
  receipt_notes?: string;
  
  // Return courier details
  return_courier_name?: string;
  return_tracking_number?: string;
  return_dispatch_date?: string;
  return_received_at?: string;
  return_received_by?: string;
  
  // Attachments
  attachments?: TransferAttachment[];
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  source_warehouse?: { id: string; name: string };
  target_warehouse?: { id: string; name: string };
  initiator?: { id: string; full_name: string; email: string };
  receiver?: { id: string; full_name: string; email: string };
  items?: WarehouseTransferItem[];
}

export interface WarehouseTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  batch_number?: string | null; // Optional - not all products have batches
  expiry_date?: string;
  unit_price?: number;
  currency?: string;
  
  // Quantities
  quantity_sent: number;
  quantity_received: number;
  quantity_rejected: number;
  quantity_disposed: number;
  quantity_returned: number;
  
  // Status and reasons
  item_status: TransferItemStatus;
  rejection_reason?: string;
  disposal_reason?: string;
  condition_notes?: string;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  product?: { id: string; name: string; sku?: string };
}

export interface WarehouseTransferLog {
  id: string;
  transfer_id: string;
  transfer_item_id?: string;
  action: string;
  action_by: string;
  action_at: string;
  previous_status?: string;
  new_status?: string;
  details?: Record<string, any>;
  ip_address?: string;
  notes?: string;
  
  // Joined data
  actor?: { id: string; full_name: string; email: string };
}

export interface TransferAttachment {
  id: string;
  name: string;
  url: string;
  type: 'delivery_note' | 'photo' | 'signed_receipt' | 'other';
  uploaded_by: string;
  uploaded_at: string;
}

export interface TransferInitiateFormValues {
  source_warehouse_id: string;
  target_warehouse_id: string;
  courier_name?: string;
  tracking_number?: string;
  expected_delivery_date?: Date;
  initiation_notes?: string;
  items: TransferItemInput[];
}

export interface TransferItemInput {
  product_id: string;
  product_name: string;
  batch_number?: string | null; // Optional - not all products have batches
  expiry_date?: string | null;
  quantity: number;
  available_quantity: number;
  unit_price?: number;
  currency?: string;
}

export interface TransferReceiveFormValues {
  receipt_notes?: string;
  items: TransferReceiveItemInput[];
}

export interface TransferReceiveItemInput {
  item_id: string;
  product_name: string;
  batch_number?: string | null; // Optional - not all products have batches
  quantity_sent: number;
  quantity_received: number;
  quantity_rejected: number;
  quantity_disposed: number;
  rejection_reason?: string;
  disposal_reason?: string;
  condition_notes?: string;
}

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  initiated: 'Initiated',
  in_transit: 'In Transit',
  received: 'Received',
  partial_received: 'Partially Received',
  rejected: 'Rejected',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

export const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
  initiated: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  partial_received: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
  returned: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export const ITEM_STATUS_LABELS: Record<TransferItemStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  partial_accepted: 'Partially Accepted',
  rejected: 'Rejected',
  disposed: 'Disposed',
  returned: 'Returned',
};
