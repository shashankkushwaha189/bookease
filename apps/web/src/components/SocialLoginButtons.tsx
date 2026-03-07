import React, { useState } from 'react';
import { Chrome, Github } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/auth.store';

interface SocialLoginButtonsProps {
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  isLoading = false,
  disabled = false,
  className = '',
}) => {
  const toastStore = useToastStore();
  const { setAuth } = useAuthStore();
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);

  const handleGoogleLogin = async () => {
    if (socialLoading) return;
    
    setSocialLoading('google');
    try {
      // Get Google OAuth URL
      const response = await authApi.getGoogleAuthUrl() as any;
      const authUrl = response.data?.url;
      
      if (authUrl) {
        // Redirect to Google OAuth
        window.location.href = authUrl;
      } else {
        toastStore.error('Failed to initialize Google login');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      toastStore.error('Failed to connect with Google');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGitHubLogin = async () => {
    if (socialLoading) return;
    
    setSocialLoading('github');
    try {
      // Get GitHub OAuth URL
      const response = await authApi.getGitHubAuthUrl() as any;
      const authUrl = response.data?.url;
      
      if (authUrl) {
        // Redirect to GitHub OAuth
        window.location.href = authUrl;
      } else {
        toastStore.error('Failed to initialize GitHub login');
      }
    } catch (error: any) {
      console.error('GitHub login error:', error);
      toastStore.error('Failed to connect with GitHub');
    } finally {
      setSocialLoading(null);
    }
  };

  // Handle OAuth callback
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      toastStore.error('Social login was cancelled or failed');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (provider && code) {
      handleOAuthCallback(provider, code, state);
    }
  }, []);

  const handleOAuthCallback = async (provider: string, code: string, state?: string | null) => {
    try {
      setSocialLoading(provider as 'google' | 'github');
      
      let response;
      if (provider === 'google') {
        response = await authApi.loginWithGoogle(code);
      } else if (provider === 'github') {
        response = await authApi.loginWithGitHub(code);
      } else {
        throw new Error('Invalid provider');
      }

      const authData = response.data as any;
      
      if (authData.success) {
        const { user, token } = authData.data;
        setAuth(user, token, true); // Remember social login users by default
        toastStore.success(`Successfully logged in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        toastStore.error(authData.message || 'Social login failed');
      }
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      toastStore.error(error.response?.data?.message || 'Social login failed');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-surface text-neutral-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={disabled || isLoading || socialLoading !== null}
          className="flex items-center justify-center px-3 py-2.5 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {socialLoading === 'google' ? (
            <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          ) : (
            <Chrome className="w-4 h-4 text-neutral-700" />
          )}
          <span className="ml-2 text-sm font-medium text-neutral-700">
            Google
          </span>
        </button>

        {/* GitHub Login Button */}
        <button
          type="button"
          onClick={handleGitHubLogin}
          disabled={disabled || isLoading || socialLoading !== null}
          className="flex items-center justify-center px-3 py-2.5 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {socialLoading === 'github' ? (
            <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          ) : (
            <Github className="w-4 h-4 text-neutral-700" />
          )}
          <span className="ml-2 text-sm font-medium text-neutral-700">
            GitHub
          </span>
        </button>
      </div>

      <p className="text-xs text-neutral-500 text-center leading-relaxed">
        By continuing, you agree to our{' '}
        <a href="/terms" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
          Privacy Policy
        </a>
      </p>
    </div>
  );
};

export default SocialLoginButtons;
