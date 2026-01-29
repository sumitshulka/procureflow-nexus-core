import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGRNsForPO, usePODeliverySummary } from '@/hooks/useGRN';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, Eye, Package, CheckCircle, Clock, AlertTriangle, 
  TruckIcon, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/currencyUtils';
import type { PODeliverySummary } from '@/types/grn';

interface POGRNSectionProps {
  poId: string;
  currency?: string;
}

const POGRNSection: React.FC<POGRNSectionProps> = ({ poId, currency = 'USD' }) => {
  const navigate = useNavigate();
  const { data: grns = [], isLoading: loadingGRNs } = useGRNsForPO(poId);
  const { data: deliverySummary, isLoading: loadingSummary } = usePODeliverySummary(poId);

  const summary = deliverySummary as PODeliverySummary | undefined;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any }> = {
      draft: { className: 'bg-gray-100 text-gray-800', icon: Clock },
      pending_approval: { className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { className: 'bg-red-100 text-red-800', icon: AlertTriangle },
      cancelled: { className: 'bg-gray-100 text-gray-600', icon: AlertTriangle },
    };
    const config = variants[status] || variants.draft;
    const Icon = config.icon;
    return (
      <Badge className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getDeliveryStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any; label: string }> = {
      pending: { className: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Pending' },
      partially_received: { className: 'bg-blue-100 text-blue-800', icon: TruckIcon, label: 'Partially Received' },
      fully_received: { className: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Fully Received' },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const receiptProgress = summary 
    ? Math.round((summary.total_received / summary.total_ordered) * 100) 
    : 0;

  if (loadingGRNs || loadingSummary) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Goods Receipt
        </CardTitle>
        <Button size="sm" onClick={() => navigate(`/grn/create?po=${poId}`)}>
          <Plus className="h-4 w-4 mr-2" />
          Create GRN
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Summary */}
        {summary && (
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Delivery Status</span>
              {getDeliveryStatusBadge(summary.delivery_status)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Receipt Progress</span>
                <span className="font-medium">{summary.total_received} / {summary.total_ordered} items</span>
              </div>
              <Progress value={receiptProgress} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Ordered</p>
                <p className="text-lg font-semibold">{summary.total_ordered}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Received</p>
                <p className="text-lg font-semibold text-green-600">{summary.total_received}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Pending</p>
                <p className="text-lg font-semibold text-orange-600">{summary.total_pending}</p>
              </div>
            </div>
          </div>
        )}

        {/* GRN List */}
        {grns.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No goods received yet</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate(`/grn/create?po=${poId}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Record First Receipt
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN Number</TableHead>
                <TableHead>Receipt Date</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Received By</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grns.map((grn: any) => {
                const totalAccepted = grn.items?.reduce((sum: number, item: any) => sum + item.quantity_accepted, 0) || 0;
                return (
                  <TableRow key={grn.id}>
                    <TableCell className="font-medium">{grn.grn_number}</TableCell>
                    <TableCell>{format(new Date(grn.receipt_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{grn.warehouse?.name || '-'}</TableCell>
                    <TableCell>{grn.receiver?.full_name || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{totalAccepted}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(grn.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/grn/${grn.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default POGRNSection;
