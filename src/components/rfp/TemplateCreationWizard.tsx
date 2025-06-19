
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TemplateBasicInfo from "./template-wizard/TemplateBasicInfo";
import TemplateFieldDesigner from "./template-wizard/TemplateFieldDesigner";
import TemplatePreview from "./template-wizard/TemplatePreview";

export interface TemplateField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'file';
  field_options?: any;
  is_required: boolean;
  display_order: number;
  description?: string;
}

export interface TemplateWizardData {
  basicInfo: {
    name: string;
    description: string;
    category: string;
    title: string;
    rfpDescription: string;
    terms_and_conditions: string;
    evaluation_type: string;
    technical_weight?: number;
    commercial_weight?: number;
  };
  fields: TemplateField[];
}

const TemplateCreationWizard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardData, setWizardData] = useState<TemplateWizardData>({
    basicInfo: {
      name: "",
      description: "",
      category: "",
      title: "",
      rfpDescription: "",
      terms_and_conditions: "",
      evaluation_type: "qcbs",
      technical_weight: 70,
      commercial_weight: 30,
    },
    fields: [],
  });

  const steps = [
    { number: 1, title: "Basic Information", component: TemplateBasicInfo },
    { number: 2, title: "Field Designer", component: TemplateFieldDesigner },
    { number: 3, title: "Preview & Save", component: TemplatePreview },
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateWizardData = (stepData: Partial<TemplateWizardData>) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  };

  const handleSaveTemplate = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create template data structure
      const templateData = {
        title: wizardData.basicInfo.title,
        description: wizardData.basicInfo.rfpDescription,
        terms_and_conditions: wizardData.basicInfo.terms_and_conditions,
        evaluation_criteria: {
          type: wizardData.basicInfo.evaluation_type,
          ...(wizardData.basicInfo.evaluation_type === 'qcbs' && {
            technical_weight: wizardData.basicInfo.technical_weight,
            commercial_weight: wizardData.basicInfo.commercial_weight
          })
        }
      };

      // Insert template
      const { data: template, error: templateError } = await supabase
        .from('rfp_templates')
        .insert({
          name: wizardData.basicInfo.name,
          description: wizardData.basicInfo.description,
          category: wizardData.basicInfo.category,
          template_data: templateData,
          created_by: user.id
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert template fields
      if (wizardData.fields.length > 0) {
        const fieldsToInsert = wizardData.fields.map(field => ({
          template_id: template.id,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options,
          is_required: field.is_required,
          display_order: field.display_order,
          description: field.description
        }));

        const { error: fieldsError } = await supabase
          .from('rfp_template_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      toast({
        title: "Success",
        description: "Template created successfully",
      });

      navigate("/rfp/templates");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <TemplateBasicInfo
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <TemplateFieldDesigner
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={handleNext}
          />
        );
      case 3:
        return (
          <TemplatePreview
            data={wizardData}
            onSave={handleSaveTemplate}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Create RFP Template</CardTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.title}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>
        <CardContent>
          {renderCurrentStep()}

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? () => navigate("/rfp/templates") : handlePrevious}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              {currentStep === 1 ? "Cancel" : "Previous"}
            </Button>

            {currentStep < steps.length && (
              <Button onClick={handleNext} disabled={isSubmitting}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateCreationWizard;
