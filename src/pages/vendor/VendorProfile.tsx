import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Edit,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import VendorLayout from '@/components/layout/VendorLayout';
import { Separator } from '@/components/ui/separator';
import { getCurrencySymbol, getCurrencyName } from '@/utils/currencyUtils';
import VendorEditDialog from '@/components/vendor/VendorEditDialog';

const VendorProfile = () => {
  const { user } = useAuth();

  // Fetch vendor registration details
  const { data: vendorProfile, isLoading, refetch } = useQuery({
    queryKey: ["vendor_profile_detailed", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("vendor_registrations")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <VendorLayout>
        <div className="py-8">
          <div className="text-lg">Loading profile...</div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vendor Profile</h1>
            <p className="text-muted-foreground">Manage your company information and registration details</p>
          </div>
          <VendorEditDialog 
            vendorProfile={vendorProfile} 
            onUpdate={() => refetch()}
          />
        </div>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Registration Status</CardTitle>
                <CardDescription>Your current verification and approval status</CardDescription>
              </div>
              {vendorProfile && getStatusBadge(vendorProfile.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {vendorProfile?.vendor_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Vendor Number</p>
                  <p className="font-bold text-primary">{vendorProfile.vendor_number}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Registration Date</p>
                <p className="font-medium">
                  {vendorProfile?.created_at ? format(new Date(vendorProfile.created_at), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {vendorProfile?.updated_at ? format(new Date(vendorProfile.updated_at), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reviewed By</p>
                <p className="font-medium">{vendorProfile?.reviewed_by ? 'Admin Team' : 'Pending Review'}</p>
              </div>
            </div>
            {vendorProfile?.approval_comments && (
              <div className="mt-4 p-3 bg-accent rounded-lg">
                <p className="text-sm font-medium">Review Comments:</p>
                <p className="text-sm text-muted-foreground mt-1">{vendorProfile.approval_comments}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Company Name</Label>
                  <p className="font-medium">{vendorProfile?.company_name || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Company Type</Label>
                  <p className="font-medium">{vendorProfile?.company_type || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Registration Number</Label>
                  <p className="font-medium">{vendorProfile?.registration_number || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Incorporation Date</Label>
                  <p className="font-medium">
                    {vendorProfile?.incorporation_date ? format(new Date(vendorProfile.incorporation_date), 'MMM dd, yyyy') : 'Not provided'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Website</Label>
                  <p className="font-medium">{vendorProfile?.website || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Country</Label>
                  <p className="font-medium">{vendorProfile?.country || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Business Currency</Label>
                  <p className="font-medium flex items-center gap-1">
                    {vendorProfile?.currency ? (
                      <>
                        <CreditCard className="w-4 h-4" />
                        {vendorProfile.currency} - {getCurrencyName(vendorProfile.currency)} ({getCurrencySymbol(vendorProfile.currency)})
                      </>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Business Description</Label>
                  <p className="text-sm">{vendorProfile?.business_description || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Primary Email</Label>
                <p className="font-medium">{vendorProfile?.primary_email || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Secondary Email</Label>
                <p className="font-medium">{vendorProfile?.secondary_email || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Primary Phone</Label>
                <p className="font-medium">{vendorProfile?.primary_phone || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Secondary Phone</Label>
                <p className="font-medium">{vendorProfile?.secondary_phone || 'Not provided'}</p>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-sm text-muted-foreground">Signatory Name</Label>
                <p className="font-medium">{vendorProfile?.signatory_name || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Signatory Designation</Label>
                <p className="font-medium">{vendorProfile?.signatory_designation || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tax Information */}
          <Card>
            <CardHeader>
              <CardTitle>Tax & Legal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">PAN Number</Label>
                <p className="font-medium">{vendorProfile?.pan_number || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">GST Number</Label>
                <p className="font-medium">{vendorProfile?.gst_number || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">TAN Number</Label>
                <p className="font-medium">{vendorProfile?.tan_number || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Years in Business</Label>
                <p className="font-medium">{vendorProfile?.years_in_business || 'Not provided'} years</p>
              </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Annual Turnover</Label>
                  <p className="font-medium">
                    {vendorProfile?.annual_turnover ? 
                      `${getCurrencySymbol(vendorProfile?.currency || 'USD')}${Number(vendorProfile.annual_turnover).toLocaleString()}` : 
                      'Not provided'}
                  </p>
                </div>
              
              <Separator />
              
              <div>
                <Label className="text-sm text-muted-foreground">Bank Name</Label>
                <p className="font-medium">{vendorProfile?.bank_name || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Account Holder Name</Label>
                <p className="font-medium">{vendorProfile?.account_holder_name || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">IFSC Code</Label>
                <p className="font-medium">{vendorProfile?.ifsc_code || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Addresses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">Registered Address</h4>
                {vendorProfile?.registered_address ? (
                  <div className="text-sm space-y-1">
                    <p>{(vendorProfile.registered_address as any)?.street}</p>
                    <p>{(vendorProfile.registered_address as any)?.city}, {(vendorProfile.registered_address as any)?.state}</p>
                    <p>{(vendorProfile.registered_address as any)?.postal_code}</p>
                    <p>{(vendorProfile.registered_address as any)?.country}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2">Business Address</h4>
                {vendorProfile?.business_address ? (
                  <div className="text-sm space-y-1">
                    <p>{(vendorProfile.business_address as any)?.street}</p>
                    <p>{(vendorProfile.business_address as any)?.city}, {(vendorProfile.business_address as any)?.state}</p>
                    <p>{(vendorProfile.business_address as any)?.postal_code}</p>
                    <p>{(vendorProfile.business_address as any)?.country}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2">Billing Address</h4>
                {vendorProfile?.billing_address ? (
                  <div className="text-sm space-y-1">
                    <p>{(vendorProfile.billing_address as any)?.street}</p>
                    <p>{(vendorProfile.billing_address as any)?.city}, {(vendorProfile.billing_address as any)?.state}</p>
                    <p>{(vendorProfile.billing_address as any)?.postal_code}</p>
                    <p>{(vendorProfile.billing_address as any)?.country}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
};

export default VendorProfile;