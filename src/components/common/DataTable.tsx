
import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export interface DataTableProps {
  columns: Array<{
    id: string;
    header: string;
    cell: (row: any, index?: number) => React.ReactNode;
  }>;
  data: Array<any>;
  emptyMessage?: string;
  loading?: boolean;
  showDetailPanel?: (row: any) => React.ReactNode;
  detailPanelTitle?: string;
  detailPanelDescription?: string;
}

const DataTable = ({
  columns,
  data,
  emptyMessage = 'No data available',
  loading = false,
  showDetailPanel,
  detailPanelTitle = 'Details',
  detailPanelDescription,
}: DataTableProps) => {
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const handleRowDetail = (row: any) => {
    setSelectedRow(row);
    setIsDetailOpen(true);
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id}>{column.header}</TableHead>
            ))}
            {showDetailPanel && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`loading-${index}`}>
                {columns.map((column) => (
                  <TableCell key={`${index}-${column.id}`}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
                {showDetailPanel && (
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showDetailPanel ? columns.length + 1 : columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={`row-${i}`}>
                {columns.map((column) => (
                  <TableCell key={`${i}-${column.id}`}>
                    {column.cell(row, i)}
                  </TableCell>
                ))}
                {showDetailPanel && (
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRowDetail(row)}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showDetailPanel && (
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent side="right" className="sm:max-w-md md:max-w-lg">
            <SheetHeader>
              <SheetTitle>{detailPanelTitle}</SheetTitle>
              {detailPanelDescription && (
                <SheetDescription>{detailPanelDescription}</SheetDescription>
              )}
            </SheetHeader>
            <div className="py-4">{selectedRow && showDetailPanel(selectedRow)}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default DataTable;
