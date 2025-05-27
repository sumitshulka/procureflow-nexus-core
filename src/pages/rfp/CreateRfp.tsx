
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Workflow, FileText } from "lucide-react";

const CreateRfp = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Request for Proposal</h1>
          <p className="text-muted-foreground">
            Choose how you'd like to create your RFP
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/rfp/create/wizard")}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Workflow className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Step-by-Step Wizard</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Guided creation process with:
              </p>
              <ul className="text-sm space-y-2 text-left">
                <li>• Basic RFP information</li>
                <li>• Bill of Quantities (BOQ)</li>
                <li>• Vendor selection (Closed/Public)</li>
                <li>• Terms & conditions</li>
                <li>• Review & approval workflow</li>
              </ul>
              <Button className="w-full mt-6">
                Start Wizard
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow opacity-50">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <CardTitle className="text-xl">Quick Form</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Create RFP using a single form (Coming Soon)
              </p>
              <ul className="text-sm space-y-2 text-left text-muted-foreground">
                <li>• All fields in one page</li>
                <li>• Faster for experienced users</li>
                <li>• Basic RFP creation</li>
                <li>• Manual vendor management</li>
              </ul>
              <Button className="w-full mt-6" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateRfp;
