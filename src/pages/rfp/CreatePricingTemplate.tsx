import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import PricingTemplateWizard from "@/components/rfp/PricingTemplateWizard";

const CreatePricingTemplate = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/rfp/templates")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Pricing Template</h1>
          <p className="text-muted-foreground">
            Design a pricing format that vendors can use to submit their bids
          </p>
        </div>
      </div>

      <PricingTemplateWizard />
    </div>
  );
};

export default CreatePricingTemplate;