
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import DataTable from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

// Interface for procurement request data
export interface ProcurementRequest {
  id: string;
  request_number: string;
  title: string;
  department: string | null;
  date_created: string;
  requester_name: string | null;
  items?: ProcurementRequestItem[];
}

export interface ProcurementRequestItem {
  id: string;
  product_id: string;
  quantity: number;
  product_name: string;
}

interface ProcurementRequestSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (request: ProcurementRequest) => void;
}

const ProcurementRequestSelector = ({
  isOpen,
  onOpenChange,
  onSelect
}: ProcurementRequestSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch approved procurement requests
  const { data: procurementRequests = [], isLoading } = useQuery({
    queryKey: ["procurement_requests_for_checkout"],
    queryFn: async () => {
      try {
        // First get the approved requests
        const { data: requests, error } = await supabase
          .from("procurement_request_details")
          .select("id, request_number, title, department, date_created, requester_name")
          .eq("status", "approved")
          .order("date_created", { ascending: false });
          
        if (error) throw error;
        
        // For each request, get its items with product details
        const requestsWithItems = await Promise.all(
          (requests || []).map(async (request) => {
            const { data: items, error: itemsError } = await supabase
              .from("procurement_request_items")
              .select(`
                id, 
                product_id, 
                quantity, 
                products:product_id(name)
              `)
              .eq("request_id", request.id);
              
            if (itemsError) {
              console.error("Error fetching request items:", itemsError);
              return {
                ...request,
                items: []
              };
            }
            
            // Format items with product name
            const formattedItems = items.map(item => ({
              id: item.id,
              product_id: item.product_id,
              quantity: item.quantity,
              product_name: item.products?.name || "Unknown product"
            }));
            
            return {
              ...request,
              items: formattedItems
            };
          })
        );
        
        return requestsWithItems as ProcurementRequest[];
      } catch (error) {
        console.error("Error fetching procurement requests:", error);
        return [];
      }
    },
    enabled: isOpen,
  });

  // Filter requests based on search term
  const filteredRequests = procurementRequests.filter(request =>
    request.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requester_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Define table columns
  const columns = [
    {
      id: "request_number",
      header: "Request #",
      cell: (row: ProcurementRequest) => <span className="font-medium">{row.request_number}</span>,
    },
    {
      id: "title",
      header: "Title",
      cell: (row: ProcurementRequest) => <span>{row.title}</span>,
    },
    {
      id: "department",
      header: "Department",
      cell: (row: ProcurementRequest) => <span>{row.department || "N/A"}</span>,
    },
    {
      id: "date",
      header: "Date Created",
      cell: (row: ProcurementRequest) => (
        <span>{format(new Date(row.date_created), "MMM dd, yyyy")}</span>
      ),
    },
    {
      id: "requester",
      header: "Requester",
      cell: (row: ProcurementRequest) => <span>{row.requester_name || "N/A"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: (row: ProcurementRequest) => (
        <Button 
          size="sm" 
          variant="secondary"
          onClick={() => {
            onSelect(row);
          }}
        >
          Select
        </Button>
      ),
    },
  ];

  // Show detailed request items
  const showRequestDetails = (row: ProcurementRequest) => {
    return (
      <div className="space-y-4 p-4">
        <h3 className="font-medium">Request Items</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-left">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {row.items && row.items.length > 0 ? (
                row.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-2">{item.product_name}</td>
                    <td className="px-4 py-2">{item.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t">
                  <td colSpan={2} className="px-4 py-2 text-center text-muted-foreground">
                    No items found for this request
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => onSelect(row)}
          >
            Select This Request
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Procurement Request</DialogTitle>
          <DialogDescription>
            Choose an approved procurement request to check out items from inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No approved procurement requests found</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredRequests}
              emptyMessage="No procurement requests found"
              showDetailPanel={showRequestDetails}
              detailPanelTitle="Request Details"
              detailPanelDescription="View detailed information about this request"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProcurementRequestSelector;
