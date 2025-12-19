import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, ArrowLeft, AlertTriangle, Shield, TrendingDown, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/currencyUtils";

const VendorRiskReportPage = () => {
  const navigate = useNavigate();

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors-risk-assessment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("*")
        .eq("status", "approved");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: purchaseOrders = [], isLoading: posLoading } = useQuery({
    queryKey: ["pos-for-risk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate risk metrics for each vendor
  const vendorRisks = vendors.map((vendor: any) => {
    const vendorPOs = purchaseOrders.filter((po: any) => po.vendor_id === vendor.id);
    
    const totalSpend = vendorPOs.reduce((sum: number, po: any) => sum + (po.final_amount || 0), 0);
    const poCount = vendorPOs.length;
    
    // Calculate risk factors
    const lateDeliveries = vendorPOs.filter((po: any) => 
      po.actual_delivery_date && po.expected_delivery_date && 
      new Date(po.actual_delivery_date) > new Date(po.expected_delivery_date)
    ).length;
    const deliveryRiskScore = poCount > 0 ? (lateDeliveries / poCount) * 100 : 0;
    
    // Concentration risk (how much of total spend is with this vendor)
    const totalSystemSpend = purchaseOrders.reduce((sum: number, po: any) => sum + (po.final_amount || 0), 0);
    const concentrationRisk = totalSystemSpend > 0 ? (totalSpend / totalSystemSpend) * 100 : 0;
    
    // Dependency risk (based on number of POs)
    const dependencyRisk = Math.min(100, poCount * 5);
    
    // Calculate overall risk score
    const overallRisk = Math.round((deliveryRiskScore * 0.4 + concentrationRisk * 0.35 + dependencyRisk * 0.25));
    
    // Risk factors list
    const riskFactors: string[] = [];
    if (deliveryRiskScore > 20) riskFactors.push("High late delivery rate");
    if (concentrationRisk > 30) riskFactors.push("High spend concentration");
    if (poCount > 20) riskFactors.push("High dependency");
    if (lateDeliveries > 5) riskFactors.push("Multiple delivery delays");

    return {
      id: vendor.id,
      name: vendor.company_name,
      totalSpend,
      poCount,
      lateDeliveries,
      deliveryRiskScore: Math.round(deliveryRiskScore),
      concentrationRisk: Math.round(concentrationRisk),
      dependencyRisk: Math.round(dependencyRisk),
      overallRisk,
      riskFactors,
      riskLevel: overallRisk >= 60 ? "high" : overallRisk >= 30 ? "medium" : "low",
    };
  }).sort((a, b) => b.overallRisk - a.overallRisk);

  const highRiskCount = vendorRisks.filter(v => v.riskLevel === "high").length;
  const mediumRiskCount = vendorRisks.filter(v => v.riskLevel === "medium").length;
  const lowRiskCount = vendorRisks.filter(v => v.riskLevel === "low").length;

  const isLoading = vendorsLoading || posLoading;

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge variant="destructive">High Risk</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Medium Risk</Badge>;
      default:
        return <Badge className="bg-green-500">Low Risk</Badge>;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 60) return "text-destructive";
    if (score >= 30) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Vendor Risk Assessment"
          description="Identify and assess risks associated with vendor relationships"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{highRiskCount}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Medium Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{mediumRiskCount}</div>
          </CardContent>
        </Card>
        <Card className="border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Low Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{lowRiskCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Risk Assessment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Risk Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">PO Count</TableHead>
                  <TableHead className="text-right">Delivery Risk</TableHead>
                  <TableHead className="text-right">Concentration Risk</TableHead>
                  <TableHead className="text-right">Overall Risk</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Risk Factors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorRisks.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(vendor.totalSpend)}</TableCell>
                    <TableCell className="text-right">{vendor.poCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={vendor.deliveryRiskScore} className="w-16" />
                        <span className={getRiskColor(vendor.deliveryRiskScore)}>
                          {vendor.deliveryRiskScore}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={vendor.concentrationRisk} className="w-16" />
                        <span className={getRiskColor(vendor.concentrationRisk)}>
                          {vendor.concentrationRisk}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${getRiskColor(vendor.overallRisk)}`}>
                        {vendor.overallRisk}%
                      </span>
                    </TableCell>
                    <TableCell>{getRiskBadge(vendor.riskLevel)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vendor.riskFactors.length > 0 ? (
                          vendor.riskFactors.map((factor, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">None identified</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {vendorRisks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No vendors found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorRiskReportPage;
