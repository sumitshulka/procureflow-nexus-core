import React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWarehouseTransfers } from "@/hooks/useWarehouseTransfers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  Loader2,
  Package,
  AlertTriangle,
  Trash2,
  RotateCcw,
} from "lucide-react";
import type { WarehouseTransfer, WarehouseTransferItem } from "@/types/transfer";

const receiveFormSchema = z.object({
  receipt_notes: z.string().optional(),
  items: z.array(
    z.object({
      item_id: z.string(),
      product_name: z.string(),
      batch_number: z.string(),
      quantity_sent: z.number(),
      quantity_received: z.number().min(0),
      quantity_rejected: z.number().min(0),
      quantity_disposed: z.number().min(0),
      rejection_reason: z.string().optional(),
      disposal_reason: z.string().optional(),
      condition_notes: z.string().optional(),
      action: z.enum(["accept_all", "partial", "reject_all", "dispose_all"]),
    })
  ),
}).refine((data) => {
  return data.items.every((item) => {
    const total = item.quantity_received + item.quantity_rejected + item.quantity_disposed;
    return total === item.quantity_sent;
  });
}, {
  message: "Total of received, rejected, and disposed must equal quantity sent",
  path: ["items"],
}).refine((data) => {
  return data.items.every((item) => {
    if (item.quantity_rejected > 0 && !item.rejection_reason) return false;
    if (item.quantity_disposed > 0 && !item.disposal_reason) return false;
    return true;
  });
}, {
  message: "Rejection and disposal reasons are required when applicable",
  path: ["items"],
});

type ReceiveFormValues = z.infer<typeof receiveFormSchema>;

interface TransferReceiveDialogProps {
  transfer: WarehouseTransfer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ItemAction = "accept_all" | "partial" | "reject_all" | "dispose_all";

export function TransferReceiveDialog({
  transfer,
  open,
  onOpenChange,
  onSuccess,
}: TransferReceiveDialogProps) {
  const { receiveTransfer, isReceiving } = useWarehouseTransfers();

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveFormSchema),
    defaultValues: {
      receipt_notes: "",
      items: [],
    },
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Initialize form when transfer changes
  React.useEffect(() => {
    if (transfer?.items) {
      form.reset({
        receipt_notes: "",
        items: transfer.items.map((item) => ({
          item_id: item.id,
          product_name: item.product?.name || "Unknown",
          batch_number: item.batch_number,
          quantity_sent: item.quantity_sent,
          quantity_received: item.quantity_sent,
          quantity_rejected: 0,
          quantity_disposed: 0,
          rejection_reason: "",
          disposal_reason: "",
          condition_notes: "",
          action: "accept_all" as const,
        })),
      });
    }
  }, [transfer, form]);

  const handleActionChange = (index: number, action: ItemAction) => {
    const item = fields[index];
    let updates: Partial<typeof item> = { action };

    switch (action) {
      case "accept_all":
        updates = {
          ...updates,
          quantity_received: item.quantity_sent,
          quantity_rejected: 0,
          quantity_disposed: 0,
          rejection_reason: "",
          disposal_reason: "",
        };
        break;
      case "reject_all":
        updates = {
          ...updates,
          quantity_received: 0,
          quantity_rejected: item.quantity_sent,
          quantity_disposed: 0,
          disposal_reason: "",
        };
        break;
      case "dispose_all":
        updates = {
          ...updates,
          quantity_received: 0,
          quantity_rejected: 0,
          quantity_disposed: item.quantity_sent,
          rejection_reason: "",
        };
        break;
      case "partial":
        // Keep current values, user will adjust manually
        break;
    }

    update(index, { ...item, ...updates });
  };

  const onSubmit = (data: ReceiveFormValues) => {
    if (!transfer) return;

    receiveTransfer(
      {
        transferId: transfer.id,
        values: {
          receipt_notes: data.receipt_notes,
          items: data.items.map((item) => ({
            item_id: item.item_id,
            product_name: item.product_name,
            batch_number: item.batch_number,
            quantity_sent: item.quantity_sent,
            quantity_received: item.quantity_received,
            quantity_rejected: item.quantity_rejected,
            quantity_disposed: item.quantity_disposed,
            rejection_reason: item.rejection_reason,
            disposal_reason: item.disposal_reason,
            condition_notes: item.condition_notes,
          })),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess();
        },
      }
    );
  };

  if (!transfer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Receive Transfer: {transfer.transfer_number}
          </DialogTitle>
          <DialogDescription>
            Review and process incoming items from {transfer.source_warehouse?.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                For each item, select an action: Accept All, Reject All, Dispose All, or
                Partial (for mixed outcomes). Rejected items can be returned to the source warehouse.
              </AlertDescription>
            </Alert>

            {/* Items Table */}
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product / Batch</TableHead>
                    <TableHead className="text-center">Sent</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-center">Received</TableHead>
                    <TableHead className="text-center">Rejected</TableHead>
                    <TableHead className="text-center">Disposed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <React.Fragment key={field.id}>
                      <TableRow>
                        <TableCell>
                          <div>
                            <p className="font-medium">{field.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Batch: {field.batch_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {field.quantity_sent}
                        </TableCell>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.action`}
                            render={({ field: actionField }) => (
                              <Select
                                value={actionField.value}
                                onValueChange={(value: ItemAction) => {
                                  actionField.onChange(value);
                                  handleActionChange(index, value);
                                }}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="accept_all">
                                    <span className="flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      Accept All
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="partial">
                                    <span className="flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                      Partial
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="reject_all">
                                    <span className="flex items-center gap-2">
                                      <RotateCcw className="h-4 w-4 text-red-500" />
                                      Reject All
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="dispose_all">
                                    <span className="flex items-center gap-2">
                                      <Trash2 className="h-4 w-4 text-gray-500" />
                                      Dispose All
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Controller
                            control={form.control}
                            name={`items.${index}.quantity_received`}
                            render={({ field: qtyField }) => (
                              <Input
                                type="number"
                                min={0}
                                max={field.quantity_sent}
                                className="w-20 text-center"
                                value={qtyField.value}
                                onChange={(e) => qtyField.onChange(parseInt(e.target.value) || 0)}
                                disabled={form.watch(`items.${index}.action`) !== "partial"}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Controller
                            control={form.control}
                            name={`items.${index}.quantity_rejected`}
                            render={({ field: qtyField }) => (
                              <Input
                                type="number"
                                min={0}
                                max={field.quantity_sent}
                                className="w-20 text-center"
                                value={qtyField.value}
                                onChange={(e) => qtyField.onChange(parseInt(e.target.value) || 0)}
                                disabled={form.watch(`items.${index}.action`) !== "partial"}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Controller
                            control={form.control}
                            name={`items.${index}.quantity_disposed`}
                            render={({ field: qtyField }) => (
                              <Input
                                type="number"
                                min={0}
                                max={field.quantity_sent}
                                className="w-20 text-center"
                                value={qtyField.value}
                                onChange={(e) => qtyField.onChange(parseInt(e.target.value) || 0)}
                                disabled={form.watch(`items.${index}.action`) !== "partial"}
                              />
                            )}
                          />
                        </TableCell>
                      </TableRow>

                      {/* Rejection/Disposal Reasons Row */}
                      {(form.watch(`items.${index}.quantity_rejected`) > 0 ||
                        form.watch(`items.${index}.quantity_disposed`) > 0) && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {form.watch(`items.${index}.quantity_rejected`) > 0 && (
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.rejection_reason`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">
                                        Rejection Reason *
                                      </FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Explain why items were rejected..."
                                          className="h-20"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                              {form.watch(`items.${index}.quantity_disposed`) > 0 && (
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.disposal_reason`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">
                                        Disposal Reason *
                                      </FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Explain why items were disposed..."
                                          className="h-20"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Condition Notes Row */}
                      <TableRow className="border-b-2">
                        <TableCell colSpan={6} className="py-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.condition_notes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Condition notes (optional)"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            {form.formState.errors.items && (
              <p className="text-sm text-destructive">
                {form.formState.errors.items.message}
              </p>
            )}

            {/* Receipt Notes */}
            <FormField
              control={form.control}
              name="receipt_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any general notes about receiving this transfer..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isReceiving}>
                {isReceiving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Receipt
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default TransferReceiveDialog;
