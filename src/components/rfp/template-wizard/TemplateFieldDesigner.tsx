
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TemplateWizardData, TemplateField } from "../TemplateCreationWizard";

interface TemplateFieldDesignerProps {
  data: TemplateWizardData;
  onUpdate: (data: Partial<TemplateWizardData>) => void;
  onNext: () => void;
}

const TemplateFieldDesigner = ({ data, onUpdate, onNext }: TemplateFieldDesignerProps) => {
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<TemplateField | null>(null);
  const [fieldForm, setFieldForm] = useState<Partial<TemplateField>>({
    field_name: "",
    field_label: "",
    field_type: "text",
    is_required: false,
    description: "",
    field_options: null
  });

  const fieldTypes = [
    { value: "text", label: "Text Input" },
    { value: "textarea", label: "Text Area" },
    { value: "select", label: "Dropdown/Select" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "checkbox", label: "Checkbox" },
    { value: "file", label: "File Upload" }
  ];

  const handleAddField = () => {
    setEditingField(null);
    setFieldForm({
      field_name: "",
      field_label: "",
      field_type: "text",
      is_required: false,
      description: "",
      field_options: null
    });
    setIsFieldDialogOpen(true);
  };

  const handleEditField = (field: TemplateField) => {
    setEditingField(field);
    setFieldForm({ ...field });
    setIsFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!fieldForm.field_name || !fieldForm.field_label) return;

    const newField: TemplateField = {
      id: editingField?.id || Date.now().toString(),
      field_name: fieldForm.field_name!,
      field_label: fieldForm.field_label!,
      field_type: fieldForm.field_type!,
      is_required: fieldForm.is_required!,
      display_order: editingField?.display_order || data.fields.length,
      description: fieldForm.description,
      field_options: fieldForm.field_options
    };

    let updatedFields = [...data.fields];
    if (editingField) {
      const index = updatedFields.findIndex(f => f.id === editingField.id);
      updatedFields[index] = newField;
    } else {
      updatedFields.push(newField);
    }

    onUpdate({ fields: updatedFields });
    setIsFieldDialogOpen(false);
  };

  const handleDeleteField = (fieldId: string) => {
    const updatedFields = data.fields.filter(f => f.id !== fieldId);
    onUpdate({ fields: updatedFields });
  };

  const handleFieldOrderChange = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = data.fields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= data.fields.length) return;

    const updatedFields = [...data.fields];
    [updatedFields[currentIndex], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[currentIndex]];
    
    // Update display_order
    updatedFields.forEach((field, index) => {
      field.display_order = index;
    });

    onUpdate({ fields: updatedFields });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Custom Fields</h3>
          <p className="text-sm text-muted-foreground">
            Add custom fields that will be included in RFPs created from this template
          </p>
        </div>
        <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddField}>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingField ? "Edit Field" : "Add Custom Field"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Field Name *</Label>
                  <Input
                    placeholder="e.g., technical_specs"
                    value={fieldForm.field_name}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Field Label *</Label>
                  <Input
                    placeholder="e.g., Technical Specifications"
                    value={fieldForm.field_label}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, field_label: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select
                  value={fieldForm.field_type}
                  onValueChange={(value) => setFieldForm(prev => ({ ...prev, field_type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {fieldForm.field_type === 'select' && (
                <div className="space-y-2">
                  <Label>Options (one per line)</Label>
                  <Textarea
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    value={fieldForm.field_options?.options?.join('\n') || ''}
                    onChange={(e) => setFieldForm(prev => ({
                      ...prev,
                      field_options: { options: e.target.value.split('\n').filter(Boolean) }
                    }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Help text for this field"
                  value={fieldForm.description}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="required"
                  checked={fieldForm.is_required}
                  onCheckedChange={(checked) => setFieldForm(prev => ({ ...prev, is_required: checked as boolean }))}
                />
                <Label htmlFor="required">Required field</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveField}>
                  {editingField ? "Update Field" : "Add Field"}
                </Button>
                <Button variant="outline" onClick={() => setIsFieldDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {data.fields.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No custom fields added yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Custom fields will be included in RFPs created from this template.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div>
                      <h4 className="font-medium">{field.field_label}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{field.field_type}</Badge>
                        <span>({field.field_name})</span>
                        {field.is_required && <Badge variant="secondary">Required</Badge>}
                      </div>
                      {field.description && (
                        <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFieldOrderChange(field.id, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFieldOrderChange(field.id, 'down')}
                      disabled={index === data.fields.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditField(field)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteField(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateFieldDesigner;
