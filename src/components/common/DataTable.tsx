
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps {
  columns: Array<{
    id: string;
    header: string;
    cell: (item: any) => React.ReactNode;
  }>;
  data: any[];
  emptyMessage?: string;
}

const DataTable = ({
  columns,
  data,
  emptyMessage = "No data available",
}: DataTableProps) => {
  return (
    <div className="data-table-container">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-6 text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, i) => (
              <TableRow key={i}>
                {columns.map((column) => (
                  <TableCell key={`${i}-${column.id}`}>
                    {column.cell(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;
