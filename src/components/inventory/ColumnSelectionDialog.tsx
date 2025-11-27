import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ColumnOption {
  id: string;
  label: string;
  selected: boolean;
}

interface ColumnSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnOption[];
  onColumnToggle: (columnId: string) => void;
  onExport: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const ColumnSelectionDialog: React.FC<ColumnSelectionDialogProps> = ({
  open,
  onOpenChange,
  columns,
  onColumnToggle,
  onExport,
  onSelectAll,
  onDeselectAll,
}) => {
  const selectedCount = columns.filter((col) => col.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Columns for Export</DialogTitle>
          <DialogDescription>
            Choose which columns to include in the PDF export. ({selectedCount} of {columns.length} selected)
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={onDeselectAll}>
            Deselect All
          </Button>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={column.selected}
                  onCheckedChange={() => onColumnToggle(column.id)}
                />
                <Label
                  htmlFor={column.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onExport} disabled={selectedCount === 0}>
            Export PDF ({selectedCount} columns)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnSelectionDialog;
