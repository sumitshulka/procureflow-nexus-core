import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { GRN, CreateGRNInput, PODeliverySummary, MatchingSettings } from '@/types/grn';

export const useGRNList = (filters?: { status?: string; poId?: string }) => {
  return useQuery({
    queryKey: ['grns', filters],
    queryFn: async () => {
      let query = supabase
        .from('goods_received_notes')
        .select(`
          *,
          purchase_order:purchase_orders(po_number, final_amount, currency),
          vendor:vendor_registrations(company_name),
          warehouse:warehouses(name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status as any);
      }
      if (filters?.poId) {
        query = query.eq('purchase_order_id', filters.poId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch receiver names separately
      if (data && data.length > 0) {
        const receiverIds = [...new Set(data.map((g: any) => g.received_by))];
        const { data: receivers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', receiverIds);
        
        const receiverMap = new Map(receivers?.map((r: any) => [r.id, r.full_name]) || []);
        return data.map((grn: any) => ({
          ...grn,
          receiver: { full_name: receiverMap.get(grn.received_by) || 'Unknown' }
        })) as GRN[];
      }
      
      return data as GRN[];
    },
  });
};

export const useGRNDetail = (id: string) => {
  return useQuery({
    queryKey: ['grn', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goods_received_notes')
        .select(`
          *,
          purchase_order:purchase_orders(po_number, final_amount, currency, vendor_id),
          vendor:vendor_registrations(company_name, primary_email),
          warehouse:warehouses(name),
          items:grn_items(
            *,
            product:products(name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Fetch receiver name
      if (data?.received_by) {
        const { data: receiver } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.received_by)
          .single();
        
        return {
          ...data,
          receiver: receiver || { full_name: 'Unknown' }
        } as GRN;
      }
      
      return data as GRN;
    },
    enabled: !!id,
  });
};

export const usePOItemsForGRN = (poId: string) => {
  return useQuery({
    queryKey: ['po-items-for-grn', poId],
    queryFn: async () => {
      // First get the PO items with their receipt status
      const { data: poItems, error: poError } = await supabase
        .from('purchase_order_items')
        .select(`
          id,
          po_id,
          product_id,
          description,
          quantity,
          unit_price,
          total_price,
          product:products(name)
        `)
        .eq('po_id', poId);

      if (poError) throw poError;

      // Get receipt status for each item
      const { data: receiptStatus, error: statusError } = await supabase
        .from('po_item_receipt_status')
        .select('*')
        .eq('po_id', poId);

      if (statusError) throw statusError;

      // Merge the data
      return poItems.map((item: any) => {
        const status = receiptStatus?.find((s: any) => s.po_item_id === item.id);
        return {
          ...item,
          quantity_ordered: item.quantity,
          quantity_received: status?.quantity_received || 0,
          quantity_pending: status?.quantity_pending || item.quantity,
        };
      });
    },
    enabled: !!poId,
  });
};

export const usePODeliverySummary = (poId?: string) => {
  return useQuery({
    queryKey: ['po-delivery-summary', poId],
    queryFn: async () => {
      if (poId) {
        const { data, error } = await supabase
          .from('po_delivery_summary')
          .select('*')
          .eq('po_id', poId)
          .single();

        if (error) throw error;
        return data as PODeliverySummary;
      } else {
        const { data, error } = await supabase
          .from('po_delivery_summary')
          .select('*');

        if (error) throw error;
        return data as PODeliverySummary[];
      }
    },
  });
};

export const useMatchingSettings = () => {
  return useQuery({
    queryKey: ['matching-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matching_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as MatchingSettings;
    },
  });
};

export const useCreateGRN = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateGRNInput) => {
      // Generate GRN number
      const { data: grnNumber, error: numError } = await supabase
        .rpc('generate_grn_number');
      
      if (numError) throw numError;

      // Get vendor_id from PO
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('vendor_id')
        .eq('id', input.purchase_order_id)
        .single();

      if (poError) throw poError;

      // Create GRN
      const { data: grn, error: grnError } = await supabase
        .from('goods_received_notes')
        .insert({
          grn_number: grnNumber,
          purchase_order_id: input.purchase_order_id,
          vendor_id: po.vendor_id,
          warehouse_id: input.warehouse_id,
          receipt_date: input.receipt_date,
          received_by: user?.id,
          created_by: user?.id,
          remarks: input.remarks,
          discrepancies: input.discrepancies,
          status: 'draft',
        })
        .select()
        .single();

      if (grnError) throw grnError;

      // Create GRN items
      const grnItems = input.items.map(item => ({
        grn_id: grn.id,
        po_item_id: item.po_item_id,
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered,
        quantity_received: item.quantity_received,
        quantity_accepted: item.quantity_accepted,
        quantity_rejected: item.quantity_rejected,
        unit_price: item.unit_price,
        total_value: item.quantity_accepted * item.unit_price,
        description: item.description,
        batch_number: item.batch_number,
        serial_numbers: item.serial_numbers,
        expiry_date: item.expiry_date,
        condition_remarks: item.condition_remarks,
        rejection_reason: item.rejection_reason,
      }));

      const { error: itemsError } = await supabase
        .from('grn_items')
        .insert(grnItems);

      if (itemsError) throw itemsError;

      return grn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['po-delivery-summary'] });
      toast({
        title: 'Success',
        description: 'GRN created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create GRN',
        variant: 'destructive',
      });
    },
  });
};

export const useSubmitGRNForApproval = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (grnId: string) => {
      const { data, error } = await supabase
        .from('goods_received_notes')
        .update({ status: 'pending_approval' })
        .eq('id', grnId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn'] });
      toast({
        title: 'Success',
        description: 'GRN submitted for approval',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit GRN',
        variant: 'destructive',
      });
    },
  });
};

export const useApproveGRN = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ grnId, comments }: { grnId: string; comments?: string }) => {
      const { data, error } = await supabase
        .from('goods_received_notes')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          approval_comments: comments,
        })
        .eq('id', grnId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn'] });
      queryClient.invalidateQueries({ queryKey: ['po-delivery-summary'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: 'Success',
        description: 'GRN approved and inventory updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve GRN',
        variant: 'destructive',
      });
    },
  });
};

export const useRejectGRN = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ grnId, reason }: { grnId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('goods_received_notes')
        .update({
          status: 'rejected',
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', grnId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn'] });
      toast({
        title: 'GRN Rejected',
        description: 'The GRN has been rejected',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject GRN',
        variant: 'destructive',
      });
    },
  });
};

export const usePublishGRNToVendor = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (grnId: string) => {
      const { data, error } = await supabase
        .from('goods_received_notes')
        .update({
          is_published_to_vendor: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', grnId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn'] });
      toast({
        title: 'Success',
        description: 'GRN published to vendor portal',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to publish GRN',
        variant: 'destructive',
      });
    },
  });
};

export const useLinkGRNToInvoice = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ grnId, invoiceId, notes }: { grnId: string; invoiceId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('grn_invoice_links')
        .insert({
          grn_id: grnId,
          invoice_id: invoiceId,
          linked_by: user?.id,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn-invoice-links'] });
      queryClient.invalidateQueries({ queryKey: ['three-way-match'] });
      toast({
        title: 'Success',
        description: 'GRN linked to invoice',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link GRN to invoice',
        variant: 'destructive',
      });
    },
  });
};

export const useThreeWayMatchResults = (invoiceId?: string) => {
  return useQuery({
    queryKey: ['three-way-match', invoiceId],
    queryFn: async () => {
      if (invoiceId) {
        const { data, error } = await supabase
          .from('three_way_match_results')
          .select('*')
          .eq('invoice_id', invoiceId)
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('three_way_match_results')
          .select('*');

        if (error) throw error;
        return data;
      }
    },
  });
};

export const useGRNsForPO = (poId: string) => {
  return useQuery({
    queryKey: ['grns-for-po', poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goods_received_notes')
        .select(`
          *,
          warehouse:warehouses(name),
          items:grn_items(*)
        `)
        .eq('purchase_order_id', poId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch receiver names separately
      if (data && data.length > 0) {
        const receiverIds = [...new Set(data.map((g: any) => g.received_by))];
        const { data: receivers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', receiverIds);
        
        const receiverMap = new Map(receivers?.map((r: any) => [r.id, r.full_name]) || []);
        return data.map((grn: any) => ({
          ...grn,
          receiver: { full_name: receiverMap.get(grn.received_by) || 'Unknown' }
        })) as GRN[];
      }
      
      return data as GRN[];
    },
    enabled: !!poId,
  });
};

export const useGRNsForInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: ['grns-for-invoice', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grn_invoice_links')
        .select(`
          *,
          grn:goods_received_notes(
            *,
            items:grn_items(*)
          )
        `)
        .eq('invoice_id', invoiceId);

      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
};
