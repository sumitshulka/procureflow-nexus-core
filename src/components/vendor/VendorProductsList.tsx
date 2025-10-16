import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Package, Calendar, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface VendorProductsListProps {
  vendorId: string;
}

const VendorProductsList: React.FC<VendorProductsListProps> = ({ vendorId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: vendorProducts, isLoading, error } = useQuery({
    queryKey: ['vendor_products', vendorId, user?.id],
    queryFn: async () => {
      // Ensure we have an authenticated session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase
        .from('vendor_products')
        .select(`
          *,
          product:product_id(
            id,
            name,
            description,
            classification,
            current_price,
            currency,
            category:category_id(name),
            unit:unit_id(name, abbreviation)
          )
        `)
        .eq('vendor_id', vendorId)
        .order('registered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorId && !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendor Products</CardTitle>
          <CardDescription>Products offered by this vendor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendor Products</CardTitle>
          <CardDescription>Products offered by this vendor</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading vendor products</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Vendor Products ({vendorProducts?.length || 0})
        </CardTitle>
        <CardDescription>Products offered by this vendor with pricing details</CardDescription>
      </CardHeader>
      <CardContent>
        {!vendorProducts || vendorProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No products registered yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vendorProducts.map((vendorProduct: any) => (
              <div key={vendorProduct.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{vendorProduct.product?.name}</h4>
                      <Badge variant={vendorProduct.is_active ? 'default' : 'secondary'}>
                        {vendorProduct.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    {vendorProduct.product?.description && (
                      <p className="text-sm text-gray-600 mb-3">{vendorProduct.product.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>Category: {vendorProduct.product?.category?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Registered: {new Date(vendorProduct.registered_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="capitalize">Classification: {vendorProduct.product?.classification}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="space-y-2">
                      {vendorProduct.vendor_price ? (
                        <div>
                          <div className="text-lg font-semibold text-green-600">
                            {vendorProduct.vendor_currency || 'USD'} {Number(vendorProduct.vendor_price).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            per {vendorProduct.product?.unit?.abbreviation || 'unit'}
                          </div>
                          {vendorProduct.price_updated_at && (
                            <div className="text-xs text-gray-500">
                              Updated: {new Date(vendorProduct.price_updated_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No price set</div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/products/${vendorProduct.product?.id}`)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Product
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorProductsList;