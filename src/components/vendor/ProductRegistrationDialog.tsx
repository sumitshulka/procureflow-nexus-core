
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Product {
  id: string;
  name: string;
  description: string;
  classification: string;
  categories?: {
    name: string;
  };
  units?: {
    name: string;
    abbreviation: string;
  };
}

interface ProductRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onRegister: (productId: string, vendorPrice: number, currency: string) => void;
  isRegistering: boolean;
}

const ProductRegistrationDialog = ({ 
  isOpen, 
  onClose, 
  product, 
  onRegister, 
  isRegistering 
}: ProductRegistrationDialogProps) => {
  const [vendorPrice, setVendorPrice] = useState('');
  const [currency, setCurrency] = useState('USD');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !vendorPrice || isNaN(Number(vendorPrice))) return;
    
    onRegister(product.id, Number(vendorPrice), currency);
  };

  const handleClose = () => {
    setVendorPrice('');
    setCurrency('USD');
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register for Product</DialogTitle>
          <DialogDescription>
            Set your standard price for this product to complete registration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            {product.description && (
              <p className="text-gray-600 text-sm mt-1">{product.description}</p>
            )}
            
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline">
                {product.categories?.name || 'Uncategorized'}
              </Badge>
              <Badge variant="outline">
                {product.classification}
              </Badge>
              {product.units && (
                <Badge variant="outline">
                  {product.units.name}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendorPrice">Your Standard Price</Label>
                <Input
                  id="vendorPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={vendorPrice}
                  onChange={(e) => setVendorPrice(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isRegistering || !vendorPrice || isNaN(Number(vendorPrice))}
                className="bg-green-600 hover:bg-green-700"
              >
                {isRegistering ? 'Registering...' : 'Register & Set Price'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductRegistrationDialog;
