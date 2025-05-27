
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VendorRegistration, VendorDocument } from '@/types/vendor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Building, Mail, Phone, MapPin, CreditCard, FileText, User, Calendar } from 'lucide-react';

interface VendorDetailDialogProps {
  vendor: VendorRegistration;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (vendorId: string, status: string, comments?: string) => void;
}

const VendorDetailDialog: React.FC<VendorDetailDialogProps> = ({
  vendor,
  isOpen,
  onClose,
  onStatusUpdate,
}) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [comments, setComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && vendor.id) {
      fetchDocuments();
    }
  }, [isOpen, vendor.id]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_documents')
        .select('*')
        .eq('vendor_id', vendor.id!)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch vendor documents',
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (status: string) => {
    setIsLoading(true);
    try {
      await onStatusUpdate(vendor.id!, status, comments);
      setComments('');
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: any) => {
    if (!address) return 'Not provided';
    return `${address.street}, ${address.city}, ${address.state} - ${address.postal_code}, ${address.country}`;
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'incorporation':
        return <Building className="w-4 h-4" />;
      case 'tax_document':
        return <FileText className="w-4 h-4" />;
      case 'cancelled_cheque':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            {vendor.company_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Company Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Company Name:</span>
                  <p>{vendor.company_name}</p>
                </div>
                <div>
                  <span className="font-medium">Company Type:</span>
                  <p>{vendor.company_type || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium">Registration Number:</span>
                  <p>{vendor.registration_number || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium">Years in Business:</span>
                  <p>{vendor.years_in_business || 'Not specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium">Business Description:</span>
                  <p>{vendor.business_description || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tax Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tax Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="font-medium">PAN Number:</span>
                  <p>{vendor.pan_number}</p>
                </div>
                <div>
                  <span className="font-medium">GST Number:</span>
                  <p>{vendor.gst_number}</p>
                </div>
                <div>
                  <span className="font-medium">TAN Number:</span>
                  <p>{vendor.tan_number || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Primary Email:</span>
                  <p>{vendor.primary_email}</p>
                </div>
                <div>
                  <span className="font-medium">Secondary Email:</span>
                  <p>{vendor.secondary_email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium">Primary Phone:</span>
                  <p>{vendor.primary_phone}</p>
                </div>
                <div>
                  <span className="font-medium">Secondary Phone:</span>
                  <p>{vendor.secondary_phone || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium">Website:</span>
                  <p>{vendor.website || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Addresses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Addresses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-medium">Registered Address:</span>
                  <p>{formatAddress(vendor.registered_address)}</p>
                </div>
                <div>
                  <span className="font-medium">Business Address:</span>
                  <p>{formatAddress(vendor.business_address)}</p>
                </div>
                <div>
                  <span className="font-medium">Billing Address:</span>
                  <p>{formatAddress(vendor.billing_address)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Signatory Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Authorized Signatory
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Name:</span>
                  <p>{vendor.signatory_name}</p>
                </div>
                <div>
                  <span className="font-medium">Designation:</span>
                  <p>{vendor.signatory_designation || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <p>{vendor.signatory_email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium">Phone:</span>
                  <p>{vendor.signatory_phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium">PAN:</span>
                  <p>{vendor.signatory_pan || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Bank Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Bank Name:</span>
                  <p>{vendor.bank_name || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium">Branch:</span>
                  <p>{vendor.bank_branch || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium">Account Number:</span>
                  <p>{vendor.account_number || 'Not provided'}</p>
                </div>
                <div>
                  <span className="font-medium">IFSC Code:</span>
                  <p>{vendor.ifsc_code || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium">Account Holder:</span>
                  <p>{vendor.account_holder_name || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getDocumentIcon(doc.document_type)}
                          <div>
                            <p className="font-medium">{doc.document_name}</p>
                            <p className="text-sm text-gray-500">
                              {doc.document_type.replace('_', ' ').toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.is_verified ? (
                            <Badge className="bg-green-100 text-green-800">Verified</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          )}
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Status & Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-medium">Current Status:</span>
                  <Badge className="ml-2">
                    {vendor.status?.charAt(0).toUpperCase() + vendor.status?.slice(1).replace('_', ' ')}
                  </Badge>
                </div>

                <div>
                  <span className="font-medium">Comments (Optional):</span>
                  <Textarea
                    placeholder="Add comments about this vendor..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {vendor.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleStatusUpdate('under_review')}
                        disabled={isLoading}
                      >
                        Mark Under Review
                      </Button>
                      <Button
                        variant="approve"
                        onClick={() => handleStatusUpdate('approved')}
                        disabled={isLoading}
                      >
                        Approve Vendor
                      </Button>
                      <Button
                        variant="reject"
                        onClick={() => handleStatusUpdate('rejected')}
                        disabled={isLoading}
                      >
                        Reject Vendor
                      </Button>
                    </>
                  )}

                  {vendor.status === 'under_review' && (
                    <>
                      <Button
                        variant="approve"
                        onClick={() => handleStatusUpdate('approved')}
                        disabled={isLoading}
                      >
                        Approve Vendor
                      </Button>
                      <Button
                        variant="reject"
                        onClick={() => handleStatusUpdate('rejected')}
                        disabled={isLoading}
                      >
                        Reject Vendor
                      </Button>
                    </>
                  )}

                  {vendor.status === 'approved' && (
                    <Button
                      variant="warning"
                      onClick={() => handleStatusUpdate('suspended')}
                      disabled={isLoading}
                    >
                      Suspend Vendor
                    </Button>
                  )}

                  {vendor.status === 'suspended' && (
                    <Button
                      variant="approve"
                      onClick={() => handleStatusUpdate('approved')}
                      disabled={isLoading}
                    >
                      Reactivate Vendor
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default VendorDetailDialog;
