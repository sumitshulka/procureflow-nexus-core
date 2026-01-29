// GRN (Goods Received Note) Types

export type GRNStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';

export interface GRN {
  id: string;
  grn_number: string;
  purchase_order_id: string;
  vendor_id: string;
  receipt_date: string;
  warehouse_id: string | null;
  received_by: string;
  status: GRNStatus;
  approved_by: string | null;
  approved_at: string | null;
  approval_comments: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  remarks: string | null;
  discrepancies: string | null;
  attachments: any[];
  is_published_to_vendor: boolean;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  purchase_order?: {
    po_number: string;
    final_amount: number;
    currency: string;
  };
  vendor?: {
    company_name: string;
  };
  warehouse?: {
    name: string;
  };
  receiver?: {
    full_name: string;
  };
  items?: GRNItem[];
}

export interface GRNItem {
  id: string;
  grn_id: string;
  po_item_id: string;
  product_id: string | null;
  quantity_ordered: number;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  unit_price: number;
  total_value: number;
  description: string;
  batch_number: string | null;
  serial_numbers: string[] | null;
  expiry_date: string | null;
  condition_remarks: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  product?: {
    name: string;
  };
}

export interface GRNInvoiceLink {
  id: string;
  grn_id: string;
  invoice_id: string;
  linked_by: string;
  linked_at: string;
  notes: string | null;
}

export interface MatchingSettings {
  id: string;
  price_tolerance_percentage: number;
  quantity_tolerance_percentage: number;
  tax_tolerance_percentage: number;
  total_tolerance_percentage: number;
  strict_matching_mode: boolean;
  allow_over_receipt: boolean;
  require_grn_for_invoice: boolean;
  auto_approve_matched: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface POItemReceiptStatus {
  po_item_id: string;
  po_id: string;
  product_id: string | null;
  description: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_pending: number;
  unit_price: number;
  ordered_value: number;
  received_value: number;
}

export interface PODeliverySummary {
  po_id: string;
  po_number: string;
  vendor_id: string;
  po_status: string;
  po_value: number;
  grn_count: number;
  total_ordered: number;
  total_received: number;
  total_pending: number;
  delivery_status: 'pending' | 'partially_received' | 'fully_received';
}

export interface ThreeWayMatchResult {
  invoice_id: string;
  invoice_number: string;
  vendor_id: string;
  purchase_order_id: string;
  invoice_amount: number;
  po_number: string;
  po_amount: number;
  grn_value: number;
  linked_grn_count: number;
  po_variance: number;
  grn_variance: number;
  po_variance_percent: number;
  grn_variance_percent: number;
}

export interface CreateGRNInput {
  purchase_order_id: string;
  warehouse_id: string;
  receipt_date: string;
  remarks?: string;
  discrepancies?: string;
  items: CreateGRNItemInput[];
}

export interface CreateGRNItemInput {
  po_item_id: string;
  product_id: string | null;
  quantity_ordered: number;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  unit_price: number;
  description: string;
  batch_number?: string;
  serial_numbers?: string[];
  expiry_date?: string;
  condition_remarks?: string;
  rejection_reason?: string;
}
