import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES, CURRENCIES, getCurrencyForCountry } from '@/utils/currencyUtils';
import { Address, parseAddress } from '@/types/vendor';

interface VendorEditDialogProps {
  vendorProfile: any;
  onUpdate: () => void;
}

const VendorEditDialog = ({ vendorProfile, onUpdate }: VendorEditDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: vendorProfile?.company_name || '',
    business_description: vendorProfile?.business_description || '',
    website: vendorProfile?.website || '',
    country: vendorProfile?.country || '',
    currency: vendorProfile?.currency || 'USD',
    primary_email: vendorProfile?.primary_email || '',
    primary_phone: vendorProfile?.primary_phone || '',
    annual_turnover: vendorProfile?.annual_turnover || '',
    registered_address: parseAddress(vendorProfile?.registered_address),
    business_address: parseAddress(vendorProfile?.business_address),
    billing_address: parseAddress(vendorProfile?.billing_address),
  });

  const handleCountryChange = (country: string) => {
    const currency = getCurrencyForCountry(country);
    setFormData(prev => ({
      ...prev,
      country,
      currency
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('vendor_registrations')
        .update({
          company_name: formData.company_name,
          business_description: formData.business_description,
          website: formData.website,
          country: formData.country,
          currency: formData.currency,
          primary_email: formData.primary_email,
          primary_phone: formData.primary_phone,
          annual_turnover: formData.annual_turnover ? parseFloat(formData.annual_turnover) : null,
          registered_address: formData.registered_address as any,
          business_address: formData.business_address as any,
          billing_address: formData.billing_address as any,
        })
        .eq('id', vendorProfile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderAddressFields = (
    addressType: 'registered_address' | 'business_address' | 'billing_address',
    label: string
  ) => {
    const address = formData[addressType];
    return (
      <div className="space-y-4">
        <h4 className="font-medium text-sm">{label}</h4>
        <div className="space-y-2">
          <Label htmlFor={`${addressType}_street`}>Street Address</Label>
          <Input
            id={`${addressType}_street`}
            value={address.street}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              [addressType]: { ...prev[addressType], street: e.target.value }
            }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${addressType}_city`}>City</Label>
            <Input
              id={`${addressType}_city`}
              value={address.city}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                [addressType]: { ...prev[addressType], city: e.target.value }
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${addressType}_state`}>State</Label>
            <Input
              id={`${addressType}_state`}
              value={address.state}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                [addressType]: { ...prev[addressType], state: e.target.value }
              }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${addressType}_postal_code`}>Postal Code</Label>
            <Input
              id={`${addressType}_postal_code`}
              value={address.postal_code}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                [addressType]: { ...prev[addressType], postal_code: e.target.value }
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${addressType}_country`}>Country</Label>
            <Select
              value={address.country}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                [addressType]: { ...prev[addressType], country: value }
              }))}
            >
              <SelectTrigger id={`${addressType}_country`}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.name}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vendor Profile</DialogTitle>
          <DialogDescription>
            Update your company information and address details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="company">Company Info</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
            </TabsList>
            
            <TabsContent value="company" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={formData.country} onValueChange={handleCountryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.symbol} ({currency.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_email">Primary Email</Label>
                  <Input
                    id="primary_email"
                    type="email"
                    value={formData.primary_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_phone">Primary Phone</Label>
                  <Input
                    id="primary_phone"
                    value={formData.primary_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_phone: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="annual_turnover">Annual Turnover</Label>
                <Input
                  id="annual_turnover"
                  type="number"
                  value={formData.annual_turnover}
                  onChange={(e) => setFormData(prev => ({ ...prev, annual_turnover: e.target.value }))}
                  placeholder="Enter annual turnover"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_description">Business Description</Label>
                <Textarea
                  id="business_description"
                  value={formData.business_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_description: e.target.value }))}
                  placeholder="Describe your business"
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="addresses" className="space-y-6 mt-4">
              {renderAddressFields('registered_address', 'Registered Address')}
              <div className="border-t pt-4" />
              {renderAddressFields('business_address', 'Business Address (Optional)')}
              <div className="border-t pt-4" />
              {renderAddressFields('billing_address', 'Billing Address (Optional)')}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>Updating...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VendorEditDialog;
