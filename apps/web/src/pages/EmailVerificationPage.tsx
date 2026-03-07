import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { authApi } from '../api/auth';
import Button from '../components/ui/Button';

const EmailVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toastStore = useToastStore();
  
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;
    
    try {
      const response = await authApi.verifyEmail(token) as any;
      
      if (response.data?.success) {
        setVerificationStatus('success');
        setEmail(response.data?.data?.email || '');
        toastStore.success('Email verified successfully!');
      } else if (response.data?.message?.includes('expired')) {
        setVerificationStatus('expired');
        setEmail(response.data?.data?.email || '');
      } else {
        setVerificationStatus('error');
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      if (error.response?.data?.message?.includes('expired')) {
        setVerificationStatus('expired');
        setEmail(error.response?.data?.data?.email || '');
      } else {
        setVerificationStatus('error');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toastStore.error('Email address required');
      return;
    }

    setIsResending(true);
    try {
      const response = await authApi.resendVerificationEmail(email) as any;
      
      if (response.data?.success) {
        toastStore.success('Verification email sent successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toastStore.error(response.data?.message || 'Failed to resend verification email');
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to resend verification email';
      toastStore.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case 'loading':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              Verifying Your Email
            </h3>
            <p className="text-neutral-600 text-sm mb-6">
              Please wait while we verify your email address...
            </p>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div className="bg-brand-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              Email Verified Successfully!
            </h3>
            <p className="text-neutral-600 text-sm mb-6">
              Your email address has been verified. You can now log in to your account.
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleGoToLogin}
                fullWidth
              >
                Go to Login
              </Button>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-warning-600" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              Verification Link Expired
            </h3>
            <p className="text-neutral-600 text-sm mb-6">
              The verification link has expired. Please request a new verification email.
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                loading={isResending}
                disabled={isResending}
                fullWidth
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              <Button
                variant="outline"
                onClick={handleGoToLogin}
                fullWidth
              >
                Back to Login
              </Button>
            </div>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-error-600" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              Verification Failed
            </h3>
            <p className="text-neutral-600 text-sm mb-6">
              We couldn't verify your email. The link may be invalid or expired.
            </p>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleGoToLogin}
                fullWidth
              >
                Back to Login
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* Mobile Layout */}
      <div className="xl:hidden w-screen h-screen overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col justify-center px-6">
          <div className="max-w-sm w-full mx-auto">
            {/* Mobile Verification Card */}
            <div className="bg-surface rounded-xl p-6 shadow-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Email Verification</h2>
                <p className="text-neutral-600 text-sm">
                  Verify your email address to activate your account.
                </p>
              </div>

              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:flex w-full h-full">
        <div className="flex w-full h-full">
          {/* Left Side - Brand */}
          <div className="w-full lg:w-1/2 h-full bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col justify-center px-6 lg:px-12">
            <div className="max-w-md">
              <div className="mb-8">
                <h1 className="text-3xl lg:text-4xl font-bold mb-4">BookEase</h1>
                <p className="text-lg lg:text-xl text-brand-100">Email Verification</p>
              </div>
              
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Secure Verification</h3>
                    <p className="text-brand-100 text-sm">Click the link in your email to verify your account</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Quick Process</h3>
                    <p className="text-brand-100 text-sm">Verification links are valid for 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Account Security</h3>
                    <p className="text-brand-100 text-sm">Verified accounts have enhanced security features</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Verification Content */}
          <div className="w-full lg:w-1/2 h-full bg-surface flex flex-col justify-center px-6 lg:px-12">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">Email Verification</h2>
                <p className="text-neutral-600 text-sm lg:text-base">
                  Verify your email address to activate your account.
                </p>
              </div>

              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
