import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { PackageCheck, Loader2 } from 'lucide-react';

interface Props {
  poId: string;
  /** When true, render without an outer Card wrapper (for embedding inside another card). */
  embedded?: boolean;
}

const statusVariant: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const VendorPOGRNList: React.FC<Props> = ({ poId, embedded = false }) => {
  const { data: grns, isLoading } = useQuery({
    queryKey: ['vendor-po-grns', poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goods_received_notes')
        .select(`
          id,
          grn_number,
          receipt_date,
          status,
          remarks,
          discrepancies,
          is_published_to_vendor,
          published_at,
          grn_items(id, description, quantity_ordered, quantity_received, quantity_accepted, quantity_rejected, unit_price, total_value)
        `)
        .eq('purchase_order_id', poId)
        .eq('is_published_to_vendor', true)
        .order('receipt_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!poId,
  });

  const body = (
    <>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading goods receipts...
        </div>
      ) : !grns || grns.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No goods receipts have been published for this purchase order yet.
        </p>
      ) : (
        <div className="space-y-4">
          {grns.map((grn) => (
            <div key={grn.id} className="border rounded-lg p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold">{grn.grn_number}</p>
                  <p className="text-xs text-muted-foreground">
                    Received on {format(new Date(grn.receipt_date), 'PPP')}
                  </p>
                </div>
                <Badge className={statusVariant[grn.status] || 'bg-muted'}>
                  {grn.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>

              {grn.grn_items && grn.grn_items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-2">Item</th>
                        <th className="text-center py-2 px-2">Ordered</th>
                        <th className="text-center py-2 px-2">Received</th>
                        <th className="text-center py-2 px-2">Accepted</th>
                        <th className="text-center py-2 pl-2">Rejected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grn.grn_items.map((it: any) => (
                        <tr key={it.id} className="border-b last:border-0">
                          <td className="py-2 pr-2">{it.description}</td>
                          <td className="text-center py-2 px-2">{it.quantity_ordered}</td>
                          <td className="text-center py-2 px-2">{it.quantity_received}</td>
                          <td className="text-center py-2 px-2 text-green-600 font-medium">
                            {it.quantity_accepted}
                          </td>
                          <td className="text-center py-2 pl-2 text-red-600">
                            {it.quantity_rejected}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(grn.discrepancies || grn.remarks) && (
                <div className="text-xs space-y-1">
                  {grn.discrepancies && (
                    <p><span className="font-medium">Discrepancies: </span>{grn.discrepancies}</p>
                  )}
                  {grn.remarks && (
                    <p><span className="font-medium">Remarks: </span>{grn.remarks}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5" /> Goods Receipts
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
};

export default VendorPOGRNList;
