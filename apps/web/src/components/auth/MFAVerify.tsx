import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { Shield, Check, X, Clock } from 'lucide-react';

interface MFAVerifyData {
  code: string;
  method: 'totp' | 'sms' | 'email';
  expiresAt: Date;
}

export const MFAVerify: React.FC = () => {
  const { mfaRequired } = useAuth();
  const [verifyData, setVerifyData] = useState<MFAVerifyData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isResent, setIsResent] = useState(false);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => (prev !== null ? prev - 1 : null));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const sendNewCode = async (method: 'sms' | 'email') => {
    try {
      const response = await fetch('/api/mfa/sms/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });

      if (response.ok) {
        const data = await response.json();
        setVerifyData({
          code: '',
          method,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });
        setTimeRemaining(600); // 10 minutes in seconds
        setIsResent(true);
        setTimeout(() => setIsResent(false), 3000);
      }
    } catch (error) {
      console.error('Failed to send verification code:', error);
    }
  };

  const verifyCode = async () => {
    if (!verifyData?.code) {
      return;
    }

    setIsVerifying(true);
    
    try {
      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verifyData.code,
          method: verifyData.method,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // MFA verification successful - redirect to dashboard
          window.location.href = '/dashboard';
        } else {
          throw new Error(data.error?.message || 'Verification failed');
        }
      }
    } catch (error) {
      setIsVerifying(false);
      throw error;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!mfaRequired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center">
            <Shield className="w-16 h-16 text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Multi-Factor Authentication Not Required
            </h2>
            <p className="text-gray-600 mb-6">
              Your account does not have MFA enabled. You're all set!
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg sm:overflow-hidden">
          <div className="px-4 py-8 sm:px-10">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Left Column - Verification Form */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
                    Verify Your Identity
                  </h2>
                  <p className="text-center text-gray-600 mb-6">
                    Enter the verification code sent to your device
                  </p>
                </div>

                <div className="bg-blue-50 border border border-blue-200 rounded-lg p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                      <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        {verifyData?.method === 'totp' ? 'Enter Authenticator Code' : 
                         verifyData?.method === 'sms' ? 'Enter SMS Code' : 'Enter Email Code'}
                      </h3>
                      
                      {verifyData?.method === 'totp' && (
                        <p className="text-blue-700 text-sm">
                          Open your authenticator app and enter the 6-digit code
                        </p>
                      )}
                      
                      {verifyData?.method === 'sms' && (
                        <p className="text-blue-700 text-sm">
                          Enter the 6-digit code sent to your phone
                        </p>
                      )}
                      
                      {verifyData?.method === 'email' && (
                        <p className="text-blue-700 text-sm">
                          Enter the 6-digit code sent to your email
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={verifyData?.code || ''}
                          onChange={(e) => setVerifyData(prev => prev ? { ...prev, code: e.target.value } : null)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                          disabled={isVerifying}
                        />
                        
                        {timeRemaining !== null && timeRemaining > 0 && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{formatTime(timeRemaining)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-4">
                        <button
                          onClick={verifyCode}
                          disabled={isVerifying || !verifyData?.code || verifyData.code.length !== 6}
                          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {isVerifying ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 border-t-transparent mr-2"></div>
                              Verifying...
                            </div>
                          ) : (
                            'Verify'
                          )}
                        </button>
                        
                        {(verifyData?.method === 'sms' || verifyData?.method === 'email') && (
                          <button
                            onClick={() => sendNewCode(verifyData.method)}
                            disabled={isResent || timeRemaining !== null && timeRemaining > 540} // Only allow resend after 9 minutes
                            className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                          >
                            {isResent ? (
                              <div className="flex items-center">
                                <Check className="w-4 h-4 mr-2" />
                                Code Sent!
                              </div>
                            ) : (
                              <>
                                {timeRemaining !== null && timeRemaining > 540 && (
                                  <span className="text-sm text-gray-500">
                                    Wait {Math.ceil((timeRemaining - 540) / 60)} min
                                  </span>
                                )}
                                <span>Resend Code</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {timeRemaining !== null && timeRemaining <= 540 && (
                        <div className="text-center text-sm text-gray-500 mt-4">
                          Request a new code if you don't receive it within 10 minutes
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Instructions */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        <Check className="w-6 h-6 text-green-500 mb-2" />
                        Verification Instructions
                      </h3>
                      
                      <div className="space-y-3 text-sm text-gray-600">
                        {verifyData?.method === 'totp' && (
                          <>
                            <p>1. Open your authenticator app (Google Authenticator, Authy, etc.)</p>
                            <p>2. Look for a 6-digit code</p>
                            <p>3. Enter the code in the field above</p>
                            <p>4. Click "Verify" to complete setup</p>
                          </>
                        )}
                        
                        {verifyData?.method === 'sms' && (
                          <>
                            <p>1. Check your phone for a text message</p>
                            <p>2. Enter the 6-digit code from the message</p>
                            <p>3. Code expires in 10 minutes</p>
                            <p>4. Click "Verify" to complete authentication</p>
                          </>
                        )}
                        
                        {verifyData?.method === 'email' && (
                          <>
                            <p>1. Check your email for a verification message</p>
                            <p>2. Enter the 6-digit code from the email</p>
                            <p>3. Code expires in 15 minutes</p>
                            <p>4. Click "Verify" to complete authentication</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-yellow-900 mb-4">
                        <X className="w-6 h-6 text-yellow-600 mb-2" />
                        Having Trouble?
                      </h3>
                      
                      <div className="space-y-3 text-sm text-yellow-700">
                        <p><strong>No code received?</strong></p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                          <li>Check your spam/junk folder</li>
                          <li>Make sure your phone/email is correct</li>
                          <li>Try requesting a new code</li>
                          <li>Contact support if issues persist</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
