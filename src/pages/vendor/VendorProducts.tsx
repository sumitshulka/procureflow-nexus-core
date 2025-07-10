
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Package, AlertTriangle, CheckCircle, Edit } from 'lucide-react';
import ProductRegistrationDialog from '@/components/vendor/ProductRegistrationDialog';
import VendorPriceUpdateDialog from '@/components/vendor/VendorPriceUpdateDialog';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category_name: string;
  unit_name: string;
  classification: string;
  is_active: boolean;
  created_at: string;
  is_registered?: boolean;
  vendor_price?: number | null;
  vendor_currency?: string;
  registered_at?: string;
}

interface VendorStatus {
  status: string;
  company_name: string;
}

const VendorProducts = () => {
  const { toast } = useToast();
  const { userData } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorStatus, setVendorStatus] = useState<VendorStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showPriceUpdateDialog, setShowPriceUpdateDialog] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchVendorStatus = async () => {
    if (!userData?.id) return;

    try {
      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('status, company_name')
        .eq('user_id', userData.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setVendorStatus(data);
    } catch (error: any) {
      console.error('Error fetching vendor status:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all active products with category and unit details
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          classification,
          is_active,
          created_at,
          categories!inner(name),
          units!inner(name, abbreviation)
        `)
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      if (!userData?.id || !vendorStatus) {
        const transformedProducts = productsData.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          category_name: product.categories.name,
          unit_name: `${product.units.name} (${product.units.abbreviation || ''})`,
          classification: product.classification,
          is_active: product.is_active,
          created_at: product.created_at,
          is_registered: false,
        }));
        setProducts(transformedProducts);
        setIsLoading(false);
        return;
      }

      // Fetch vendor's registered products
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendor_registrations')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (vendorError) throw vendorError;

      const { data: registrationsData, error: registrationsError } = await supabase
        .from('vendor_products')
        .select('product_id, vendor_price, vendor_currency, registered_at')
        .eq('vendor_id', vendorData.id);

      if (registrationsError) throw registrationsError;

      // Combine product data with registration status
      const transformedProducts = productsData.map(product => {
        const registration = registrationsData.find(reg => reg.product_id === product.id);
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          category_name: product.categories.name,
          unit_name: `${product.units.name} (${product.units.abbreviation || ''})`,
          classification: product.classification,
          is_active: product.is_active,
          created_at: product.created_at,
          is_registered: !!registration,
          vendor_price: registration?.vendor_price || null,
          vendor_currency: registration?.vendor_currency || 'USD',
          registered_at: registration?.registered_at,
        };
      });

      setProducts(transformedProducts);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorStatus();
  }, [userData?.id]);

  useEffect(() => {
    if (vendorStatus !== null) {
      fetchProducts();
    }
  }, [vendorStatus, userData?.id]);

  const handleProductRegistration = async (productId: string, price: number, currency: string) => {
    if (!userData?.id || !vendorStatus) return;

    try {
      setIsRegistering(true);
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendor_registrations')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (vendorError) throw vendorError;

      const { error } = await supabase
        .from('vendor_products')
        .insert({
          vendor_id: vendorData.id,
          product_id: productId,
          vendor_price: price,
          vendor_currency: currency,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product registered successfully with your pricing',
      });

      fetchProducts();
      setShowRegistrationDialog(false);
      setSelectedProduct(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to register product',
        variant: 'destructive',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePriceUpdate = async (price: number, currency: string) => {
    if (!userData?.id || !vendorStatus || !selectedProduct) return;

    try {
      setIsUpdating(true);
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendor_registrations')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (vendorError) throw vendorError;

      const { error } = await supabase
        .from('vendor_products')
        .update({
          vendor_price: price,
          vendor_currency: currency,
        })
        .eq('vendor_id', vendorData.id)
        .eq('product_id', selectedProduct.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product price updated successfully',
      });

      fetchProducts();
      setShowPriceUpdateDialog(false);
      setSelectedProduct(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update product price',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.classification.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isVendorApproved = vendorStatus?.status === 'approved';

  if (!vendorStatus) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need to complete vendor registration before you can view products.
            Please visit the vendor registration page to get started.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-600">Browse and register for products</p>
        </div>
        <Badge 
          variant={isVendorApproved ? "default" : "secondary"}
          className={isVendorApproved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
        >
          {vendorStatus.status.charAt(0).toUpperCase() + vendorStatus.status.slice(1)}
        </Badge>
      </div>

      {!isVendorApproved && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your vendor registration is currently <strong>{vendorStatus.status}</strong>. 
            You can view products but cannot register for them until your vendor status is approved.
            {vendorStatus.status === 'rejected' && (
              <span className="block mt-2 font-medium">
                Please check your messages for the rejection reason and resubmit your application.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products by name, category, or classification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="py-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Loading products...</span>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <p className="text-gray-500">No products found matching your search.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="w-4 h-4" />
                      {product.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {product.category_name} • {product.unit_name}
                    </CardDescription>
                  </div>
                  {product.is_registered && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Registered
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Classification:</span>
                    <p className="text-sm">{product.classification}</p>
                  </div>
                  
                  {product.description && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Description:</span>
                      <p className="text-sm text-gray-700">{product.description}</p>
                    </div>
                  )}

                  {product.is_registered && product.vendor_price && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Your Price:</span>
                      <p className="text-lg font-semibold text-green-600">
                        {product.vendor_currency} {product.vendor_price.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {product.is_registered ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowPriceUpdateDialog(true);
                        }}
                        disabled={!isVendorApproved}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Update Price
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowRegistrationDialog(true);
                        }}
                        disabled={!isVendorApproved}
                        size="sm"
                        className="w-full"
                      >
                        Register Product
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {selectedProduct && (
        <>
          <ProductRegistrationDialog
            product={selectedProduct}
            isOpen={showRegistrationDialog}
            onClose={() => {
              setShowRegistrationDialog(false);
              setSelectedProduct(null);
            }}
            onRegister={handleProductRegistration}
            isRegistering={isRegistering}
          />

          <VendorPriceUpdateDialog
            isOpen={showPriceUpdateDialog}
            onClose={() => {
              setShowPriceUpdateDialog(false);
              setSelectedProduct(null);
            }}
            productName={selectedProduct.name}
            currentPrice={selectedProduct.vendor_price}
            currentCurrency={selectedProduct.vendor_currency || 'USD'}
            onUpdate={handlePriceUpdate}
            isUpdating={isUpdating}
          />
        </>
      )}
    </div>
  );
};

export default VendorProducts;
