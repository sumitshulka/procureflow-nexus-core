
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TemplateWizardData } from "../TemplateCreationWizard";

interface TemplatePreviewProps {
  data: TemplateWizardData;
  onSave: () => void;
  isSubmitting: boolean;
}

const TemplatePreview = ({ data, onSave, isSubmitting }: TemplatePreviewProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Template Preview</h3>
        <p className="text-sm text-muted-foreground">
          Review your template before saving. This will be used to create RFPs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Template Name</p>
              <p>{data.basicInfo.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <p>{data.basicInfo.category}</p>
            </div>
          </div>
          
          {data.basicInfo.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p>{data.basicInfo.description}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-muted-foreground">Default RFP Title</p>
            <p>{data.basicInfo.title}</p>
          </div>

          {data.basicInfo.rfpDescription && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Default RFP Description</p>
              <p className="whitespace-pre-wrap">{data.basicInfo.rfpDescription}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Evaluation Method</p>
              <p>{data.basicInfo.evaluation_type.toUpperCase().replace('_', ' ')}</p>
            </div>
            {data.basicInfo.evaluation_type === 'qcbs' && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weights</p>
                <p>Technical: {data.basicInfo.technical_weight}%, Commercial: {data.basicInfo.commercial_weight}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Fields ({data.fields.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.fields.length === 0 ? (
            <p className="text-muted-foreground">No custom fields defined.</p>
          ) : (
            <div className="space-y-3">
              {data.fields.map((field, index) => (
                <div key={field.id} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{field.field_label}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{field.field_type}</Badge>
                      {field.is_required && <Badge variant="secondary">Required</Badge>}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">Field name: {field.field_name}</p>
                  
                  {field.description && (
                    <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
                  )}
                  
                  {field.field_type === 'select' && field.field_options?.options && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Options:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {field.field_options.options.map((option: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {option}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Template"}
        </Button>
      </div>
    </div>
  );
};

export default TemplatePreview;
