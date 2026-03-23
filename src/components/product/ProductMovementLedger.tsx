import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, SlidersHorizontal, Loader2 } from "lucide-react";

interface ProductMovementLedgerProps {
  productId: string;
  productName: string;
}

interface MovementRow {
  id: string;
  transaction_date: string;
  type: string;
  quantity: number;
  unit_price: number | null;
  currency: string | null;
  reference: string | null;
  notes: string | null;
  approval_status: string | null;
  delivery_status: string | null;
  source_warehouse: { name: string } | null;
  target_warehouse: { name: string } | null;
  product_skus: { sku_code: string } | null;
  batch_id: string | null;
  user_id: string;
  user_name?: string;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  check_in: { label: "Check In", icon: ArrowDownToLine, color: "bg-green-100 text-green-800" },
  check_out: { label: "Check Out", icon: ArrowUpFromLine, color: "bg-orange-100 text-orange-800" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, color: "bg-blue-100 text-blue-800" },
  adjustment: { label: "Adjustment", icon: SlidersHorizontal, color: "bg-purple-100 text-purple-800" },
};

const ProductMovementLedger = ({ productId, productName }: ProductMovementLedgerProps) => {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["product-movement-ledger", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          id, transaction_date, type, quantity, unit_price, currency,
          reference, notes, approval_status, delivery_status,
          batch_id, user_id,
          source_warehouse:source_warehouse_id(name),
          target_warehouse:target_warehouse_id(name),
          product_skus:sku_id(sku_code)
        `)
        .eq("product_id", productId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => { userMap[p.id] = p.full_name; });
      }

      return (data || []).map((row: any) => ({
        ...row,
        user_name: userMap[row.user_id] || "Unknown",
      })) as MovementRow[];
    },
  });

  // Calculate running balance
  const movementsWithBalance = [...movements].reverse().reduce<(MovementRow & { balance: number })[]>((acc, row) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    let change = 0;
    if (row.type === "check_in") change = row.quantity;
    else if (row.type === "check_out") change = -row.quantity;
    else if (row.type === "adjustment") change = row.quantity; // can be negative
    // transfers: source side = negative, target side = positive — handled by sign of quantity or separate rows
    // For now, transfers show quantity as-is (the DB may store separate rows for source/target)
    else if (row.type === "transfer") change = -row.quantity;
    acc.push({ ...row, balance: prev + change });
    return acc;
  }, []).reverse();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Product Movement Ledger</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete history of all inventory movements for {productName}
        </p>
      </CardHeader>
      <CardContent>
        {movementsWithBalance.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No inventory movements recorded for this product yet.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Qty In</TableHead>
                  <TableHead className="text-right">Qty Out</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsWithBalance.map((row) => {
                  const cfg = typeConfig[row.type] || typeConfig.adjustment;
                  const Icon = cfg.icon;
                  const isIn = row.type === "check_in";
                  const isOut = row.type === "check_out" || row.type === "transfer";

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(row.transaction_date), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.product_skus?.sku_code || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.type === "check_in" && (row.target_warehouse?.name || "-")}
                        {row.type === "check_out" && (row.source_warehouse?.name || "-")}
                        {row.type === "transfer" && (
                          <span>
                            {row.source_warehouse?.name || "?"} → {row.target_warehouse?.name || "?"}
                          </span>
                        )}
                        {row.type === "adjustment" && (row.source_warehouse?.name || row.target_warehouse?.name || "-")}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-700">
                        {isIn ? row.quantity : ""}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-700">
                        {isOut ? row.quantity : row.type === "adjustment" && row.quantity < 0 ? Math.abs(row.quantity) : ""}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.balance}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.unit_price != null ? `${row.currency || ""} ${row.unit_price.toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell className="text-xs">{row.reference || "-"}</TableCell>
                      <TableCell>
                        {row.type === "check_out" && row.approval_status ? (
                          <Badge variant={
                            row.approval_status === "approved" ? "default" :
                            row.approval_status === "rejected" ? "destructive" : "secondary"
                          } className="text-xs">
                            {row.approval_status}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-xs">{row.user_name}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{row.notes || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductMovementLedger;
