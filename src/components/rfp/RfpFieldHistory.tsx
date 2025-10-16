import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { History, ArrowRight, FileText } from "lucide-react";
import { formatFieldName } from "@/utils/rfpHelpers";

interface FieldChange {
  addendum_number: number;
  addendum_title: string;
  published_at: string;
  field_name: string;
  old_value: any;
  new_value: any;
}

interface RfpFieldHistoryProps {
  rfpId: string;
  rfpData: any;
}

export const RfpFieldHistory: React.FC<RfpFieldHistoryProps> = ({ rfpId, rfpData }) => {
  const [fieldChanges, setFieldChanges] = useState<FieldChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFieldHistory();
  }, [rfpId]);

  const fetchFieldHistory = async () => {
    try {
      // Fetch all published addendums with their field overrides
      const { data: addendums, error } = await supabase
        .from('rfp_addendums')
        .select('*')
        .eq('rfp_id', rfpId)
        .eq('is_published', true)
        .order('addendum_number', { ascending: true });

      if (error) throw error;

      // Build a comprehensive change history
      const changes: FieldChange[] = [];
      let currentValues = { ...rfpData };

      addendums?.forEach((addendum) => {
        const overrides = addendum.field_overrides as Record<string, any>;
        
        Object.entries(overrides).forEach(([fieldName, newValue]) => {
          changes.push({
            addendum_number: addendum.addendum_number,
            addendum_title: addendum.title,
            published_at: addendum.published_at,
            field_name: fieldName,
            old_value: currentValues[fieldName],
            new_value: newValue
          });
          
          // Update current values for next iteration
          currentValues[fieldName] = newValue;
        });
      });

      setFieldChanges(changes);
    } catch (error) {
      console.error('Error fetching field history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatValue = (value: any, fieldName: string): string => {
    if (value === null || value === undefined) return 'Not set';
    
    // Date fields
    if (fieldName.includes('date') || fieldName.includes('deadline')) {
      try {
        return format(new Date(value), 'PPP p');
      } catch {
        return String(value);
      }
    }
    
    // Numeric fields
    if (fieldName.includes('value') || fieldName.includes('amount')) {
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    }
    
    // Boolean fields
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  };

  if (isLoading) {
    return <div className="p-4">Loading version history...</div>;
  }

  if (fieldChanges.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No field changes have been made through addendums yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            When addendums with field overrides are published, the change history will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Field Change History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {fieldChanges.map((change, index) => (
            <div key={`${change.addendum_number}-${change.field_name}-${index}`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="mt-1">
                    Addendum #{change.addendum_number}
                  </Badge>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="font-medium text-sm">
                      {change.addendum_title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Published: {format(new Date(change.published_at), 'PPP p')}
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="font-medium text-sm mb-2">
                      {formatFieldName(change.field_name)}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Previous Value</div>
                        <div className="font-mono text-xs bg-background p-2 rounded border">
                          {formatValue(change.old_value, change.field_name)}
                        </div>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">New Value</div>
                        <div className="font-mono text-xs bg-primary/10 p-2 rounded border border-primary/20 font-medium">
                          {formatValue(change.new_value, change.field_name)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {index < fieldChanges.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
