import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileEdit } from "lucide-react";

interface FieldOverrideIndicatorProps {
  fieldName: string;
  hasOverride: boolean;
}

export const FieldOverrideIndicator: React.FC<FieldOverrideIndicatorProps> = ({ 
  fieldName, 
  hasOverride 
}) => {
  if (!hasOverride) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="ml-2 text-xs">
            <FileEdit className="h-3 w-3 mr-1" />
            Modified
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This field has been updated through an addendum</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
