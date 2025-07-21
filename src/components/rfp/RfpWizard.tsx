
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import RfpBasicInfo from "./RfpBasicInfo";
import RfpBoq from "./RfpBoq";
import RfpVendors from "./RfpVendors";
import RfpTerms from "./RfpTerms";
import RfpReview from "./RfpReview";

export interface RfpWizardData {
  basicInfo: any;
  boqItems: any[];
  vendors: any[];
  isPublic: boolean;
  publicLink?: string;
  terms: any;
  specialTerms?: string;
  paymentTerms?: string;
}

const RfpWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<RfpWizardData>({
    basicInfo: {},
    boqItems: [],
    vendors: [],
    isPublic: false,
    terms: {},
  });

  // Check for template data and mode from URL parameters
  useEffect(() => {
    const templateParam = searchParams.get('template');
    const mode = searchParams.get('mode');
    
    if (templateParam) {
      try {
        const templateData = JSON.parse(decodeURIComponent(templateParam));
        
        // Pre-populate wizard data with template data
        setWizardData(prev => ({
          ...prev,
          basicInfo: {
            title: templateData.template_data?.title || templateData.name,
            description: templateData.template_data?.description || templateData.description,
            category: templateData.category,
            estimatedValue: '',
            currency: 'USD',
            submissionDeadline: '',
            // Include custom fields from template
            customFields: templateData.fields?.reduce((acc: any, field: any) => {
              acc[field.field_name] = '';
              return acc;
            }, {}) || {}
          },
          terms: {
            termsAndConditions: templateData.template_data?.terms_and_conditions || '',
            evaluationCriteria: templateData.template_data?.evaluation_criteria || {},
            paymentTerms: templateData.template_data?.payment_terms || '',
            deliveryTerms: templateData.template_data?.delivery_terms || '',
            warrantyRequirements: templateData.template_data?.warranty_requirements || ''
          }
        }));
      } catch (error) {
        console.error('Error parsing template data:', error);
      }
    }
  }, [searchParams]);

  // Determine steps based on mode
  const mode = searchParams.get('mode');
  const templateParam = searchParams.get('template');
  
  const getSteps = () => {
    if (mode === 'advanced') {
      // Advanced mode: Complete workflow with all steps
      return [
        { number: 1, title: "Basic Information", component: RfpBasicInfo },
        { number: 2, title: "Bill of Quantities (BOQ)", component: RfpBoq },
        { number: 3, title: "Vendor Selection", component: RfpVendors },
        { number: 4, title: "Terms & Conditions", component: RfpTerms },
        { number: 5, title: "Review & Submit", component: RfpReview },
      ];
    } else if (templateParam) {
      // Template mode: Focus on customizing template data with combined BOQ + vendor step
      return [
        { number: 1, title: "Basic Information & Custom Fields", component: RfpBasicInfo },
        { number: 2, title: "Items & Vendor Selection", component: RfpBoq },
        { number: 3, title: "Terms & Conditions", component: RfpTerms },
        { number: 4, title: "Review & Submit", component: RfpReview },
      ];
    } else {
      // Quick start mode: Simplified with combined BOQ + vendor selection
      return [
        { number: 1, title: "Basic Information", component: RfpBasicInfo },
        { number: 2, title: "Items & Vendor Selection", component: RfpBoq }, // Combined step
        { number: 3, title: "Review & Submit", component: RfpReview },
      ];
    }
  };

  const steps = getSteps();

  const currentStepData = steps.find(step => step.number === currentStep);
  const CurrentStepComponent = currentStepData?.component;

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

  const updateWizardData = (stepData: any) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  };

  const progress = (currentStep / steps.length) * 100;

  const renderCurrentStep = () => {
    const step = steps[currentStep - 1];
    if (!step) return null;

    const props = {
      data: wizardData,
      onUpdate: updateWizardData,
      onNext: handleNext,
      templateData: templateParam ? JSON.parse(decodeURIComponent(templateParam)) : null,
      mode: mode || 'quick'
    };

    switch (step.component) {
      case RfpBasicInfo:
        return <RfpBasicInfo {...props} />;
      case RfpBoq:
        return <RfpBoq {...props} />;
      case RfpVendors:
        return <RfpVendors {...props} />;
      case RfpTerms:
        return <RfpTerms {...props} />;
      case RfpReview:
        return <RfpReview {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {templateParam ? 'Create RFP from Template' : 
             mode === 'advanced' ? 'Create RFP - Advanced Setup' : 
             'Create RFP - Quick Start'}
          </CardTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {steps.length}: {currentStepData?.title}</span>
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
              onClick={currentStep === 1 ? () => navigate("/rfp/active") : handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              {currentStep === 1 ? "Cancel" : "Previous"}
            </Button>

            {currentStep < steps.length && (
              <Button onClick={handleNext}>
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

export default RfpWizard;
