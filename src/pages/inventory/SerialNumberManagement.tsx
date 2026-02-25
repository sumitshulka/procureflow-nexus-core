import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Hash, Package, Filter, Eye } from "lucide-react";
import { format } from "date-fns";

interface SerialRecord {
  id: string;
  serial_number: string;
  product_id: string;
  product_name: string;
  sku_code: string | null;
  batch_number: string | null;
  warehouse_name: string | null;
  status: string;
  received_date: string | null;
  checked_out_date: string | null;
}

const SerialNumberManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("_all");
  const [productFilter, setProductFilter] = useState("_all");
  const [selectedSerial, setSelectedSerial] = useState<SerialRecord | null>(null);

  // Fetch serial numbers with joins
  const { data: serials = [], isLoading } = useQuery({
    queryKey: ["serial-numbers", statusFilter, productFilter],
    queryFn: async () => {
      let query = supabase
        .from("serial_numbers")
        .select(`
          id,
          serial_number,
          product_id,
          status,
          received_date,
          checked_out_date,
          notes,
          batch_id,
          warehouse_id,
          sku_id
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (statusFilter !== "_all") {
        query = query.eq("status", statusFilter);
      }
      if (productFilter !== "_all") {
        query = query.eq("product_id", productFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Enrich with product names, SKU codes, batch numbers, warehouse names
      const productIds = [...new Set(data.map(s => s.product_id))];
      const warehouseIds = [...new Set(data.map(s => s.warehouse_id).filter(Boolean))];
      const batchIds = [...new Set(data.map(s => s.batch_id).filter(Boolean))];
      const skuIds = [...new Set(data.map(s => s.sku_id).filter(Boolean))];

      const [productsRes, warehousesRes, batchesRes, skusRes] = await Promise.all([
        supabase.from("products").select("id, name").in("id", productIds),
        warehouseIds.length > 0 ? supabase.from("warehouses").select("id, name").in("id", warehouseIds) : { data: [] },
        batchIds.length > 0 ? supabase.from("inventory_batches").select("id, batch_number").in("id", batchIds as string[]) : { data: [] },
        skuIds.length > 0 ? supabase.from("product_skus").select("id, sku_code").in("id", skuIds as string[]) : { data: [] },
      ]);

      const productMap = new Map((productsRes.data || []).map(p => [p.id, p.name]));
      const warehouseMap = new Map((warehousesRes.data || []).map(w => [w.id, w.name]));
      const batchMap = new Map((batchesRes.data || []).map(b => [b.id, b.batch_number]));
      const skuMap = new Map((skusRes.data || []).map(s => [s.id, s.sku_code]));

      return data.map(s => ({
        id: s.id,
        serial_number: s.serial_number,
        product_id: s.product_id,
        product_name: productMap.get(s.product_id) || "Unknown",
        sku_code: s.sku_id ? skuMap.get(s.sku_id) || null : null,
        batch_number: s.batch_id ? batchMap.get(s.batch_id) || null : null,
        warehouse_name: s.warehouse_id ? warehouseMap.get(s.warehouse_id) || null : null,
        status: s.status,
        received_date: s.received_date,
        checked_out_date: s.checked_out_date,
      })) as SerialRecord[];
    },
  });

  // Fetch products for filter
  const { data: products = [] } = useQuery({
    queryKey: ["products-with-serial-tracking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true)
        .in("tracking_type", ["serial", "batch_and_serial"])
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredSerials = serials.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.serial_number.toLowerCase().includes(q) ||
      s.product_name.toLowerCase().includes(q) ||
      (s.sku_code && s.sku_code.toLowerCase().includes(q)) ||
      (s.batch_number && s.batch_number.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      in_stock: { label: "In Stock", variant: "default" },
      checked_out: { label: "Checked Out", variant: "secondary" },
      in_transit: { label: "In Transit", variant: "outline" },
      returned: { label: "Returned", variant: "secondary" },
      defective: { label: "Defective", variant: "destructive" },
      scrapped: { label: "Scrapped", variant: "destructive" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // Summary stats
  const totalSerials = serials.length;
  const inStock = serials.filter(s => s.status === "in_stock").length;
  const checkedOut = serials.filter(s => s.status === "checked_out").length;
  const defective = serials.filter(s => s.status === "defective" || s.status === "scrapped").length;

  return (
    <div className="page-container">
      <PageHeader
        title="Serial Number Management"
        description="Track individual items by serial number across inventory"
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3 px-4"><div className="text-2xl font-bold">{totalSerials}</div><div className="text-sm text-muted-foreground">Total Serials</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><div className="text-2xl font-bold">{inStock}</div><div className="text-sm text-muted-foreground">In Stock</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><div className="text-2xl font-bold">{checkedOut}</div><div className="text-sm text-muted-foreground">Checked Out</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><div className="text-2xl font-bold">{defective}</div><div className="text-sm text-muted-foreground">Defective / Scrapped</div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by serial, product, SKU, batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Statuses</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="defective">Defective</SelectItem>
                <SelectItem value="scrapped">Scrapped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Products</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4" />
            Serial Numbers ({filteredSerials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredSerials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Hash className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No serial numbers found</p>
              <p className="text-xs mt-1">Serial numbers are created during inventory check-in for products with serial tracking enabled.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSerials.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSerial(s)}>
                    <TableCell className="font-mono font-medium">{s.serial_number}</TableCell>
                    <TableCell>{s.product_name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.sku_code || "-"}</TableCell>
                    <TableCell className="text-xs">{s.batch_number || "-"}</TableCell>
                    <TableCell>{s.warehouse_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    <TableCell className="text-sm">
                      {s.received_date ? format(new Date(s.received_date), "PP") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSerial} onOpenChange={() => setSelectedSerial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Serial: {selectedSerial?.serial_number}
            </DialogTitle>
          </DialogHeader>
          {selectedSerial && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Product:</span> <span className="font-medium">{selectedSerial.product_name}</span></div>
                <div><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{selectedSerial.sku_code || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Batch:</span> <span>{selectedSerial.batch_number || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Warehouse:</span> <span>{selectedSerial.warehouse_name || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {getStatusBadge(selectedSerial.status)}</div>
                <div><span className="text-muted-foreground">Received:</span> <span>{selectedSerial.received_date ? format(new Date(selectedSerial.received_date), "PPp") : "N/A"}</span></div>
                {selectedSerial.checked_out_date && (
                  <div><span className="text-muted-foreground">Checked Out:</span> <span>{format(new Date(selectedSerial.checked_out_date), "PPp")}</span></div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SerialNumberManagement;
