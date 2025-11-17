
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VendorRegistration, VendorDocument, parseAddress } from '@/types/vendor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Building, User, CreditCard, MapPin, Download, CheckCircle, XCircle } from 'lucide-react';

interface VendorDetailDialogProps {
  vendor: VendorRegistration;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (vendorId: string, status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended', comments?: string) => void;
}

const VendorDetailDialog: React.FC<VendorDetailDialogProps> = ({
  vendor,
  isOpen,
  onClose,
  onStatusUpdate,
}) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && vendor.id) {
      fetchDocuments();
    }
  }, [isOpen, vendor.id]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vendor_documents')
        .select('*')
        .eq('vendor_id', vendor.id!)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: VendorDocument[] = (data || []).map(item => ({
        ...item,
        document_type: item.document_type as 'incorporation' | 'tax_document' | 'cancelled_cheque' | 'other',
      }));
      
      setDocuments(transformedData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      incorporation: 'Incorporation Document',
      tax_document: 'Tax Document',
      cancelled_cheque: 'Cancelled Cheque',
      other: 'Other Document',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              {vendor.company_name}
            </span>
            <Badge variant={vendor.status === 'approved' ? 'default' : 'secondary'}>
              {vendor.status?.charAt(0).toUpperCase() + vendor.status?.slice(1).replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
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
                    <p>{vendor.company_type || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium">PAN Number:</span>
                    <p>{vendor.pan_number}</p>
                  </div>
                  <div>
                    <span className="font-medium">GST Number:</span>
                    <p>{vendor.gst_number}</p>
                  </div>
                  <div>
                    <span className="font-medium">Registration Number:</span>
                    <p>{vendor.registration_number || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Years in Business:</span>
                    <p>{vendor.years_in_business || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Country:</span>
                    <p>{vendor.country || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Currency:</span>
                    <p>{vendor.currency || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Annual Turnover:</span>
                    <p>{vendor.annual_turnover ? `${vendor.currency || 'USD'} ${Number(vendor.annual_turnover).toLocaleString()}` : '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Business Description:</span>
                    <p>{vendor.business_description || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Company Contacts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Primary Email:</span>
                      <p>{vendor.primary_email}</p>
                    </div>
                    <div>
                      <span className="font-medium">Secondary Email:</span>
                      <p>{vendor.secondary_email || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Primary Phone:</span>
                      <p>{vendor.primary_phone}</p>
                    </div>
                    <div>
                      <span className="font-medium">Secondary Phone:</span>
                      <p>{vendor.secondary_phone || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Website:</span>
                      <p>{vendor.website || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Authorized Signatory
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Name:</span>
                      <p>{vendor.signatory_name}</p>
                    </div>
                    <div>
                      <span className="font-medium">Designation:</span>
                      <p>{vendor.signatory_designation || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>
                      <p>{vendor.signatory_email || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>
                      <p>{vendor.signatory_phone || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium">PAN:</span>
                      <p>{vendor.signatory_pan || '-'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="addresses" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Registered Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const addr = parseAddress(vendor.registered_address);
                      return addr.street || addr.city ? (
                        <p>
                          {addr.street && <>{addr.street}<br /></>}
                          {(addr.city || addr.state) && <>{addr.city}{addr.city && addr.state ? ', ' : ''}{addr.state}<br /></>}
                          {addr.postal_code && <>{addr.postal_code}<br /></>}
                          {addr.country && addr.country}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Not provided</p>
                      );
                    })()}
                  </CardContent>
                </Card>

                {vendor.business_address && (() => {
                  const addr = parseAddress(vendor.business_address);
                  return (addr.street || addr.city) ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Business Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>
                          {addr.street && <>{addr.street}<br /></>}
                          {(addr.city || addr.state) && <>{addr.city}{addr.city && addr.state ? ', ' : ''}{addr.state}<br /></>}
                          {addr.postal_code && <>{addr.postal_code}<br /></>}
                          {addr.country && addr.country}
                        </p>
                      </CardContent>
                    </Card>
                  ) : null;
                })()}

                {vendor.billing_address && (() => {
                  const addr = parseAddress(vendor.billing_address);
                  return (addr.street || addr.city) ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Billing Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>
                          {addr.street && <>{addr.street}<br /></>}
                          {(addr.city || addr.state) && <>{addr.city}{addr.city && addr.state ? ', ' : ''}{addr.state}<br /></>}
                          {addr.postal_code && <>{addr.postal_code}<br /></>}
                          {addr.country && addr.country}
                        </p>
                      </CardContent>
                    </Card>
                  ) : null;
                })()}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Bank Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Bank Name:</span>
                    <p>{vendor.bank_name || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Branch:</span>
                    <p>{vendor.bank_branch || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Account Number:</span>
                    <p>{vendor.account_number || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium">IFSC Code:</span>
                    <p>{vendor.ifsc_code || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Account Holder Name:</span>
                    <p>{vendor.account_holder_name || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Uploaded Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading documents...</p>
                    </div>
                  ) : documents.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No documents uploaded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="font-medium">{doc.document_name}</p>
                              <p className="text-sm text-gray-500">{getDocumentTypeLabel(doc.document_type)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.is_verified ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            {vendor.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onStatusUpdate(vendor.id!, 'under_review')}
                >
                  Under Review
                </Button>
                <Button
                  onClick={() => onStatusUpdate(vendor.id!, 'approved')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onStatusUpdate(vendor.id!, 'rejected')}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VendorDetailDialog;
