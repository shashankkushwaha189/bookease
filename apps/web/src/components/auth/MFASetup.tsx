import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';

interface MFASetupData {
  secret: string;
  backupCodes: string[];
  qrCode: string;
}

export const MFASetup: React.FC = () => {
  const { enableMFA } = useAuth();
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [backupCodeCopied, setBackupCodeCopied] = useState<string | null>(null);

  const generateMFASetup = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setSetupData(data.data);
      } else {
        throw new Error('Failed to generate MFA setup');
      }
    } catch (error) {
      console.error('MFA setup error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      copyToClipboard(setupData.secret).then(success => {
        if (success) {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
      });
    }
  };

  const copyBackupCode = (code: string) => {
    copyToClipboard(code).then(success => {
      if (success) {
        setBackupCodeCopied(code);
        setTimeout(() => setBackupCodeCopied(null), 2000);
      }
    });
  };

  const enableMFAWithSecret = async () => {
    if (setupData?.secret) {
      try {
        await enableMFA(setupData.secret);
      } catch (error) {
        console.error('MFA enable failed:', error);
      }
    }
  };

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 border-t-transparent"></div>
          </div>
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
            Setting Up Multi-Factor Authentication
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Generating your secure MFA codes...
          </p>
        </div>
      </div>
    );
  }

  if (!setupData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Multi-Factor Authentication Setup
            </h2>
            <p className="text-gray-600 mb-6">
              Set up MFA to enhance your account security
            </p>
            <button
              onClick={generateMFASetup}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Generate MFA Setup
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
              {/* Left Column - Instructions */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Multi-Factor Authentication Setup
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Follow these steps to enable MFA on your account:
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">
                      1. Scan QR Code
                    </h3>
                    <p className="text-blue-700 mb-4">
                      Use your authenticator app (Google Authenticator, Authy, etc.) to scan the QR code below.
                    </p>
                    
                    {setupData.qrCode && (
                      <div className="flex justify-center mb-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <QRCodeSVG
                            value={setupData.qrCode}
                            size={256}
                            className="w-64 h-64"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={copySecret}
                        disabled={isCopied}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <Copy className="w-5 h-5" />
                        <span className="ml-2">
                          {isCopied ? 'Copied!' : 'Copy Secret'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-4">
                      2. Save Backup Codes
                    </h3>
                    <p className="text-yellow-700 mb-4">
                      Save these backup codes in a secure location. You can use them if you lose access to your authenticator app.
                    </p>
                    
                    <div className="space-y-2">
                      {setupData.backupCodes.map((code, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-yellow-300">
                          <span className="font-mono text-sm">{code}</span>
                          <button
                            onClick={() => copyBackupCode(code)}
                            disabled={backupCodeCopied === code}
                            className="ml-2 p-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">
                      3. Test Your Setup
                    </h3>
                    <p className="text-green-700 mb-4">
                      Enter a code from your authenticator app to verify everything is working correctly.
                    </p>
                    
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Enter 6-digit code"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        maxLength={6}
                      />
                      
                      <button
                        onClick={enableMFAWithSecret}
                        className="w-full mt-4 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        Enable MFA
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Security Tips */}
                <div className="space-y-6">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      <Check className="w-6 h-6 text-green-500 mb-2" />
                      Security Tips
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                        Store backup codes in a secure, offline location
                      </li>
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                        Never share your secret key with anyone
                      </li>
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                        Use a reputable authenticator app
                      </li>
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                        Keep your backup codes safe and private
                      </li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">
                      Recommended Authenticator Apps
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="font-semibold">Google Authenticator</div>
                        <div className="text-sm text-gray-600">Free, built-in</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Authy</div>
                        <div className="text-sm text-gray-600">Free, SMS backup</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Microsoft Authenticator</div>
                        <div className="text-sm text-gray-600">Free, cloud sync</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">1Password</div>
                        <div className="text-sm text-gray-600">Paid, secure</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">LastPass</div>
                        <div className="text-sm text-gray-600">Free, secure</div>
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
