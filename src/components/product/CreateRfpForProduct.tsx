
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FileText, Plus } from "lucide-react";

interface CreateRfpForProductProps {
  productName: string;
  productId: string;
  onCreateRfp?: () => void;
}

const CreateRfpForProduct = ({ productName, productId, onCreateRfp }: CreateRfpForProductProps) => {
  const navigate = useNavigate();

  const handleCreateRfp = () => {
    // Navigate to RFP creation with pre-filled product information
    navigate("/rfp/create", {
      state: {
        prefilledProduct: {
          id: productId,
          name: productName,
        }
      }
    });
    
    if (onCreateRfp) {
      onCreateRfp();
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg text-blue-900">Procurement Required</CardTitle>
        </div>
        <CardDescription className="text-blue-700">
          This is a new product that needs to be procured. Create an RFP to start the procurement process.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-blue-800">
            <strong>Product:</strong> {productName}
          </p>
          <p className="text-sm text-blue-700">
            Since this product doesn't have a purchase history, you'll need to create an RFP 
            to procure it and establish pricing information.
          </p>
          <Button 
            onClick={handleCreateRfp}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create RFP for This Product
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateRfpForProduct;
