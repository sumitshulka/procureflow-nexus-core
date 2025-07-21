import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings, Table, X, Check } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PricingField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  description?: string;
  calculation_formula?: string;
  field_options?: any;
  is_required: boolean;
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

const PricingTemplateFieldDesigner: React.FC<PricingTemplateFieldDesignerProps> = ({
  data,
  onUpdate,
}) => {
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [newField, setNewField] = useState<Partial<PricingField>>({
    field_name: "",
    field_label: "",
    field_type: "text",
    description: "",
    calculation_formula: "",
    is_required: false,
    row_number: 1,
    column_number: 1
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
    setNewField({
      field_name: "",
      field_label: "",
      field_type: "text",
      description: "",
      calculation_formula: "",
      is_required: false,
      row_number: 1,
      column_number: 1
    });
  };

  const handleAddField = () => {
    if (!newField.field_label?.trim()) return;

    const field: PricingField = {
      id: `field_${Date.now()}`,
      field_name: newField.field_name || generateFieldName(newField.field_label),
      field_label: newField.field_label,
      field_type: newField.field_type || "text",
      description: newField.description,
      calculation_formula: newField.calculation_formula,
      field_options: newField.field_options,
      is_required: newField.is_required || false,
      display_order: data.fields.length,
      row_number: newField.row_number || 1,
      column_number: newField.column_number || 1
    };

    onUpdate({
      fields: [...data.fields, field]
    });

    resetForm();
    setIsAddingField(false);
  };

  const handleEditField = (field: PricingField) => {
    setEditingFieldId(field.id);
    setNewField({...field});
  };

  const handleUpdateField = () => {
    if (!editingFieldId || !newField.field_label?.trim()) return;

    const updatedFields = data.fields.map(field => 
      field.id === editingFieldId 
        ? {
            ...field,
            field_name: newField.field_name || generateFieldName(newField.field_label),
            field_label: newField.field_label,
            field_type: newField.field_type || "text",
            description: newField.description,
            calculation_formula: newField.calculation_formula,
            field_options: newField.field_options,
            is_required: newField.is_required || false,
            row_number: newField.row_number || 1,
            column_number: newField.column_number || 1
          }
        : field
    );

    onUpdate({ fields: updatedFields });
    setEditingFieldId(null);
    resetForm();
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

  const FieldForm = ({ isEditing = false }: { isEditing?: boolean }) => (
    <Card className={`${isEditing ? 'border-primary' : 'border-dashed border-2'} animate-fade-in`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm flex items-center justify-between">
          {isEditing ? 'Edit Field' : 'Add New Field'}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleUpdateField} className="h-8">
                  <Check className="h-3 w-3 mr-1" />
                  Update
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8">
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={handleAddField} className="h-8">
                  <Check className="h-3 w-3 mr-1" />
                  Add
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelAdd} className="h-8">
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="field_label">Field Label *</Label>
            <Input
              id="field_label"
              placeholder="e.g., Unit Price"
              value={newField.field_label || ""}
              onChange={(e) => {
                const label = e.target.value;
                setNewField(prev => ({
                  ...prev,
                  field_label: label,
                  field_name: prev.field_name || generateFieldName(label)
                }));
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="field_type">Field Type</Label>
            <Select 
              value={newField.field_type || "text"} 
              onValueChange={(value) => setNewField(prev => ({ ...prev, field_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="row_number">Row Position</Label>
            <Select 
              value={newField.row_number?.toString()} 
              onValueChange={(value) => setNewField(prev => ({ ...prev, row_number: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: rows }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Row {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="column_number">Column Position</Label>
            <Select 
              value={newField.column_number?.toString()} 
              onValueChange={(value) => setNewField(prev => ({ ...prev, column_number: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: columns }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Column {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of this field..."
            value={newField.description || ""}
            onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
        </div>

        {(newField.field_type === "calculation" || newField.field_type === "total") && (
          <div className="space-y-2">
            <Label htmlFor="calculation_formula">Calculation Formula</Label>
            <Input
              id="calculation_formula"
              placeholder="e.g., quantity * unit_price"
              value={newField.calculation_formula || ""}
              onChange={(e) => setNewField(prev => ({ ...prev, calculation_formula: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Use field names and operators (+, -, *, /) to create formulas
            </p>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="is_required"
            checked={newField.is_required || false}
            onCheckedChange={(checked) => setNewField(prev => ({ ...prev, is_required: checked }))}
          />
          <Label htmlFor="is_required">Required field</Label>
        </div>
      </CardContent>
    </Card>
  );

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
              {isAddingField && <FieldForm />}
              
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
                      <FieldForm isEditing={true} />
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
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Row {field.row_number}, Column {field.column_number}
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