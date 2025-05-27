
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Globe, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Vendor {
  id: string;
  company_name: string;
  primary_email: string;
  status: string;
}

interface RfpVendorsProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

const RfpVendors: React.FC<RfpVendorsProps> = ({ data, onUpdate, onNext }) => {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>(data.vendors || []);
  const [isPublic, setIsPublic] = useState<boolean>(data.isPublic || false);
  const [publicLink, setPublicLink] = useState<string>(data.publicLink || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchVendors();
    generatePublicLink();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data: vendorsData, error } = await supabase
        .from("vendor_registrations")
        .select("id, company_name, primary_email, status")
        .eq("status", "approved")
        .order("company_name");

      if (error) throw error;
      setVendors(vendorsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch vendors",
        variant: "destructive",
      });
    }
  };

  const generatePublicLink = () => {
    const baseUrl = window.location.origin;
    const rfpId = Date.now().toString(); // This will be replaced with actual RFP ID after creation
    const link = `${baseUrl}/public/rfp/${rfpId}`;
    setPublicLink(link);
  };

  const handleVendorToggle = (vendorId: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      toast({
        title: "Success",
        description: "Public link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleContinue = () => {
    if (!isPublic && selectedVendors.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one vendor or make the RFP public",
        variant: "destructive",
      });
      return;
    }

    onUpdate({
      vendors: selectedVendors,
      isPublic,
      publicLink: isPublic ? publicLink : undefined,
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Vendor Selection</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Choose how you want to distribute this RFP - select specific vendors for a closed RFP or make it public for open bidding.
        </p>
      </div>

      <Tabs defaultValue={isPublic ? "public" : "closed"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="closed" 
            onClick={() => setIsPublic(false)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Closed RFP
          </TabsTrigger>
          <TabsTrigger 
            value="public" 
            onClick={() => setIsPublic(true)}
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            Public RFP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="closed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Vendors</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose specific vendors to invite for this RFP. Only selected vendors will be able to view and respond.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {vendors.map(vendor => (
                  <div key={vendor.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={vendor.id}
                      checked={selectedVendors.includes(vendor.id)}
                      onCheckedChange={() => handleVendorToggle(vendor.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={vendor.id} className="font-medium cursor-pointer">
                        {vendor.company_name}
                      </Label>
                      <p className="text-sm text-muted-foreground">{vendor.primary_email}</p>
                    </div>
                    <Badge variant="outline">{vendor.status}</Badge>
                  </div>
                ))}
              </div>
              
              {selectedVendors.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    {selectedVendors.length} vendor(s) selected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="public" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Public RFP Link</CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate a public link that can be shared on your website or with potential vendors. Anyone with the link can view the RFP details and register to participate.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="publicLink">Public RFP Link</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="publicLink"
                    value={publicLink}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button onClick={copyPublicLink} variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This link will be generated after the RFP is created and published
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Public RFP Benefits:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Wider vendor participation</li>
                  <li>• Increased competition and better pricing</li>
                  <li>• Easy sharing via website or email</li>
                  <li>• Automatic vendor registration process</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleContinue}>
          Continue to Terms & Conditions
        </Button>
      </div>
    </div>
  );
};

export default RfpVendors;
