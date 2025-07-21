import React, { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Supplier {
  id: string;
  vendor_id: string;
  vendor_price: number;
  vendor_currency: string;
  registered_at: string;
  price_updated_at?: string;
  vendor?: {
    company_name: string;
    vendor_number?: string;
    status: string;
    primary_email: string;
    primary_phone: string;
    currency: string;
  };
}

interface SuppliersTableProps {
  suppliers: Supplier[];
}

const SuppliersTable: React.FC<SuppliersTableProps> = ({ suppliers }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const totalPages = Math.ceil(suppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSuppliers = suppliers.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentSuppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{supplier.vendor?.company_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {supplier.vendor?.vendor_number || 'No vendor number'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">{supplier.vendor?.primary_email}</div>
                    <div className="text-sm text-muted-foreground">{supplier.vendor?.primary_phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {supplier.vendor_currency} {supplier.vendor_price?.toFixed(2) || 'N/A'}
                    </div>
                    {supplier.price_updated_at && (
                      <div className="text-xs text-muted-foreground">
                        Updated: {format(new Date(supplier.price_updated_at), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(supplier.registered_at), 'MMM dd, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={supplier.vendor?.status === 'approved' ? 'default' : 'secondary'}
                  >
                    {supplier.vendor?.status?.charAt(0).toUpperCase() + supplier.vendor?.status?.slice(1)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, suppliers.length)} of {suppliers.length} suppliers
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersTable;