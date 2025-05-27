
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Mail, Clock, FileText } from 'lucide-react';

const VendorRegistrationSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">Registration Successful!</CardTitle>
          <CardDescription className="text-lg">
            Your vendor registration has been submitted successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800">Email Confirmation</p>
                  <p className="text-sm text-blue-600">
                    You will receive login credentials via email within 24 hours
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800">Review Process</p>
                  <p className="text-sm text-blue-600">
                    Our procurement team will review your application within 3-5 business days
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800">Document Verification</p>
                  <p className="text-sm text-blue-600">
                    We may request additional documents during the review process
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Important Notes:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Please check your email regularly for updates</li>
              <li>• Keep your documents ready for any additional verification</li>
              <li>• You can upload missing documents once you receive login access</li>
              <li>• Contact support if you don't hear back within 5 business days</li>
            </ul>
          </div>

          <div className="text-center space-y-4">
            <p className="text-gray-600">
              <strong>Reference ID:</strong> VR-{new Date().getFullYear()}-{String(Date.now()).slice(-6)}
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
              <Button onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Need help? Contact our support team at support@procurementapp.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorRegistrationSuccess;
