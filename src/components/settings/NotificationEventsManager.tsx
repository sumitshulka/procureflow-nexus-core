import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Mail, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";

const eventConfigSchema = z.object({
  template_id: z.string().nullable(),
  recipient_config: z.object({
    type: z.string(),
    roles: z.array(z.string()).optional(),
    additional_recipients: z.array(z.string()).optional(),
  }),
  is_active: z.boolean(),
});

type EventConfigForm = z.infer<typeof eventConfigSchema>;

const NotificationEventsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<EventConfigForm>({
    resolver: zodResolver(eventConfigSchema),
    defaultValues: {
      template_id: null,
      recipient_config: {
        type: "manual",
        roles: [],
        additional_recipients: [],
      },
      is_active: true,
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["notification_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_events")
        .select("*, email_templates(id, name)")
        .order("event_category", { ascending: true })
        .order("event_name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["email_templates_for_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, category")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, values }: { eventId: string; values: EventConfigForm }) => {
      const { error } = await supabase
        .from("notification_events")
        .update({
          template_id: values.template_id,
          recipient_config: values.recipient_config as any,
          is_active: values.is_active,
        })
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_events"] });
      toast({ title: "Notification event updated successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating notification event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfigure = (event: any) => {
    setSelectedEvent(event);
    form.reset({
      template_id: event.template_id || null,
      recipient_config: event.recipient_config || {
        type: "manual",
        roles: [],
        additional_recipients: [],
      },
      is_active: event.is_active,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: EventConfigForm) => {
    if (!selectedEvent) return;
    updateEventMutation.mutate({ eventId: selectedEvent.id, values });
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      purchase_orders: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      invoices: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      rfp: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      users: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      vendors: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      procurement: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
      inventory: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  };

  const getRecipientTypeLabel = (config: any) => {
    if (!config) return "Not configured";
    
    switch (config.type) {
      case "vendor":
        return "Vendor";
      case "creator":
        return "Creator";
      case "requester":
        return "Requester";
      case "user":
        return "User";
      case "vendor_user":
        return "Vendor User";
      case "invited_vendors":
        return "Invited Vendors";
      case "roles":
        return `Roles: ${config.roles?.join(", ") || "None"}`;
      case "manual":
        return "Manual";
      default:
        return config.type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <div>
            <CardTitle>Notification Events</CardTitle>
            <CardDescription>
              Configure which email templates are used for different system events and who receives them
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {eventsLoading ? (
          <p>Loading notification events...</p>
        ) : events.length === 0 ? (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              No notification events configured. Please contact system administrator.
            </AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{event.event_name}</p>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryBadgeColor(event.event_category)}>
                      {event.event_category.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {event.email_templates ? (
                      <span className="text-sm">{event.email_templates.name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No template assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-3 w-3" />
                      {getRecipientTypeLabel(event.recipient_config)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.is_active ? "default" : "secondary"}>
                      {event.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigure(event)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure Notification Event</DialogTitle>
              <DialogDescription>
                {selectedEvent?.event_name} - {selectedEvent?.description}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Notification</FormLabel>
                        <FormDescription>
                          Send emails when this event occurs
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="template_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Template</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No template</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose which email template to use for this notification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Default Recipients:</strong> {getRecipientTypeLabel(selectedEvent?.recipient_config)}
                    <br />
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Recipient configuration is managed by the system based on the event type
                    </span>
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save Configuration
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default NotificationEventsManager;
