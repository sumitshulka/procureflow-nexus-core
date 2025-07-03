import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Package, Plus, Check, X } from 'lucide-react';
import VendorLayout from '@/components/layout/VendorLayout';

interface Product {
  id: string;
  name: string;
  description: string;
  category_id: string;
  classification: string;
  current_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  categories?: {
    name: string;
  };
  units?: {
    name: string;
    abbreviation: string;
  };
}

interface VendorProductRegistration {
  id: string;
  vendor_id: string;
  product_id: string;
  registered_at: string;
  products?: Product;
}

const VendorProducts = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [registeredProducts, setRegisteredProducts] = useState<VendorProductRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorDetails();
  }, [user?.id]);

  useEffect(() => {
    if (vendorId) {
      fetchProducts();
      fetchRegisteredProducts();
    }
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setVendorId(data.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch vendor details',
        variant: 'destructive',
      });
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id(name),
          units:unit_id(name, abbreviation)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAllProducts(data || []);
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

  const fetchRegisteredProducts = async () => {
    if (!vendorId) return;
    
    try {
      const { data, error } = await supabase
        .from('vendor_product_categories')
        .select(`
          *,
          products:product_id(
            *,
            categories:category_id(name),
            units:unit_id(name, abbreviation)
          )
        `)
        .eq('vendor_id', vendorId);

      if (error) throw error;
      setRegisteredProducts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch registered products',
        variant: 'destructive',
      });
    }
  };

  const registerForProduct = async (productId: string) => {
    if (!vendorId) return;
    
    try {
      const { error } = await supabase
        .from('vendor_product_categories')
        .insert({
          vendor_id: vendorId,
          product_id: productId,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Successfully registered for product',
      });

      fetchRegisteredProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to register for product',
        variant: 'destructive',
      });
    }
  };

  const unregisterFromProduct = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_product_categories')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Successfully unregistered from product',
      });

      fetchRegisteredProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to unregister from product',
        variant: 'destructive',
      });
    }
  };

  const isProductRegistered = (productId: string) => {
    return registeredProducts.some(reg => reg.product_id === productId);
  };

  const getRegistrationId = (productId: string) => {
    const registration = registeredProducts.find(reg => reg.product_id === productId);
    return registration?.id;
  };

  const filteredProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableProducts = filteredProducts.filter(product => 
    !isProductRegistered(product.id)
  );

  const myRegisteredProducts = registeredProducts
    .filter(reg => reg.products)
    .map(reg => reg.products!)
    .filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <VendorLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Registration</h1>
            <p className="text-gray-600">Register for products to receive relevant RFPs</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available" className="flex items-center gap-2">
              Available Products ({availableProducts.length})
            </TabsTrigger>
            <TabsTrigger value="registered" className="flex items-center gap-2">
              My Products ({myRegisteredProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading products...</p>
              </div>
            ) : availableProducts.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">
                      {searchTerm ? 'No products found matching your search.' : 'No available products to register for.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {availableProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{product.name}</h3>
                            <Badge variant="outline">
                              {product.categories?.name || 'Uncategorized'}
                            </Badge>
                          </div>
                          
                          {product.description && (
                            <p className="text-gray-600 mb-3">{product.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Classification:</span> {product.classification}
                            </div>
                            <div>
                              <span className="font-medium">Unit:</span> {product.units?.name}
                            </div>
                            {product.current_price && (
                              <div>
                                <span className="font-medium">Price:</span> {product.currency} {Number(product.current_price).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => registerForProduct(product.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Register
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="registered" className="space-y-4">
            {myRegisteredProducts.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">
                      {searchTerm ? 'No registered products found matching your search.' : 'You haven\'t registered for any products yet.'}
                    </p>
                    {!searchTerm && (
                      <Button 
                        onClick={() => setActiveTab('available')}
                        variant="outline"
                        className="mt-4"
                      >
                        Browse Available Products
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myRegisteredProducts.map((product) => {
                  const registrationId = getRegistrationId(product.id);
                  return (
                    <Card key={product.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{product.name}</h3>
                              <Badge className="bg-green-100 text-green-800">
                                <Check className="w-3 h-3 mr-1" />
                                Registered
                              </Badge>
                              <Badge variant="outline">
                                {product.categories?.name || 'Uncategorized'}
                              </Badge>
                            </div>
                            
                            {product.description && (
                              <p className="text-gray-600 mb-3">{product.description}</p>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Classification:</span> {product.classification}
                              </div>
                              <div>
                                <span className="font-medium">Unit:</span> {product.units?.name}
                              </div>
                              {product.current_price && (
                                <div>
                                  <span className="font-medium">Price:</span> {product.currency} {Number(product.current_price).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              onClick={() => registrationId && unregisterFromProduct(registrationId)}
                              variant="destructive"
                              size="sm"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Unregister
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </VendorLayout>
  );
};

export default VendorProducts;