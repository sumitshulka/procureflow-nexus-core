import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, Settings, Table, X, Check, Calculator } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PricingField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  description?: string;
  calculation_formula?: string;
  field_options?: any;
  is_required: boolean;
  requires_user_input: boolean;
  display_order: number;
  row_number: number;
  column_number: number;
}

interface PricingTemplateData {
  name: string;
  description: string;
  category: string;
  template_data: any;
  fields: PricingField[];
}

interface PricingTemplateFieldDesignerProps {
  data: PricingTemplateData;
  onUpdate: (data: Partial<PricingTemplateData>) => void;
}

const fieldSchema = z.object({
  field_label: z.string().min(1, "Field label is required"),
  field_type: z.string().default("text"),
  description: z.string().optional(),
  calculation_formula: z.string().optional(),
  is_required: z.boolean().default(false),
  requires_user_input: z.boolean().default(true),
  row_number: z.number().min(1),
  column_number: z.number().min(1),
});

type FieldFormData = z.infer<typeof fieldSchema>;

const FieldForm = React.memo(({ 
  isEditing = false, 
  form, 
  onSubmit, 
  onCancel, 
  fieldTypes, 
  rows, 
  columns,
  data
}: { 
  isEditing?: boolean;
  form: any;
  onSubmit: (data: FieldFormData) => void;
  onCancel: () => void;
  fieldTypes: Array<{ value: string; label: string }>;
  rows: number;
  columns: number;
  data: PricingTemplateData;
}) => {
  const getAvailableFieldsForFormula = () => {
    return data.fields.filter(field => 
      field.field_type === 'number' || 
      field.field_type === 'currency' || 
      field.field_type === 'percentage'
    ).map(field => ({
      name: field.field_name,
      label: field.field_label
    }));
  };

  const FormulaBuilder = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
    const [formulaInput, setFormulaInput] = useState(value || "");
    const availableFields = getAvailableFieldsForFormula();
    
    const insertField = (fieldName: string) => {
      setFormulaInput(prev => prev + fieldName);
      onChange(formulaInput + fieldName);
    };
    
    const insertOperator = (operator: string) => {
      setFormulaInput(prev => prev + ` ${operator} `);
      onChange(formulaInput + ` ${operator} `);
    };
    
    const handleInputChange = (newValue: string) => {
      setFormulaInput(newValue);
      onChange(newValue);
    };

    return (
      <div className="space-y-3">
        <div className="relative">
          <Input
            value={formulaInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Build your formula using fields and operators"
            className="pr-10"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
              >
                <Calculator className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Available Fields</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {availableFields.length > 0 ? (
                      availableFields.map((field) => (
                        <Button
                          key={field.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="justify-start h-8 text-xs"
                          onClick={() => insertField(field.name)}
                        >
                          <code className="bg-muted px-1 rounded mr-2">{field.name}</code>
                          {field.label}
                        </Button>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Add numeric fields first to use in calculations
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Operators</h4>
                  <div className="grid grid-cols-4 gap-1">
                    {['+', '-', '*', '/'].map((op) => (
                      <Button
                        key={op}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => insertOperator(op)}
                      >
                        {op}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Functions</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {['SUM()', 'AVG()', 'MAX()', 'MIN()'].map((func) => (
                      <Button
                        key={func}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start h-8 text-xs"
                        onClick={() => insertField(func)}
                      >
                        {func}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setFormulaInput("");
                      onChange("");
                    }}
                  >
                    Clear Formula
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Examples:</p>
          <ul className="space-y-1">
            <li>• <code>quantity * unit_price</code></li>
            <li>• <code>(quantity * unit_price) * (1 + tax_rate)</code></li>
            <li>• <code>SUM(item1 + item2 + item3)</code></li>
          </ul>
        </div>
      </div>
    );
  };

  return (
  <Card className={`${isEditing ? 'border-primary' : 'border-dashed border-2'} animate-fade-in`}>
    <CardHeader className="pb-4">
      <CardTitle className="text-sm flex items-center justify-between">
        {isEditing ? 'Edit Field' : 'Add New Field'}
        <div className="flex gap-2">
          <Button size="sm" type="submit" form="field-form" className="h-8">
            <Check className="h-3 w-3 mr-1" />
            {isEditing ? 'Update' : 'Add'}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onCancel} 
            className="h-8"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Form {...form}>
        <form id="field-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="field_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Label *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Unit Price" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="field_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="row_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Row Position</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: rows }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Row {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="column_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Column Position</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: columns }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Column {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    placeholder="Brief description of this field..."
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("field_type") === "calculation" || form.watch("field_type") === "total" ? (
            <FormField
              control={form.control}
              name="calculation_formula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calculation Formula</FormLabel>
                  <FormControl>
                    <FormulaBuilder
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="is_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Required field</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requires_user_input"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>Requires User Input</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Toggle off if this cell has pre-filled values
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>

        </form>
      </Form>
    </CardContent>
  </Card>
  );
});

const PricingTemplateFieldDesigner: React.FC<PricingTemplateFieldDesignerProps> = ({
  data,
  onUpdate,
}) => {
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  
  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      field_label: "",
      field_type: "text",
      description: "",
      calculation_formula: "",
      is_required: false,
      requires_user_input: true,
      row_number: 1,
      column_number: 1,
    },
  });

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "currency", label: "Currency" },
    { value: "percentage", label: "Percentage" },
    { value: "date", label: "Date" },
    { value: "select", label: "Select/Dropdown" },
    { value: "calculation", label: "Calculated Field" },
    { value: "total", label: "Total/Sum" }
  ];

  const rows = data.template_data?.table_structure?.rows || 5;
  const columns = data.template_data?.table_structure?.columns || 4;

  const generateFieldName = (label: string) => {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  };

  const resetForm = () => {
    form.reset({
      field_label: "",
      field_type: "text",
      description: "",
      calculation_formula: "",
      is_required: false,
      requires_user_input: true,
      row_number: 1,
      column_number: 1,
    });
  };

  const onSubmitField = (formData: FieldFormData) => {
    if (editingFieldId) {
      // Update existing field
      const updatedFields = data.fields.map(field => 
        field.id === editingFieldId 
          ? {
              ...field,
              field_name: generateFieldName(formData.field_label),
              field_label: formData.field_label,
              field_type: formData.field_type,
              description: formData.description,
              calculation_formula: formData.calculation_formula,
              is_required: formData.is_required,
              requires_user_input: formData.requires_user_input,
              row_number: formData.row_number,
              column_number: formData.column_number,
            }
          : field
      );
      onUpdate({ fields: updatedFields });
      setEditingFieldId(null);
    } else {
      // Add new field
      const field: PricingField = {
        id: `field_${Date.now()}`,
        field_name: generateFieldName(formData.field_label),
        field_label: formData.field_label,
        field_type: formData.field_type,
        description: formData.description,
        calculation_formula: formData.calculation_formula,
        field_options: null,
        is_required: formData.is_required,
        requires_user_input: formData.requires_user_input,
        display_order: data.fields.length,
        row_number: formData.row_number,
        column_number: formData.column_number,
      };
      onUpdate({ fields: [...data.fields, field] });
      setIsAddingField(false);
    }
    resetForm();
  };

  const handleEditField = (field: PricingField) => {
    setEditingFieldId(field.id);
    form.reset({
      field_label: field.field_label,
      field_type: field.field_type,
      description: field.description || "",
      calculation_formula: field.calculation_formula || "",
      is_required: field.is_required,
      requires_user_input: field.requires_user_input,
      row_number: field.row_number,
      column_number: field.column_number,
    });
  };

  const handleCancelAdd = () => {
    setIsAddingField(false);
    resetForm();
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
    resetForm();
  };

  const handleDeleteField = (fieldId: string) => {
    onUpdate({
      fields: data.fields.filter(field => field.id !== fieldId)
    });
  };

  const renderTablePreview = () => {
    const table = Array(rows).fill(null).map(() => Array(columns).fill(null));
    
    // Place fields in their positions
    data.fields.forEach(field => {
      const row = field.row_number - 1;
      const col = field.column_number - 1;
      if (row >= 0 && row < rows && col >= 0 && col < columns) {
        table[row][col] = field;
      }
    });

    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <tbody>
            {table.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td 
                    key={colIndex}
                    className="border border-gray-200 p-2 h-16 relative min-w-[120px]"
                  >
                    {cell ? (
                      <div className="text-xs">
                        <div className="font-medium truncate">{cell.field_label}</div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {cell.field_type}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center">
                        R{rowIndex + 1}C{colIndex + 1}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-medium">Field Designer</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fields List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Fields ({data.fields.length})
                </CardTitle>
                {!isAddingField && (
                  <Button size="sm" onClick={() => setIsAddingField(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAddingField && (
                <FieldForm 
                  form={form}
                  onSubmit={onSubmitField}
                  onCancel={handleCancelAdd}
                  fieldTypes={fieldTypes}
                  rows={rows}
                  columns={columns}
                  data={data}
                />
              )}
              
              {data.fields.length === 0 && !isAddingField ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No fields added yet</p>
                  <p className="text-sm">Click "Add Field" to get started</p>
                </div>
              ) : (
                data.fields.map((field) => (
                  <div key={field.id}>
                    {editingFieldId === field.id ? (
                      <FieldForm 
                        isEditing={true}
                        form={form}
                        onSubmit={onSubmitField}
                        onCancel={handleCancelEdit}
                        fieldTypes={fieldTypes}
                        rows={rows}
                        columns={columns}
                        data={data}
                      />
                    ) : (
                      <Card className="hover-scale transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{field.field_label}</p>
                                <Badge variant="secondary" className="text-xs">
                                  {field.field_type}
                                </Badge>
                                {field.is_required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                {!field.requires_user_input && (
                                  <Badge variant="outline" className="text-xs">Pre-filled</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Row {field.row_number}, Column {field.column_number}
                                {field.requires_user_input ? " • User Input" : " • Pre-filled"}
                              </p>
                              {field.description && (
                                <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                              )}
                              {field.calculation_formula && (
                                <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1">
                                  Formula: {field.calculation_formula}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditField(field)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeleteField(field.id)}
                                className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Table Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Table Preview ({rows}x{columns})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderTablePreview()}
            <p className="text-xs text-muted-foreground mt-2">
              This shows how the pricing table will appear to vendors. Fields are positioned based on their row and column settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PricingTemplateFieldDesigner;