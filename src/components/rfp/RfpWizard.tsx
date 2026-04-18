import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Check, Circle, FileText, ListChecks, Users, Calculator, ScrollText, ClipboardCheck, Sparkles, Lock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import RfpBasicInfo from "./RfpBasicInfo";
import RfpBoq from "./RfpBoq";
import TechnicalScoringManager from "./TechnicalScoringManager";
import RfpVendors from "./RfpVendors";
import RfpPricingFormat from "./RfpPricingFormat";
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
  pricingTemplate?: any;
}

type StepKey = "basic" | "boq" | "tech" | "vendors" | "pricing" | "terms" | "review";

interface StepDef {
  key: StepKey;
  number: number;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  component: any;
}

const RfpWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [wizardData, setWizardData] = useState<RfpWizardData>({
    basicInfo: {},
    boqItems: [],
    vendors: [],
    isPublic: false,
    terms: {},
  });

  useEffect(() => {
    const rfpId = searchParams.get("rfpId");
    const templateParam = searchParams.get("template");

    if (rfpId) {
      loadRfpData(rfpId);
    } else if (templateParam) {
      try {
        const templateData = JSON.parse(decodeURIComponent(templateParam));
        setWizardData((prev) => ({
          ...prev,
          basicInfo: {
            title: templateData.template_data?.title || templateData.name,
            description: templateData.template_data?.description || templateData.description,
            category: templateData.category,
            estimatedValue: "",
            currency: "USD",
            submissionDeadline: "",
            customFields:
              templateData.fields?.reduce((acc: any, field: any) => {
                acc[field.field_name] = "";
                return acc;
              }, {}) || {},
          },
          terms: {
            termsAndConditions: templateData.template_data?.terms_and_conditions || "",
            evaluationCriteria: templateData.template_data?.evaluation_criteria || {},
            paymentTerms: templateData.template_data?.payment_terms || "",
            deliveryTerms: templateData.template_data?.delivery_terms || "",
            warrantyRequirements: templateData.template_data?.warranty_requirements || "",
          },
        }));
      } catch (error) {
        console.error("Error parsing template data:", error);
      }
    }
  }, [searchParams]);

  const loadRfpData = async (rfpId: string) => {
    try {
      setIsLoading(true);
      const { data: rfpData, error: rfpError } = await supabase
        .from("rfps")
        .select("*")
        .eq("id", rfpId)
        .single();
      if (rfpError) throw rfpError;
      if (rfpData) {
        const evaluationCriteria = rfpData.evaluation_criteria as any;
        const boqItems = evaluationCriteria?.boq_items || [];
        setWizardData({
          basicInfo: {
            id: rfpData.id,
            title: rfpData.title,
            description: rfpData.description,
            rfpNumber: rfpData.rfp_number,
            estimatedValue: rfpData.estimated_value,
            currency: rfpData.currency,
            submissionDeadline: rfpData.submission_deadline,
            technicalDeadline: rfpData.technical_evaluation_deadline,
            commercialDeadline: rfpData.commercial_evaluation_deadline,
            preBidMeetingDate: rfpData.pre_bid_meeting_date,
            preBidMeetingVenue: rfpData.pre_bid_meeting_venue,
            bidValidityPeriod: rfpData.bid_validity_period,
            status: rfpData.status,
          },
          boqItems,
          vendors: [],
          isPublic: false,
          terms: {
            termsAndConditions: rfpData.terms_and_conditions,
            minimumEligibilityCriteria: rfpData.minimum_eligibility_criteria,
            paymentTerms: rfpData.payment_terms,
            deliveryTerms: rfpData.delivery_terms,
            warrantyRequirements: rfpData.warranty_requirements,
            evaluationCriteria: rfpData.evaluation_criteria,
          },
        });
        toast({ title: "RFP Loaded", description: "Existing RFP data has been loaded for editing." });
      }
    } catch (error: any) {
      console.error("Error loading RFP data:", error);
      toast({ title: "Error", description: error.message || "Failed to load RFP data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const mode = searchParams.get("mode");
  const templateParam = searchParams.get("template");
  const rfpId = searchParams.get("rfpId");

  const steps: StepDef[] = useMemo(() => {
    const hasTechnicalScoring = wizardData.basicInfo?.enable_technical_scoring;
    if (mode === "advanced") {
      const arr: StepDef[] = [
        { key: "basic", number: 1, title: "Basic Information", shortTitle: "Basics", icon: FileText, component: RfpBasicInfo },
        { key: "boq", number: 2, title: "Bill of Quantities", shortTitle: "BOQ", icon: ListChecks, component: RfpBoq },
      ];
      let n = 3;
      if (hasTechnicalScoring) {
        arr.push({ key: "tech", number: n++, title: "Technical Scoring", shortTitle: "Scoring", icon: Sparkles, component: TechnicalScoringManager });
      }
      arr.push({ key: "vendors", number: n++, title: "Vendor Selection", shortTitle: "Vendors", icon: Users, component: RfpVendors });
      arr.push({ key: "pricing", number: n++, title: "Pricing Format", shortTitle: "Pricing", icon: Calculator, component: RfpPricingFormat });
      arr.push({ key: "terms", number: n++, title: "Terms & Conditions", shortTitle: "Terms", icon: ScrollText, component: RfpTerms });
      arr.push({ key: "review", number: n++, title: "Review & Submit", shortTitle: "Review", icon: ClipboardCheck, component: RfpReview });
      return arr;
    } else if (templateParam) {
      return [
        { key: "basic", number: 1, title: "Basic Information & Custom Fields", shortTitle: "Basics", icon: FileText, component: RfpBasicInfo },
        { key: "boq", number: 2, title: "Items & Vendor Selection", shortTitle: "Items", icon: ListChecks, component: RfpBoq },
        { key: "pricing", number: 3, title: "Pricing Format", shortTitle: "Pricing", icon: Calculator, component: RfpPricingFormat },
        { key: "terms", number: 4, title: "Terms & Conditions", shortTitle: "Terms", icon: ScrollText, component: RfpTerms },
        { key: "review", number: 5, title: "Review & Submit", shortTitle: "Review", icon: ClipboardCheck, component: RfpReview },
      ];
    }
    return [
      { key: "basic", number: 1, title: "Basic Information", shortTitle: "Basics", icon: FileText, component: RfpBasicInfo },
      { key: "boq", number: 2, title: "Items & Vendor Selection", shortTitle: "Items", icon: ListChecks, component: RfpBoq },
      { key: "pricing", number: 3, title: "Pricing Format", shortTitle: "Pricing", icon: Calculator, component: RfpPricingFormat },
      { key: "review", number: 4, title: "Review & Submit", shortTitle: "Review", icon: ClipboardCheck, component: RfpReview },
    ];
  }, [mode, templateParam, wizardData.basicInfo?.enable_technical_scoring]);

  const currentStepData = steps.find((s) => s.number === currentStep) || steps[0];
  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleStepClick = (stepNumber: number) => {
    // Sequential only: allow navigation to current or completed steps only
    if (stepNumber <= currentStep || completedSteps.has(stepNumber - 1)) {
      setCurrentStep(stepNumber);
    } else {
      toast({
        title: "Step locked",
        description: "Complete the current step before moving forward.",
        variant: "destructive",
      });
    }
  };

  const updateWizardData = (stepData: any) => {
    setWizardData((prev) => ({ ...prev, ...stepData }));
  };

  const renderCurrentStep = () => {
    const step = steps[currentStep - 1];
    if (!step) return null;
    const props = {
      data: wizardData,
      onUpdate: updateWizardData,
      onNext: handleNext,
      templateData: templateParam ? JSON.parse(decodeURIComponent(templateParam)) : null,
      mode: mode || "quick",
      rfpId: rfpId || undefined,
      isEditMode: !!rfpId,
    };
    switch (step.component) {
      case RfpBasicInfo:
        return <RfpBasicInfo {...props} />;
      case RfpBoq:
        return <RfpBoq {...props} />;
      case TechnicalScoringManager:
        return <TechnicalScoringManager rfpId={props.rfpId || ""} onUpdate={() => handleNext()} />;
      case RfpVendors:
        return <RfpVendors {...props} />;
      case RfpPricingFormat:
        return <RfpPricingFormat {...props} />;
      case RfpTerms:
        return <RfpTerms {...props} />;
      case RfpReview:
        return <RfpReview {...props} />;
      default:
        return null;
    }
  };

  const headerTitle = rfpId
    ? "Edit RFP"
    : templateParam
      ? "Create RFP from Template"
      : mode === "advanced"
        ? "Create RFP — Advanced Setup"
        : "Create RFP — Quick Start";

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading RFP data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sticky header with title + horizontal stepper */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/rfp/active")}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Exit
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
                  {headerTitle}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  Step {currentStep} of {steps.length}: {currentStepData.title}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 hidden sm:inline-flex">
              {Math.round(progress)}% complete
            </Badge>
          </div>

          {/* Horizontal stepper */}
          <nav aria-label="Progress" className="overflow-x-auto -mx-4 px-4 pb-1">
            <ol className="flex items-center min-w-max gap-0">
              {steps.map((step, idx) => {
                const isCompleted = completedSteps.has(step.number) && step.number < currentStep;
                const isCurrent = step.number === currentStep;
                const isLocked = step.number > currentStep && !completedSteps.has(step.number - 1);
                const Icon = step.icon;
                return (
                  <li key={step.key} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.number)}
                      disabled={isLocked}
                      className={cn(
                        "group flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                        isCurrent && "bg-primary text-primary-foreground shadow-sm",
                        !isCurrent && isCompleted && "text-foreground hover:bg-accent",
                        !isCurrent && !isCompleted && !isLocked && "text-muted-foreground hover:bg-accent",
                        isLocked && "text-muted-foreground/50 cursor-not-allowed"
                      )}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium shrink-0",
                          isCurrent && "border-primary-foreground/40 bg-primary-foreground/10",
                          !isCurrent && isCompleted && "border-primary bg-primary text-primary-foreground",
                          !isCurrent && !isCompleted && !isLocked && "border-border bg-background",
                          isLocked && "border-border/50 bg-muted"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : isLocked ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          step.number
                        )}
                      </span>
                      <span className="font-medium whitespace-nowrap hidden md:inline">
                        {step.shortTitle}
                      </span>
                      <Icon className="h-4 w-4 md:hidden" />
                    </button>
                    {idx < steps.length - 1 && (
                      <div
                        className={cn(
                          "h-px w-6 mx-1 shrink-0",
                          completedSteps.has(step.number) && step.number < currentStep
                            ? "bg-primary"
                            : "bg-border"
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>

      {/* Main content + summary sidebar */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Step content */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <currentStepData.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">{currentStepData.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      Fill in the required details to continue.
                    </p>
                  </div>
                </div>
              </div>

              {renderCurrentStep()}

              <div className="flex justify-between items-center mt-8 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={currentStep === 1 ? () => navigate("/rfp/active") : handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {currentStep === 1 ? "Cancel" : "Previous"}
                </Button>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Use the <span className="font-medium text-foreground">Continue</span> button above
                  to validate and proceed.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Summary sidebar */}
          <aside className="hidden xl:block">
            <div className="sticky top-[180px] space-y-4">
              <Card className="border-border/60">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    RFP Summary
                  </h3>
                  <dl className="space-y-3 text-sm">
                    <SummaryRow
                      label="Title"
                      value={wizardData.basicInfo?.title}
                    />
                    <SummaryRow
                      label="Estimated value"
                      value={
                        wizardData.basicInfo?.estimated_value
                          ? `${wizardData.basicInfo?.currency || "USD"} ${Number(
                              wizardData.basicInfo?.estimated_value
                            ).toLocaleString()}`
                          : undefined
                      }
                    />
                    <SummaryRow
                      label="Submission deadline"
                      value={
                        wizardData.basicInfo?.submission_deadline
                          ? new Date(wizardData.basicInfo.submission_deadline).toLocaleDateString()
                          : undefined
                      }
                    />
                    <SummaryRow
                      label="BOQ items"
                      value={wizardData.boqItems?.length ? `${wizardData.boqItems.length} item(s)` : undefined}
                    />
                    <SummaryRow
                      label="Vendors"
                      value={
                        wizardData.isPublic
                          ? "Public RFP"
                          : wizardData.vendors?.length
                            ? `${wizardData.vendors.length} selected`
                            : undefined
                      }
                    />
                    <SummaryRow
                      label="Pricing template"
                      value={wizardData.pricingTemplate?.name}
                    />
                  </dl>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-primary/5">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold mb-2">Step progress</h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold tracking-tight">
                      {currentStep}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {steps.length}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Steps unlock sequentially. Complete the current step to continue.
                  </p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const SummaryRow: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className={cn("text-sm font-medium truncate", !value && "text-muted-foreground/60 italic font-normal")}>
      {value || "Not set"}
    </dd>
  </div>
);

export default RfpWizard;
