
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Search, Building, Package, DollarSign, Calendar } from 'lucide-react';

interface ProductVendorData {
  product_id: string;
  product_name: string;
  product_price: number | null;
  product_currency: string;
  category_name: string;
  vendor_registrations: {
    vendor_id: string;
    vendor_name: string;
    vendor_price: number | null;
    vendor_currency: string;
    registered_at: string;
    vendor_status: string;
    is_active: boolean;
  }[];
}

const ProductVendorRelationships = () => {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const [productVendorData, setProductVendorData] = useState<ProductVendorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchProductVendorData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch products with their vendor registrations
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          current_price,
          currency,
          categories!inner(name)
        `)
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Fetch vendor products with vendor details
      const { data: vendorProducts, error: vendorProductsError } = await supabase
        .from('vendor_products')
        .select(`
          product_id,
          vendor_id,
          vendor_price,
          vendor_currency,
          registered_at,
          is_active,
          vendor_registrations!inner(
            company_name,
            status
          )
        `);

      if (vendorProductsError) throw vendorProductsError;

      // Combine data
      const combinedData: ProductVendorData[] = products.map(product => {
        const vendorRegistrations = vendorProducts
          .filter(vp => vp.product_id === product.id)
          .map(vp => ({
            vendor_id: vp.vendor_id,
            vendor_name: vp.vendor_registrations.company_name,
            vendor_price: vp.vendor_price,
            vendor_currency: vp.vendor_currency || 'USD',
            registered_at: vp.registered_at,
            vendor_status: vp.vendor_registrations.status,
            is_active: vp.is_active
          }));

        return {
          product_id: product.id,
          product_name: product.name,
          product_price: product.current_price,
          product_currency: product.currency || 'USD',
          category_name: product.categories.name,
          vendor_registrations: vendorRegistrations
        };
      });

      setProductVendorData(combinedData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch product-vendor data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole(UserRole.ADMIN) || hasRole(UserRole.PROCUREMENT_OFFICER)) {
      fetchProductVendorData();
    }
  }, [hasRole]);

  const filteredData = productVendorData.filter(item => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.vendor_registrations.some(v => v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'with-vendors') return matchesSearch && item.vendor_registrations.length > 0;
    if (activeTab === 'no-vendors') return matchesSearch && item.vendor_registrations.length === 0;
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={config[status as keyof typeof config] || config.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!hasRole(UserRole.ADMIN) && !hasRole(UserRole.PROCUREMENT_OFFICER)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product-Vendor Relationships</h1>
          <p className="text-gray-600">View product registrations and vendor pricing</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products, categories, or vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="with-vendors">With Vendors</TabsTrigger>
          <TabsTrigger value="no-vendors">No Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading product-vendor data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-gray-500">No products found matching your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredData.map((item) => (
                <Card key={item.product_id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          {item.product_name}
                        </CardTitle>
                        <CardDescription>
                          Category: {item.category_name} | 
                          Organization Price: {item.product_currency} {item.product_price?.toLocaleString() || 'Not set'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {item.vendor_registrations.length} Vendor{item.vendor_registrations.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.vendor_registrations.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No vendors registered for this product</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Vendor Price</TableHead>
                            <TableHead>Registered Date</TableHead>
                            <TableHead>Active</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {item.vendor_registrations.map((vendor) => (
                            <TableRow key={vendor.vendor_id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building className="w-4 h-4" />
                                  {vendor.vendor_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(vendor.vendor_status)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {vendor.vendor_price 
                                    ? `${vendor.vendor_currency} ${vendor.vendor_price.toLocaleString()}`
                                    : 'Not set'
                                  }
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(vendor.registered_at).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={vendor.is_active ? "default" : "secondary"}>
                                  {vendor.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductVendorRelationships;
