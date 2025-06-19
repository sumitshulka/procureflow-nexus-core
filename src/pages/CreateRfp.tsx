
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Zap, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreateRfp = () => {
  const navigate = useNavigate();

  const creationMethods = [
    {
      title: "Create from Template",
      description: "Use pre-built templates to quickly create standardized RFPs",
      icon: FileText,
      action: () => navigate("/rfp/templates"),
      color: "bg-blue-500"
    },
    {
      title: "Quick Start Wizard",
      description: "Step-by-step guided process to create your RFP",
      icon: Zap,
      action: () => navigate("/rfp/create-wizard"),
      color: "bg-green-500"
    },
    {
      title: "Advanced Setup",
      description: "Full customization with all available options",
      icon: Settings,
      action: () => navigate("/rfp/create-wizard?mode=advanced"),
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Create Request for Proposal (RFP)</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose how you'd like to create your RFP. Use templates for consistency, 
          the wizard for guidance, or advanced setup for full control.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {creationMethods.map((method, index) => {
          const Icon = method.icon;
          return (
            <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={method.action}>
              <CardHeader className="text-center">
                <div className={`w-16 h-16 ${method.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">{method.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">{method.description}</p>
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CreateRfp;
