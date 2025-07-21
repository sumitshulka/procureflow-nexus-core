import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Calculator, FileText, Table, Settings } from "lucide-react";

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

interface PricingTemplatePreviewProps {
  data: PricingTemplateData;
  onUpdate: (data: Partial<PricingTemplateData>) => void;
}

const PricingTemplatePreview: React.FC<PricingTemplatePreviewProps> = ({
  data,
}) => {
  const rows = data.template_data?.table_structure?.rows || 5;
  const columns = data.template_data?.table_structure?.columns || 4;

  const renderFieldInput = (field: PricingField) => {
    const placeholder = `Enter ${field.field_label.toLowerCase()}`;
    
    switch (field.field_type) {
      case "number":
      case "currency":
        return (
          <Input
            type="number"
            placeholder={placeholder}
            disabled
            className="bg-muted"
          />
        );
      case "percentage":
        return (
          <div className="flex">
            <Input
              type="number"
              placeholder="0"
              disabled
              className="bg-muted rounded-r-none"
            />
            <div className="bg-muted border border-l-0 px-2 py-2 rounded-r text-sm text-muted-foreground">
              %
            </div>
          </div>
        );
      case "date":
        return (
          <Input
            type="date"
            disabled
            className="bg-muted"
          />
        );
      case "select":
        return (
          <Select disabled>
            <SelectTrigger className="bg-muted">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
            </SelectContent>
          </Select>
        );
      case "calculation":
      case "total":
        return (
          <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded text-sm">
            <Calculator className="h-3 w-3 inline mr-1" />
            Auto-calculated
          </div>
        );
      default:
        return (
          <Input
            placeholder={placeholder}
            disabled
            className="bg-muted"
          />
        );
    }
  };

  const renderPricingTable = () => {
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
                    className="border border-gray-200 p-3 min-w-[150px]"
                  >
                    {cell ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">
                            {cell.field_label}
                            {cell.is_required && <span className="text-red-500">*</span>}
                          </label>
                          <Badge variant="outline" className="text-xs">
                            {cell.field_type}
                          </Badge>
                        </div>
                        {renderFieldInput(cell)}
                        {cell.description && (
                          <p className="text-xs text-muted-foreground">{cell.description}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground text-sm py-4">
                        Empty Cell
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
        <Eye className="h-5 w-5" />
        <h3 className="text-lg font-medium">Preview & Summary</h3>
      </div>

      {/* Template Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Template Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Template Name</p>
              <p className="font-medium">{data.name || "Untitled Template"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <Badge variant="outline">{data.category}</Badge>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm">{data.description || "No description provided"}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{rows}x{columns}</div>
              <p className="text-sm text-muted-foreground">Table Size</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{data.fields.length}</div>
              <p className="text-sm text-muted-foreground">Total Fields</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {data.fields.filter(f => f.is_required).length}
              </div>
              <p className="text-sm text-muted-foreground">Required Fields</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor View Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Vendor View Preview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This is how vendors will see and interact with your pricing template
          </p>
        </CardHeader>
        <CardContent>
          {data.fields.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Pricing Information</h4>
                <p className="text-sm text-blue-700">
                  Please fill in all required fields marked with (*). 
                  Calculated fields will be automatically computed based on your inputs.
                </p>
              </div>
              {renderPricingTable()}
              <div className="text-xs text-muted-foreground">
                * Required fields must be completed before submission
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No fields configured</p>
              <p className="text-sm">Go back to add fields to see the preview</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Details */}
      {data.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Field Configuration Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.field_label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {field.field_type}
                        </Badge>
                        {field.is_required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Position: Row {field.row_number}, Column {field.column_number}
                        {field.calculation_formula && (
                          <span className="ml-2">| Formula: {field.calculation_formula}</span>
                        )}
                      </div>
                      {field.description && (
                        <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PricingTemplatePreview;