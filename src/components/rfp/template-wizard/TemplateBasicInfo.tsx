
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateWizardData } from "../TemplateCreationWizard";

interface TemplateBasicInfoProps {
  data: TemplateWizardData;
  onUpdate: (data: Partial<TemplateWizardData>) => void;
  onNext: () => void;
}

const TemplateBasicInfo = ({ data, onUpdate, onNext }: TemplateBasicInfoProps) => {
  const handleInputChange = (field: string, value: string | number) => {
    onUpdate({
      basicInfo: {
        ...data.basicInfo,
        [field]: value
      }
    });
  };

  const handleNext = () => {
    if (!data.basicInfo.name || !data.basicInfo.category || !data.basicInfo.title) {
      return; // Add validation if needed
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="template-name">Template Name *</Label>
          <Input
            id="template-name"
            placeholder="Enter template name"
            value={data.basicInfo.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            placeholder="e.g., IT, Services, Construction"
            value={data.basicInfo.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-description">Template Description</Label>
        <Textarea
          id="template-description"
          placeholder="Describe what this template is for"
          value={data.basicInfo.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rfp-title">Default RFP Title *</Label>
        <Input
          id="rfp-title"
          placeholder="Enter default RFP title"
          value={data.basicInfo.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rfp-description">Default RFP Description</Label>
        <Textarea
          id="rfp-description"
          placeholder="Enter default RFP description"
          value={data.basicInfo.rfpDescription}
          onChange={(e) => handleInputChange('rfpDescription', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="terms">Default Terms & Conditions</Label>
        <Textarea
          id="terms"
          placeholder="Enter default terms and conditions"
          value={data.basicInfo.terms_and_conditions}
          onChange={(e) => handleInputChange('terms_and_conditions', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="evaluation-type">Evaluation Method</Label>
        <Select
          value={data.basicInfo.evaluation_type}
          onValueChange={(value) => handleInputChange('evaluation_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select evaluation method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="qcbs">QCBS (Quality & Cost Based)</SelectItem>
            <SelectItem value="price_l1">Price L1 (Lowest Price)</SelectItem>
            <SelectItem value="technical_l1">Technical L1 (Highest Technical Score)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.basicInfo.evaluation_type === 'qcbs' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="technical-weight">Technical Weight (%)</Label>
            <Input
              id="technical-weight"
              type="number"
              min="0"
              max="100"
              value={data.basicInfo.technical_weight}
              onChange={(e) => handleInputChange('technical_weight', parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commercial-weight">Commercial Weight (%)</Label>
            <Input
              id="commercial-weight"
              type="number"
              min="0"
              max="100"
              value={data.basicInfo.commercial_weight}
              onChange={(e) => handleInputChange('commercial_weight', parseInt(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateBasicInfo;
