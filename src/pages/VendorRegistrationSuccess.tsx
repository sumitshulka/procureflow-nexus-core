
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Mail, Clock, FileText, Key, User, Building2, ArrowRight, Shield, MessageSquare } from 'lucide-react';

const VendorRegistrationSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, password, companyName } = location.state || {};

  const referenceId = `VR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Vendor Portal
              </h1>
              <p className="text-xs text-slate-500">Enterprise Procurement System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full shadow-xl shadow-emerald-500/30 mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3">
            Registration Submitted Successfully!
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Thank you for registering as a vendor. Your application is now under review.
          </p>
        </div>

        {/* Reference Card */}
        <Card className="mb-6 border-slate-200 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-slate-300 text-sm">Reference Number</p>
                <p className="text-white font-mono text-lg font-semibold">{referenceId}</p>
              </div>
              {companyName && (
                <div className="text-left sm:text-right">
                  <p className="text-slate-300 text-sm">Company</p>
                  <p className="text-white font-semibold">{companyName}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Login Credentials Section */}
        {email && password && (
          <Card className="mb-6 border-emerald-200 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-emerald-800">Your Login Credentials</CardTitle>
                  <CardDescription className="text-emerald-600">
                    Save these credentials to access the Vendor Portal
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-emerald-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Email</span>
                  </div>
                  <p className="font-mono text-slate-800 bg-emerald-50 px-3 py-2 rounded border border-emerald-100 text-sm break-all">
                    {email}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-emerald-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Password</span>
                  </div>
                  <p className="font-mono text-slate-800 bg-emerald-50 px-3 py-2 rounded border border-emerald-100 text-sm">
                    {password}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Please save these credentials securely. You can login to the Vendor Portal immediately to track your registration status and update your profile.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What Happens Next */}
        <Card className="mb-6 border-slate-200 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">What Happens Next?</CardTitle>
                <CardDescription>Your application will go through the following steps</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  icon: Clock,
                  title: 'Application Review',
                  description: 'Our procurement team will review your application within 3-5 business days',
                  color: 'blue',
                },
                {
                  icon: FileText,
                  title: 'Document Verification',
                  description: 'We may request additional documents during the review process',
                  color: 'indigo',
                },
                {
                  icon: Mail,
                  title: 'Email Notification',
                  description: 'You will receive an email notification once your application is processed',
                  color: 'violet',
                },
                {
                  icon: CheckCircle,
                  title: 'Portal Access',
                  description: 'Upon approval, you will have full access to RFPs, Purchase Orders, and more',
                  color: 'emerald',
                },
              ].map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    step.color === 'blue' ? 'bg-blue-100' :
                    step.color === 'indigo' ? 'bg-indigo-100' :
                    step.color === 'violet' ? 'bg-violet-100' :
                    'bg-emerald-100'
                  }`}>
                    <step.icon className={`w-5 h-5 ${
                      step.color === 'blue' ? 'text-blue-600' :
                      step.color === 'indigo' ? 'text-indigo-600' :
                      step.color === 'violet' ? 'text-violet-600' :
                      'text-emerald-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800">{step.title}</h4>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden sm:block">
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="mb-8 border-amber-200 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800 mb-2">Important Notes</h4>
                <ul className="text-sm text-amber-700 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    Please check your email regularly for updates on your application
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    Keep your documents ready for any additional verification requests
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    You can upload missing documents after logging into the portal
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    Contact support if you don't hear back within 5 business days
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate('/login')} 
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/25 h-12 px-8 text-base"
          >
            <Key className="w-4 h-4 mr-2" />
            Login to Vendor Portal
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/')}
            className="h-12 px-8 text-base border-slate-300 hover:bg-slate-50"
          >
            Back to Home
          </Button>
        </div>

        {/* Support Footer */}
        <div className="text-center mt-8 py-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@procurementapp.com" className="text-blue-600 hover:text-blue-700 font-medium">
              support@procurementapp.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistrationSuccess;
