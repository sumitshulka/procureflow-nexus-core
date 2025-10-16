
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Settings } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const basicInfoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  procurement_request_id: z.string().optional(),
  submission_deadline: z.date({ required_error: "Submission deadline is required" }),
  technical_opening_date: z.date().optional(),
  commercial_opening_date: z.date().optional(),
  technical_evaluation_deadline: z.date().optional(),
  commercial_evaluation_deadline: z.date().optional(),
  estimated_value: z.number().min(0).optional(),
  currency: z.string().default("USD"),
  pre_bid_meeting_date: z.date().optional(),
  pre_bid_meeting_venue: z.string().optional(),
  bid_validity_period: z.number().default(30),
});

type BasicInfoData = z.infer<typeof basicInfoSchema>;

interface RfpBasicInfoProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  templateData?: any;
  mode?: string;
}

const RfpBasicInfo: React.FC<RfpBasicInfoProps> = ({ data, onUpdate, onNext, templateData, mode }) => {
  const [customFieldsConfig, setCustomFieldsConfig] = useState<any[]>([]);
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  
  const form = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      currency: "USD",
      bid_validity_period: 30,
    },
  });

  // Load template fields and initialize custom fields configuration
  useEffect(() => {
    const templateParam = searchParams.get('template');
    if (templateParam) {
      try {
        const templateData = JSON.parse(decodeURIComponent(templateParam));
        if (templateData.fields && templateData.fields.length > 0) {
          const fieldsConfig = templateData.fields.map((field: any) => ({
            ...field,
            is_required: field.is_required || false,
            use_in_evaluation: true, // Default to true
            min_value: '',
            max_value: '',
            description: field.description || ''
          }));
          setCustomFieldsConfig(fieldsConfig);
        }
      } catch (error) {
        console.error('Error parsing template data:', error);
      }
    }
  }, [searchParams]);

  // Update form values when data changes (especially template data)
  useEffect(() => {
    if (data.basicInfo) {
      const formValues = {
        title: data.basicInfo.title || '',
        description: data.basicInfo.description || '',
        procurement_request_id: data.basicInfo.procurement_request_id || '',
        submission_deadline: data.basicInfo.submission_deadline ? new Date(data.basicInfo.submission_deadline) : undefined,
        technical_opening_date: data.basicInfo.technical_opening_date ? new Date(data.basicInfo.technical_opening_date) : undefined,
        commercial_opening_date: data.basicInfo.commercial_opening_date ? new Date(data.basicInfo.commercial_opening_date) : undefined,
        technical_evaluation_deadline: data.basicInfo.technical_evaluation_deadline ? new Date(data.basicInfo.technical_evaluation_deadline) : undefined,
        commercial_evaluation_deadline: data.basicInfo.commercial_evaluation_deadline ? new Date(data.basicInfo.commercial_evaluation_deadline) : undefined,
        estimated_value: data.basicInfo.estimated_value || undefined,
        currency: data.basicInfo.currency || "USD",
        pre_bid_meeting_date: data.basicInfo.pre_bid_meeting_date ? new Date(data.basicInfo.pre_bid_meeting_date) : undefined,
        pre_bid_meeting_venue: data.basicInfo.pre_bid_meeting_venue || '',
        bid_validity_period: data.basicInfo.bid_validity_period || 30,
      };
      
      form.reset(formValues);
    }
  }, [data.basicInfo, form]);

  const updateCustomFieldConfig = (fieldId: string, updates: any) => {
    setCustomFieldsConfig(prev => 
      prev.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );
  };

  const onSubmit = (formData: BasicInfoData) => {
    // Include custom fields configuration in the data
    const updatedData = {
      basicInfo: {
        ...formData,
        customFieldsConfig: customFieldsConfig
      }
    };
    onUpdate(updatedData);
    onNext();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RFP Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter RFP title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimated_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Value</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="submission_deadline"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Submission Deadline *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
          </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="technical_opening_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Technical Opening Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const submissionDeadline = form.getValues('submission_deadline');
                        return date < (submissionDeadline || new Date());
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Date when technical responses will be opened for evaluation
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="commercial_opening_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Commercial Opening Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const submissionDeadline = form.getValues('submission_deadline');
                        return date < (submissionDeadline || new Date());
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Date when commercial responses will be opened for evaluation
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter detailed description of the RFP"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="pre_bid_meeting_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Pre-bid Meeting Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pre_bid_meeting_venue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pre-bid Meeting Venue</FormLabel>
                <FormControl>
                  <Input placeholder="Enter venue location" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Custom Fields Configuration Section */}
        {customFieldsConfig.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Custom Fields Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure how vendors should fill these custom fields and whether they'll be used in evaluation.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {customFieldsConfig.map((field) => (
                <Card key={field.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{field.field_label}</h4>
                        <p className="text-sm text-muted-foreground">{field.description}</p>
                        <Badge variant="outline" className="mt-1">
                          {field.field_type}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`required-${field.id}`}
                          checked={field.is_required}
                          onCheckedChange={(checked) => 
                            updateCustomFieldConfig(field.id, { is_required: checked })
                          }
                        />
                        <label htmlFor={`required-${field.id}`} className="text-sm font-medium">
                          Required field
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`evaluation-${field.id}`}
                          checked={field.use_in_evaluation}
                          onCheckedChange={(checked) => 
                            updateCustomFieldConfig(field.id, { use_in_evaluation: checked })
                          }
                        />
                        <label htmlFor={`evaluation-${field.id}`} className="text-sm font-medium">
                          Use in evaluation
                        </label>
                      </div>
                    </div>

                    {field.field_type === 'number' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Minimum Value</label>
                          <Input
                            type="number"
                            placeholder="Min value"
                            value={field.min_value}
                            onChange={(e) => 
                              updateCustomFieldConfig(field.id, { min_value: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Maximum Value</label>
                          <Input
                            type="number"
                            placeholder="Max value"
                            value={field.max_value}
                            onChange={(e) => 
                              updateCustomFieldConfig(field.id, { max_value: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Field Instructions</label>
                      <Textarea
                        placeholder="Instructions for vendors on how to fill this field"
                        value={field.instructions || ''}
                        onChange={(e) => 
                          updateCustomFieldConfig(field.id, { instructions: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit">
            {mode === 'quick' ? 'Continue to Items & Vendors' : 'Continue to BOQ'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default RfpBasicInfo;
