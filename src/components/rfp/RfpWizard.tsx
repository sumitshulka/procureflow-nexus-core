import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<RfpWizardData>({
    basicInfo: {},
    boqItems: [],
    vendors: [],
    isPublic: false,
    terms: {},
  });

  const steps = [
    { number: 1, title: "Basic Information", component: RfpBasicInfo },
    { number: 2, title: "Bill of Quantities (BOQ)", component: RfpBoq },
    { number: 3, title: "Vendor Selection", component: RfpVendors },
    { number: 4, title: "Terms & Conditions", component: RfpTerms },
    { number: 5, title: "Review & Submit", component: RfpReview },
  ];

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
    if (!CurrentStepComponent) return null;

    // Pass different props based on the step
    if (currentStep === 5) {
      // Review step only needs data and onUpdate
      return (
        <CurrentStepComponent
          data={wizardData}
          onUpdate={updateWizardData}
        />
      );
    } else if (currentStep === 4) {
      // Terms step needs data, onUpdate, and onNext
      return (
        <CurrentStepComponent
          data={wizardData}
          onUpdate={updateWizardData}
          onNext={handleNext}
        />
      );
    } else {
      // Other steps need all props
      return (
        <CurrentStepComponent
          data={wizardData}
          onUpdate={updateWizardData}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      );
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Request for Proposal (RFP)</CardTitle>
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
