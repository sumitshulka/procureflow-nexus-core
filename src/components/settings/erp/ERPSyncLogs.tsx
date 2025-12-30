import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, RefreshCw, Eye } from "lucide-react";
import { format } from "date-fns";

const ERPSyncLogs = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: integrations } = useQuery({
    queryKey: ["erp-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("erp_integrations")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ["erp-sync-logs", statusFilter, entityFilter],
    queryFn: async () => {
      let query = supabase
        .from("erp_sync_logs")
        .select("*, erp_integrations(name)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pending" | "in_progress" | "success" | "failed" | "partial");
      }
      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter as "invoice" | "purchase_order" | "vendor" | "product");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      success: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      in_progress: { variant: "outline", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      partial: { variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getEntityBadge = (entityType: string) => {
    const colors: Record<string, string> = {
      invoice: "bg-blue-100 text-blue-800",
      purchase_order: "bg-green-100 text-green-800",
      vendor: "bg-purple-100 text-purple-800",
      product: "bg-orange-100 text-orange-800",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[entityType] || "bg-gray-100 text-gray-800"}`}>
        {entityType.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="invoice">Invoices</SelectItem>
            <SelectItem value="purchase_order">Purchase Orders</SelectItem>
            <SelectItem value="vendor">Vendors</SelectItem>
            <SelectItem value="product">Products</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading sync logs...
          </CardContent>
        </Card>
      ) : !logs?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No sync logs found. Logs will appear here after syncing data with your ERP.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Integration</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ERP Ref</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(log.erp_integrations as any)?.name || "Unknown"}
                  </TableCell>
                  <TableCell>{getEntityBadge(log.entity_type)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.entity_reference || log.entity_id?.slice(0, 8)}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="text-sm">
                    {log.erp_reference_number || log.erp_reference_id || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.duration_ms ? `${log.duration_ms}ms` : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.created_at), "PPpp")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity Type</p>
                  <div className="mt-1">{getEntityBadge(selectedLog.entity_type)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity Reference</p>
                  <p className="font-mono">{selectedLog.entity_reference || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ERP Reference</p>
                  <p className="font-mono">
                    {selectedLog.erp_reference_number || selectedLog.erp_reference_id || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Response Code</p>
                  <p>{selectedLog.response_code || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p>{selectedLog.duration_ms ? `${selectedLog.duration_ms}ms` : "-"}</p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Error Message</p>
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {selectedLog.request_payload && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Request Payload</p>
                  <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.request_payload, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.response_payload && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Response Payload</p>
                  <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.response_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ERPSyncLogs;
