import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useWarehouseTransfers } from "@/hooks/useWarehouseTransfers";
import { TransferInitiateForm } from "@/components/inventory/transfer/TransferInitiateForm";
import { TransferReceiveDialog } from "@/components/inventory/transfer/TransferReceiveDialog";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRightLeft,
  Eye,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Send,
  Truck,
  X,
  PackageCheck,
} from "lucide-react";
import {
  TRANSFER_STATUS_LABELS,
  TRANSFER_STATUS_COLORS,
  type TransferStatus,
  type WarehouseTransfer,
} from "@/types/transfer";

export default function WarehouseTransfers() {
  const navigate = useNavigate();
  const {
    transfers,
    isLoading,
    useTransferDetail,
    dispatchTransfer,
    isDispatching,
    cancelTransfer,
    isCancelling,
  } = useWarehouseTransfers();

  const [showInitiateForm, setShowInitiateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "all">("all");
  
  // Receive dialog state
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | undefined>();
  
  // Dispatch dialog state
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [dispatchTransferId, setDispatchTransferId] = useState<string | undefined>();
  const [dispatchCourier, setDispatchCourier] = useState("");
  const [dispatchTracking, setDispatchTracking] = useState("");
  
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTransferId, setCancelTransferId] = useState<string | undefined>();
  const [cancelReason, setCancelReason] = useState("");

  // Fetch transfer detail for receiving
  const { data: selectedTransfer } = useTransferDetail(selectedTransferId);

  // Filter transfers
  const filteredTransfers = transfers.filter((transfer) => {
    const matchesSearch =
      transfer.transfer_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.source_warehouse?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.target_warehouse?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || transfer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDispatchConfirm = () => {
    if (!dispatchTransferId) return;
    dispatchTransfer(
      {
        transferId: dispatchTransferId,
        courierName: dispatchCourier || undefined,
        trackingNumber: dispatchTracking || undefined,
      },
      {
        onSuccess: () => {
          setDispatchDialogOpen(false);
          setDispatchTransferId(undefined);
          setDispatchCourier("");
          setDispatchTracking("");
        },
      }
    );
  };

  const handleCancelConfirm = () => {
    if (!cancelTransferId || !cancelReason.trim()) return;
    cancelTransfer(
      {
        transferId: cancelTransferId,
        reason: cancelReason,
      },
      {
        onSuccess: () => {
          setCancelDialogOpen(false);
          setCancelTransferId(undefined);
          setCancelReason("");
        },
      }
    );
  };

  const openReceiveDialog = (transferId: string) => {
    setSelectedTransferId(transferId);
    setReceiveDialogOpen(true);
  };

  if (showInitiateForm) {
    return (
      <div className="container mx-auto py-6">
        <TransferInitiateForm
          onSuccess={() => setShowInitiateForm(false)}
          onCancel={() => setShowInitiateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Warehouse Transfers"
        description="Manage inter-warehouse inventory transfers with batch tracking"
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Transfer History
              </CardTitle>
              <CardDescription>
                Track and manage all warehouse transfers
              </CardDescription>
            </div>
            <Button onClick={() => setShowInitiateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by transfer number or warehouse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as TransferStatus | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(TRANSFER_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transfers Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transfers found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer #</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Initiated</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">
                        {transfer.transfer_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{transfer.source_warehouse?.name || "Unknown"}</span>
                          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                          <span>{transfer.target_warehouse?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={TRANSFER_STATUS_COLORS[transfer.status as TransferStatus]}
                        >
                          {TRANSFER_STATUS_LABELS[transfer.status as TransferStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(transfer.initiated_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{transfer.courier_name || "-"}</TableCell>
                      <TableCell>{transfer.tracking_number || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/inventory/transfers/${transfer.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>

                            {transfer.status === "initiated" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDispatchTransferId(transfer.id);
                                    setDispatchCourier(transfer.courier_name || "");
                                    setDispatchTracking(transfer.tracking_number || "");
                                    setDispatchDialogOpen(true);
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Mark as Dispatched
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setCancelTransferId(transfer.id);
                                    setCancelDialogOpen(true);
                                  }}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Transfer
                                </DropdownMenuItem>
                              </>
                            )}

                            {transfer.status === "in_transit" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openReceiveDialog(transfer.id)}
                                >
                                  <PackageCheck className="h-4 w-4 mr-2" />
                                  Receive Transfer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receive Dialog */}
      <TransferReceiveDialog
        transfer={selectedTransfer as WarehouseTransfer | null}
        open={receiveDialogOpen}
        onOpenChange={(open) => {
          setReceiveDialogOpen(open);
          if (!open) setSelectedTransferId(undefined);
        }}
        onSuccess={() => setSelectedTransferId(undefined)}
      />

      {/* Dispatch Dialog */}
      <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Dispatch Transfer
            </DialogTitle>
            <DialogDescription>
              Mark this transfer as dispatched. Update courier details if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Courier Name</label>
              <Input
                placeholder="e.g., DHL, FedEx"
                value={dispatchCourier}
                onChange={(e) => setDispatchCourier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tracking Number</label>
              <Input
                placeholder="Enter tracking number"
                value={dispatchTracking}
                onChange={(e) => setDispatchTracking(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDispatchConfirm} disabled={isDispatching}>
              {isDispatching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm Dispatch
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Transfer</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this transfer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter cancellation reason..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Transfer
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling || !cancelReason.trim()}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancel"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
