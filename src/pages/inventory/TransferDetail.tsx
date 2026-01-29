import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useWarehouseTransfers } from "@/hooks/useWarehouseTransfers";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import {
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  Package,
  Truck,
  User,
  XCircle,
  Trash2,
  RotateCcw,
  FileText,
} from "lucide-react";
import {
  TRANSFER_STATUS_LABELS,
  TRANSFER_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  type TransferStatus,
  type TransferItemStatus,
  type WarehouseTransferLog,
} from "@/types/transfer";

export default function TransferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { useTransferDetail } = useWarehouseTransfers();
  
  const { data: transfer, isLoading, error } = useTransferDetail(id);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "transfer_initiated":
        return <ArrowRightLeft className="h-4 w-4" />;
      case "transfer_dispatched":
        return <Truck className="h-4 w-4" />;
      case "transfer_received":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "item_rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "item_disposed":
        return <Trash2 className="h-4 w-4 text-gray-500" />;
      case "return_initiated":
        return <RotateCcw className="h-4 w-4 text-purple-500" />;
      case "transfer_cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getItemStatusBadge = (status: TransferItemStatus) => {
    const colors: Record<TransferItemStatus, string> = {
      pending: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      partial_accepted: "bg-yellow-100 text-yellow-800",
      rejected: "bg-red-100 text-red-800",
      disposed: "bg-gray-100 text-gray-800",
      returned: "bg-purple-100 text-purple-800",
    };

    return (
      <Badge className={colors[status]}>
        {ITEM_STATUS_LABELS[status]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Transfer not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/inventory/transfers")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transfers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const logs = (transfer as any).logs as WarehouseTransferLog[] || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/inventory/transfers")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={`Transfer: ${transfer.transfer_number}`}
          description="View transfer details, items, and audit log"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Transfer Details
                </CardTitle>
                <Badge
                  className={TRANSFER_STATUS_COLORS[transfer.status as TransferStatus]}
                >
                  {TRANSFER_STATUS_LABELS[transfer.status as TransferStatus]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> From
                  </p>
                  <p className="font-medium">{transfer.source_warehouse?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> To
                  </p>
                  <p className="font-medium">{transfer.target_warehouse?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Initiated By
                  </p>
                  <p className="font-medium">{transfer.initiator?.full_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date
                  </p>
                  <p className="font-medium">
                    {format(new Date(transfer.initiated_at), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>

              {transfer.initiation_notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p>{transfer.initiation_notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Courier Details */}
          {(transfer.courier_name || transfer.tracking_number) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Courier</p>
                    <p className="font-medium">{transfer.courier_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking #</p>
                    <p className="font-medium">{transfer.tracking_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected</p>
                    <p className="font-medium">
                      {transfer.expected_delivery_date
                        ? format(new Date(transfer.expected_delivery_date), "MMM dd, yyyy")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dispatched</p>
                    <p className="font-medium">
                      {transfer.dispatch_date
                        ? format(new Date(transfer.dispatch_date), "MMM dd, yyyy HH:mm")
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Return Courier Details */}
                {transfer.return_courier_name && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Return Shipment
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Courier</p>
                          <p className="font-medium">{transfer.return_courier_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tracking #</p>
                          <p className="font-medium">{transfer.return_tracking_number || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Dispatched</p>
                          <p className="font-medium">
                            {transfer.return_dispatch_date
                              ? format(new Date(transfer.return_dispatch_date), "MMM dd, yyyy")
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Transfer Items
              </CardTitle>
              <CardDescription>
                {transfer.items?.length || 0} item(s) in this transfer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead className="text-center">Sent</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-center">Rejected</TableHead>
                      <TableHead className="text-center">Disposed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfer.items?.map((item) => (
                      <React.Fragment key={item.id}>
                        <TableRow>
                          <TableCell className="font-medium">
                            {item.product?.name || "Unknown"}
                          </TableCell>
                          <TableCell>{item.batch_number}</TableCell>
                          <TableCell className="text-center">{item.quantity_sent}</TableCell>
                          <TableCell className="text-center">{item.quantity_received}</TableCell>
                          <TableCell className="text-center">{item.quantity_rejected}</TableCell>
                          <TableCell className="text-center">{item.quantity_disposed}</TableCell>
                          <TableCell>
                            {getItemStatusBadge(item.item_status as TransferItemStatus)}
                          </TableCell>
                        </TableRow>
                        {(item.rejection_reason || item.disposal_reason || item.condition_notes) && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={7} className="py-2">
                              <div className="text-sm space-y-1">
                                {item.rejection_reason && (
                                  <p>
                                    <span className="font-medium text-red-600">Rejection:</span>{" "}
                                    {item.rejection_reason}
                                  </p>
                                )}
                                {item.disposal_reason && (
                                  <p>
                                    <span className="font-medium text-gray-600">Disposal:</span>{" "}
                                    {item.disposal_reason}
                                  </p>
                                )}
                                {item.condition_notes && (
                                  <p>
                                    <span className="font-medium">Condition:</span>{" "}
                                    {item.condition_notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Log Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Audit Log
              </CardTitle>
              <CardDescription>
                Complete history of this transfer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity recorded yet
                </p>
              ) : (
                <Timeline>
                  {logs.map((log) => (
                    <TimelineItem key={log.id}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getActionIcon(log.action)}</div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">
                            {formatAction(log.action)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.actor?.full_name || "System"} •{" "}
                            {format(new Date(log.action_at), "MMM dd, yyyy HH:mm")}
                          </p>
                          {log.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {log.notes}
                            </p>
                          )}
                          {log.previous_status && log.new_status && (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {log.previous_status}
                              </Badge>
                              <span className="text-xs">→</span>
                              <Badge variant="outline" className="text-xs">
                                {log.new_status}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </CardContent>
          </Card>

          {/* Receipt Info */}
          {transfer.received_at && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Receipt Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Received By</p>
                  <p className="font-medium">{transfer.receiver?.full_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Received At</p>
                  <p className="font-medium">
                    {format(new Date(transfer.received_at), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
                {transfer.receipt_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{transfer.receipt_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
