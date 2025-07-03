
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react';

interface DuplicateState {
  errorMessage: string;
  existingCompany: string;
  existingStatus: string;
  conflictType: 'email' | 'gst' | 'pan';
}

const VendorRegistrationDuplicate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as DuplicateState;

  // If no state is provided, redirect back to registration
  if (!state) {
    navigate('/vendor-registration');
    return null;
  }

  const getActionMessage = () => {
    switch (state.conflictType) {
      case 'email':
        return 'Please use a different email address for your registration.';
      case 'gst':
        return 'Please verify your GST number or contact support if you believe this is an error.';
      case 'pan':
        return 'Please verify your PAN number or contact support if you believe this is an error.';
      default:
        return 'Please use different details for your registration.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Registration Conflict</h1>
          <p className="text-gray-600 mt-2">We found an existing registration with the same details</p>
        </div>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              Duplicate Registration Detected
            </CardTitle>
            <CardDescription className="text-orange-700">
              {state.errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <h3 className="font-medium text-gray-900 mb-2">What you can do:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• {getActionMessage()}</li>
                <li>• If you believe this is your existing registration, contact support for assistance</li>
                <li>• If you need to update your existing registration, please use the vendor portal</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Need Help?
              </h3>
              <p className="text-sm text-blue-800">
                Contact our support team if you need assistance with your registration or if you believe this is an error.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => navigate('/vendor-registration')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Registration
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="default"
              >
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorRegistrationDuplicate;
