
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Schema for approval hierarchy settings
const approvalSchema = z.object({
  roleLevel1: z.string().optional(),
  roleLevel2: z.string().optional(),
  roleLevel3: z.string().optional(),
});

type FormValues = z.infer<typeof approvalSchema>;

const ApprovalHierarchy = () => {
  console.info("Rendering ApprovalHierarchy component");

  // Fetch roles for the dropdown
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles_for_approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("id, name");
        
      if (error) throw error;
      console.info("Roles fetched:", data);
      return data || [];
    },
  });

  // Fetch existing approval hierarchy settings
  const { data: hierarchySettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["approval_hierarchy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_hierarchy")
        .select("*");
        
      if (error) throw error;
      console.info("Raw approval hierarchies:", data);
      return data?.[0] || { level1_role: null, level2_role: null, level3_role: null };
    },
  });

  // Set up form with existing values
  const form = useForm<FormValues>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      roleLevel1: hierarchySettings?.level1_role || "",
      roleLevel2: hierarchySettings?.level2_role || "",
      roleLevel3: hierarchySettings?.level3_role || "",
    },
  });

  // Update form values when settings are loaded
  React.useEffect(() => {
    if (hierarchySettings) {
      form.reset({
        roleLevel1: hierarchySettings.level1_role || "",
        roleLevel2: hierarchySettings.level2_role || "",
        roleLevel3: hierarchySettings.level3_role || "",
      });
    }
  }, [hierarchySettings, form]);

  // Save settings
  const onSubmit = (values: FormValues) => {
    console.log("Saving approval hierarchy:", values);
    // Implementation for saving to database would go here
  };

  if (isLoading || isLoadingSettings) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Hierarchy</CardTitle>
        <CardDescription>
          Configure the approval levels for procurement requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="roleLevel1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level 1 Approver</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None (Skip this level)</SelectItem>
                          {roles.map((role) => (
                            <SelectItem 
                              key={role.id} 
                              value={role.id}
                            >
                              {role.name || "Unnamed Role"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleLevel2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level 2 Approver</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None (Skip this level)</SelectItem>
                          {roles.map((role) => (
                            <SelectItem 
                              key={role.id} 
                              value={role.id}
                            >
                              {role.name || "Unnamed Role"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleLevel3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level 3 Approver (Final)</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None (Skip this level)</SelectItem>
                          {roles.map((role) => (
                            <SelectItem 
                              key={role.id} 
                              value={role.id}
                            >
                              {role.name || "Unnamed Role"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit">
                Save Configuration
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ApprovalHierarchy;
