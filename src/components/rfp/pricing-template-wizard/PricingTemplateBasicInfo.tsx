import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, FileText, Info } from "lucide-react";

interface PricingTemplateData {
  name: string;
  description: string;
  category: string;
  template_data: any;
  fields: any[];
}

interface PricingTemplateBasicInfoProps {
  data: PricingTemplateData;
  onUpdate: (data: Partial<PricingTemplateData>) => void;
}

const PricingTemplateBasicInfo: React.FC<PricingTemplateBasicInfoProps> = ({
  data,
  onUpdate,
}) => {
  const categories = [
    { value: "general", label: "General" },
    { value: "construction", label: "Construction" },
    { value: "it_services", label: "IT Services" },
    { value: "consulting", label: "Consulting" },
    { value: "manufacturing", label: "Manufacturing" },
    { value: "supplies", label: "Supplies" },
    { value: "maintenance", label: "Maintenance" },
    { value: "custom", label: "Custom" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5" />
        <h3 className="text-lg font-medium">Basic Information</h3>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Template Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Standard Pricing Format"
                value={data.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={data.category} 
                onValueChange={(value) => onUpdate({ category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
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
              placeholder="Describe the purpose and usage of this pricing template..."
              value={data.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Template Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rows">Number of Rows</Label>
              <Input
                id="rows"
                type="number"
                min="1"
                max="20"
                value={data.template_data?.table_structure?.rows || 5}
                onChange={(e) => onUpdate({
                  template_data: {
                    ...data.template_data,
                    table_structure: {
                      ...data.template_data?.table_structure,
                      rows: parseInt(e.target.value) || 5
                    }
                  }
                })}
              />
              <p className="text-xs text-muted-foreground">
                Number of rows in the pricing table (1-20)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="columns">Number of Columns</Label>
              <Input
                id="columns"
                type="number"
                min="2"
                max="10"
                value={data.template_data?.table_structure?.columns || 4}
                onChange={(e) => onUpdate({
                  template_data: {
                    ...data.template_data,
                    table_structure: {
                      ...data.template_data?.table_structure,
                      columns: parseInt(e.target.value) || 4
                    }
                  }
                })}
              />
              <p className="text-xs text-muted-foreground">
                Number of columns in the pricing table (2-10)
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Pricing Template Structure</p>
                <p className="text-blue-700 mt-1">
                  This template will create a {data.template_data?.table_structure?.rows || 5} x {data.template_data?.table_structure?.columns || 4} pricing table 
                  where vendors can input their pricing information. You'll be able to define specific fields, 
                  calculations, and validation rules in the next step.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingTemplateBasicInfo;