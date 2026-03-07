import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { useAuthStore } from '../stores/auth.store';
import { authApi } from '../api/auth';
import TwoFactorAuth from '../components/TwoFactorAuth';
import Button from '../components/ui/Button';

const TwoFactorVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toastStore = useToastStore();
  const { setAuth } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [method, setMethod] = useState<'totp' | 'email' | 'sms'>('totp');
  const [email, setEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [showBackup, setShowBackup] = useState(false);

  // Get parameters from URL
  const token = searchParams.get('token');
  const authMethod = searchParams.get('method') as 'totp' | 'email' | 'sms';
  const userEmail = searchParams.get('email');

  useEffect(() => {
    if (!token) {
      toastStore.error('Invalid verification request');
      navigate('/login');
      return;
    }

    setTempToken(token);
    if (authMethod) setMethod(authMethod);
    if (userEmail) setEmail(userEmail);
  }, [token, authMethod, userEmail, navigate, toastStore]);

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.verifyTwoFactor({
        token: tempToken,
        code,
        method,
      }) as any;

      if (response.data?.success) {
        const { user, token: authToken } = response.data.data;
        setAuth(user, authToken, true);
        toastStore.success('Authentication successful!');
        
        // Redirect to appropriate page
        const redirectTo = searchParams.get('redirect') || '/admin/dashboard';
        navigate(redirectTo);
      } else {
        throw new Error(response.data?.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('2FA verification error:', error);
      throw error; // Re-throw to let component handle error display
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const response = await authApi.resendTwoFactor(tempToken) as any;
      
      if (response.data?.success) {
        if (response.data.data?.method) {
          setMethod(response.data.data.method);
        }
      } else {
        throw new Error(response.data?.message || 'Failed to resend code');
      }
    } catch (error: any) {
      console.error('Resend 2FA error:', error);
      throw error;
    }
  };

  const handleUseBackup = () => {
    setShowBackup(true);
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (showBackup) {
    return (
      <div className="w-screen h-screen overflow-hidden">
        {/* Mobile Layout */}
        <div className="xl:hidden w-screen h-screen overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col justify-center px-6">
            <div className="max-w-sm w-full mx-auto">
              <button
                onClick={handleBackToLogin}
                className="mb-6 flex items-center text-brand-100 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </button>

              <div className="bg-surface rounded-xl p-6 shadow-xl">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                    Backup Code Verification
                  </h3>
                  <p className="text-neutral-600 text-sm mb-6">
                    Enter one of your 8-character backup codes
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowBackup(false)}
                    fullWidth
                  >
                    Back to 2FA
                  </Button>
                </div>
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
                  <button
                    onClick={handleBackToLogin}
                    className="mb-6 flex items-center text-brand-100 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </button>

                  <h1 className="text-3xl lg:text-4xl font-bold mb-4">BookEase</h1>
                  <p className="text-lg lg:text-xl text-brand-100">Backup Code Verification</p>
                </div>
                
                <div className="space-y-4 lg:space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Emergency Access</h3>
                      <p className="text-brand-100 text-sm">Use your backup codes when you can't access your 2FA device</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Backup Code Form */}
            <div className="w-full lg:w-1/2 h-full bg-surface flex flex-col justify-center px-6 lg:px-12">
              <div className="max-w-md w-full mx-auto">
                <div className="mb-6 lg:mb-8">
                  <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">Backup Code Verification</h2>
                  <p className="text-neutral-600 text-sm lg:text-base">
                    Enter one of your 8-character backup codes
                  </p>
                </div>

                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowBackup(false)}
                    fullWidth
                  >
                    Back to 2FA
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* Mobile Layout */}
      <div className="xl:hidden w-screen h-screen overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col justify-center px-6">
          <div className="max-w-sm w-full mx-auto">
            <button
              onClick={handleBackToLogin}
              className="mb-6 flex items-center text-brand-100 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </button>

            <div className="bg-surface rounded-xl p-6 shadow-xl">
              <TwoFactorAuth
                onVerify={handleVerify}
                onResend={handleResend}
                onUseBackup={handleUseBackup}
                isLoading={isLoading}
                email={email}
                method={method}
              />
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
                <button
                  onClick={handleBackToLogin}
                  className="mb-6 flex items-center text-brand-100 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </button>

                <h1 className="text-3xl lg:text-4xl font-bold mb-4">BookEase</h1>
                <p className="text-lg lg:text-xl text-brand-100">Two-Factor Authentication</p>
              </div>
              
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Enhanced Security</h3>
                    <p className="text-brand-100 text-sm">Add an extra layer of protection to your account</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Secure Verification</h3>
                    <p className="text-brand-100 text-sm">Only you can access your account with your 2FA code</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Peace of Mind</h3>
                    <p className="text-brand-100 text-sm">Your account is protected even if your password is compromised</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - 2FA Form */}
          <div className="w-full lg:w-1/2 h-full bg-surface flex flex-col justify-center px-6 lg:px-12">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">Two-Factor Authentication</h2>
                <p className="text-neutral-600 text-sm lg:text-base">
                  Enter your verification code to complete sign in
                </p>
              </div>

              <TwoFactorAuth
                onVerify={handleVerify}
                onResend={handleResend}
                onUseBackup={handleUseBackup}
                isLoading={isLoading}
                email={email}
                method={method}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerificationPage;
