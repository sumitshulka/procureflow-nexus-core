
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/common/DataTable";
import { format } from "date-fns";
import { Search, TrendingUp } from "lucide-react";

interface PriceHistoryData {
  id: string;
  product_name: string;
  price: number;
  currency: string;
  effective_date: string;
  source_type: string;
  purchase_order_number?: string;
  notes?: string;
  created_by_name?: string;
}

const ProductPriceHistory = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data: priceHistory = [], isLoading } = useQuery({
    queryKey: ["product_price_history", searchTerm, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("product_price_history")
        .select(`
          *,
          product:product_id(name),
          purchase_order:purchase_order_id(po_number),
          creator:created_by(full_name)
        `)
        .order("effective_date", { ascending: false });

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch price history",
          variant: "destructive",
        });
        throw error;
      }

      let transformedData = data.map((item: any) => ({
        id: item.id,
        product_name: item.product?.name || "Unknown Product",
        price: item.price,
        currency: item.currency,
        effective_date: item.effective_date,
        source_type: item.source_type,
        purchase_order_number: item.purchase_order?.po_number,
        notes: item.notes,
        created_by_name: item.creator?.full_name || "Unknown User",
      }));

      // Apply filters
      if (searchTerm) {
        transformedData = transformedData.filter((item: PriceHistoryData) =>
          item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (sourceFilter && sourceFilter !== "all") {
        transformedData = transformedData.filter((item: PriceHistoryData) =>
          item.source_type === sourceFilter
        );
      }

      return transformedData as PriceHistoryData[];
    },
  });

  const columns = [
    {
      id: "product_name",
      header: "Product",
      cell: (row: PriceHistoryData) => (
        <div className="font-medium">{row.product_name}</div>
      ),
    },
    {
      id: "price",
      header: "Price",
      cell: (row: PriceHistoryData) => (
        <div className="text-right font-mono">
          {row.currency} {row.price.toLocaleString()}
        </div>
      ),
    },
    {
      id: "effective_date",
      header: "Effective Date",
      cell: (row: PriceHistoryData) => (
        <div>{format(new Date(row.effective_date), "MMM dd, yyyy")}</div>
      ),
    },
    {
      id: "source_type",
      header: "Source",
      cell: (row: PriceHistoryData) => (
        <div className="capitalize">
          {row.source_type.replace("_", " ")}
        </div>
      ),
    },
    {
      id: "purchase_order_number",
      header: "PO Number",
      cell: (row: PriceHistoryData) => (
        <div>{row.purchase_order_number || "-"}</div>
      ),
    },
    {
      id: "created_by_name",
      header: "Created By",
      cell: (row: PriceHistoryData) => (
        <div>{row.created_by_name}</div>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      cell: (row: PriceHistoryData) => (
        <div className="max-w-xs truncate">{row.notes || "-"}</div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Product Price History"
        description="Track price changes and procurement history for all products"
        icon={<TrendingUp className="h-6 w-6" />}
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="purchase_order">Purchase Order</SelectItem>
              <SelectItem value="inventory_checkin">Inventory Check-in</SelectItem>
              <SelectItem value="manual">Manual Entry</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading price history...</div>
          ) : (
            <DataTable
              columns={columns}
              data={priceHistory}
              emptyMessage="No price history found."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductPriceHistory;
