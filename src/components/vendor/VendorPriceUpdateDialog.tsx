
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VendorPriceUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentPrice: number | null;
  currentCurrency: string;
  onUpdate: (newPrice: number, currency: string) => void;
  isUpdating: boolean;
}

const VendorPriceUpdateDialog = ({ 
  isOpen, 
  onClose, 
  productName, 
  currentPrice, 
  currentCurrency,
  onUpdate, 
  isUpdating 
}: VendorPriceUpdateDialogProps) => {
  const [vendorPrice, setVendorPrice] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (isOpen) {
      setVendorPrice(currentPrice ? currentPrice.toString() : '');
      setCurrency(currentCurrency || 'USD');
    }
  }, [isOpen, currentPrice, currentCurrency]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorPrice || isNaN(Number(vendorPrice))) return;
    
    onUpdate(Number(vendorPrice), currency);
  };

  const handleClose = () => {
    setVendorPrice('');
    setCurrency('USD');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Your Price</DialogTitle>
          <DialogDescription>
            Update your standard price for "{productName}"
          </DialogDescription>
        </DialogHeader>

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
              disabled={isUpdating || !vendorPrice || isNaN(Number(vendorPrice))}
            >
              {isUpdating ? 'Updating...' : 'Update Price'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VendorPriceUpdateDialog;
