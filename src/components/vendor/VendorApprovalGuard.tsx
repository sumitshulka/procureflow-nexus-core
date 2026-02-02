import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, User, MessageSquare } from 'lucide-react';
import { useVendorApprovalStatus } from '@/hooks/useVendorApprovalStatus';

interface VendorApprovalGuardProps {
  children: React.ReactNode;
}

const VendorApprovalGuard: React.FC<VendorApprovalGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const { isApproved, isPending, isRejected, isLoading, companyName } = useVendorApprovalStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isApproved) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {isPending ? (
              <div className="p-4 rounded-full bg-amber-100">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
            ) : (
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-xl">
            {isPending ? 'Vendor Approval Pending' : 'Access Restricted'}
          </CardTitle>
          <CardDescription>
            {companyName && <span className="font-medium">{companyName}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Badge 
              variant={isPending ? "outline" : "destructive"} 
              className={isPending ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-red-100 text-red-800 border-red-300"}
            >
              {isPending ? 'Pending Review' : isRejected ? 'Registration Rejected' : 'Not Approved'}
            </Badge>
          </div>
          
          <p className="text-center text-muted-foreground text-sm">
            {isPending 
              ? 'Your vendor registration is currently under review. You will have full access to all features once your account is approved.'
              : 'Your vendor registration has been rejected. Please contact the procurement team for assistance.'}
          </p>

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={() => navigate('/vendor/profile')}
              className="w-full"
            >
              <User className="h-4 w-4 mr-2" />
              Update Profile
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/vendor/messages')}
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Procurement Team
            </Button>
            <Button 
              variant="ghost"
              onClick={() => navigate('/vendor-dashboard')}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorApprovalGuard;
