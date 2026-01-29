import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Percent, AlertTriangle } from "lucide-react";
import type { MatchingSettings as MatchingSettingsType } from "@/types/grn";

const MatchingSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<MatchingSettingsType | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('matching_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings exist, create default
          const { data: newSettings, error: createError } = await supabase
            .from('matching_settings')
            .insert({
              price_tolerance_percentage: 5,
              quantity_tolerance_percentage: 5,
              tax_tolerance_percentage: 2,
              total_tolerance_percentage: 5,
              strict_matching_mode: false,
              allow_over_receipt: false,
              require_grn_for_invoice: true,
              auto_approve_matched: false,
            })
            .select()
            .single();

          if (createError) throw createError;
          setSettings(newSettings);
        } else {
          throw error;
        }
      } else {
        setSettings(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load matching settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('matching_settings')
        .update({
          price_tolerance_percentage: settings.price_tolerance_percentage,
          quantity_tolerance_percentage: settings.quantity_tolerance_percentage,
          tax_tolerance_percentage: settings.tax_tolerance_percentage,
          total_tolerance_percentage: settings.total_tolerance_percentage,
          strict_matching_mode: settings.strict_matching_mode,
          allow_over_receipt: settings.allow_over_receipt,
          require_grn_for_invoice: settings.require_grn_for_invoice,
          auto_approve_matched: settings.auto_approve_matched,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Matching settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof MatchingSettingsType, value: number | boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <AlertTriangle className="h-5 w-5 mr-2" />
        Failed to load settings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">3-Way Matching Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure tolerance levels for invoice, PO, and GRN matching
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tolerance Levels Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Tolerance Levels
            </CardTitle>
            <CardDescription>
              Set acceptable variance percentages for matching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price-tolerance">Price Tolerance (%)</Label>
              <Input
                id="price-tolerance"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.price_tolerance_percentage}
                onChange={(e) => updateSetting('price_tolerance_percentage', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Allowed variance between invoice and PO unit prices
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity-tolerance">Quantity Tolerance (%)</Label>
              <Input
                id="quantity-tolerance"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.quantity_tolerance_percentage}
                onChange={(e) => updateSetting('quantity_tolerance_percentage', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Allowed variance between received and ordered quantities
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-tolerance">Tax Tolerance (%)</Label>
              <Input
                id="tax-tolerance"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.tax_tolerance_percentage}
                onChange={(e) => updateSetting('tax_tolerance_percentage', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Allowed variance in tax calculations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total-tolerance">Total Amount Tolerance (%)</Label>
              <Input
                id="total-tolerance"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.total_tolerance_percentage}
                onChange={(e) => updateSetting('total_tolerance_percentage', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Allowed variance between invoice total and PO/GRN totals
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Matching Behavior Card */}
        <Card>
          <CardHeader>
            <CardTitle>Matching Behavior</CardTitle>
            <CardDescription>
              Configure how matching rules are applied
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="strict-mode">Strict Matching Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Require exact matches (0% tolerance) for all fields
                </p>
              </div>
              <Switch
                id="strict-mode"
                checked={settings.strict_matching_mode}
                onCheckedChange={(checked) => updateSetting('strict_matching_mode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-over-receipt">Allow Over-Receipt</Label>
                <p className="text-xs text-muted-foreground">
                  Allow receiving more than ordered quantity
                </p>
              </div>
              <Switch
                id="allow-over-receipt"
                checked={settings.allow_over_receipt}
                onCheckedChange={(checked) => updateSetting('allow_over_receipt', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require-grn">Require GRN for Invoice</Label>
                <p className="text-xs text-muted-foreground">
                  Invoice approval requires linked GRN
                </p>
              </div>
              <Switch
                id="require-grn"
                checked={settings.require_grn_for_invoice}
                onCheckedChange={(checked) => updateSetting('require_grn_for_invoice', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-approve">Auto-Approve Matched</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically approve invoices within tolerance
                </p>
              </div>
              <Switch
                id="auto-approve"
                checked={settings.auto_approve_matched}
                onCheckedChange={(checked) => updateSetting('auto_approve_matched', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MatchingSettings;
