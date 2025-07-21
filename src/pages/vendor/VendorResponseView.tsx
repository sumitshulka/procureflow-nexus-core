import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const VendorResponseView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/vendor/rfps/${id}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to RFP Details
        </Button>
        <div>
          <h1 className="text-2xl font-bold">My RFP Response</h1>
          <p className="text-muted-foreground">View your submitted response</p>
        </div>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Response Details</h3>
          <p className="text-muted-foreground mb-4">
            Your submitted RFP response will be displayed here once the response management system is implemented.
          </p>
          <Button onClick={() => navigate(`/vendor/rfps/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to RFP Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorResponseView;