import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PricingTemplateBasicInfo from "./pricing-template-wizard/PricingTemplateBasicInfo";
import PricingTemplateFieldDesigner from "./pricing-template-wizard/PricingTemplateFieldDesigner";
import PricingTemplatePreview from "./pricing-template-wizard/PricingTemplatePreview";

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

const PricingTemplateWizard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [templateData, setTemplateData] = useState<PricingTemplateData>({
    name: "",
    description: "",
    category: "general",
    template_data: {
      table_structure: {
        rows: 5,
        columns: 4
      },
      calculation_rules: []
    },
    fields: []
  });

  const steps = [
    { number: 1, title: "Basic Information", component: "basic" },
    { number: 2, title: "Field Designer", component: "fields" },
    { number: 3, title: "Preview & Save", component: "preview" }
  ];

  const currentStepData = steps.find(step => step.number === currentStep);
  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    if (currentStep === 1) {
      if (!templateData.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter a template name",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (currentStep === 2) {
      if (templateData.fields.length === 0) {
        toast({
          title: "Validation Error", 
          description: "Please add at least one field to the pricing template",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDataUpdate = (stepData: Partial<PricingTemplateData>) => {
    setTemplateData(prev => ({ ...prev, ...stepData }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create templates",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create the template
      const { data: template, error: templateError } = await supabase
        .from('pricing_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          template_data: templateData.template_data,
          created_by: user.id,
          is_active: true,
          is_default: false,
          usage_count: 0
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create the fields
      if (templateData.fields.length > 0) {
        const fieldsToInsert = templateData.fields.map((field, index) => ({
          template_id: template.id,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          description: field.description,
          calculation_formula: field.calculation_formula,
          field_options: field.field_options,
          is_required: field.is_required,
          display_order: index,
          row_number: field.row_number,
          column_number: field.column_number
        }));

        const { error: fieldsError } = await supabase
          .from('pricing_template_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      toast({
        title: "Success",
        description: "Pricing template created successfully",
      });

      navigate("/rfp/templates");
    } catch (error: any) {
      console.error('Error creating pricing template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create pricing template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStepData?.component) {
      case "basic":
        return (
          <PricingTemplateBasicInfo
            data={templateData}
            onUpdate={handleDataUpdate}
          />
        );
      case "fields":
        return (
          <PricingTemplateFieldDesigner
            data={templateData}
            onUpdate={handleDataUpdate}
          />
        );
      case "preview":
        return (
          <PricingTemplatePreview
            data={templateData}
            onUpdate={handleDataUpdate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Create Pricing Template</h2>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </div>
          
          <Progress value={progress} className="mb-4" />
          
          <div className="flex justify-between">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.number < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.number === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.number < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:inline">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          {currentStep === steps.length ? (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Template"}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingTemplateWizard;