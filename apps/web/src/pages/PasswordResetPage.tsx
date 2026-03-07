import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { authApi } from '../api/auth';
import Button from '../components/ui/Button';

// Form validation schema
const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const PasswordResetPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toastStore = useToastStore();
  
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) return;
    
    try {
      const response = await authApi.verifyResetToken(token) as any;
      
      if (response.data?.valid) {
        setTokenStatus('valid');
        setEmail(response.data?.email || '');
      } else if (response.data?.message?.includes('expired')) {
        setTokenStatus('expired');
      } else {
        setTokenStatus('invalid');
      }
    } catch (error: any) {
      console.error('Token verification error:', error);
      if (error.response?.data?.message?.includes('expired')) {
        setTokenStatus('expired');
      } else {
        setTokenStatus('invalid');
      }
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);

    try {
      const response = await authApi.resetPassword({
        token: token!,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      }) as any;
      
      if (response.data?.success) {
        setIsReset(true);
        toastStore.success('Password reset successfully!');
      } else {
        toastStore.error(response.data?.message || 'Failed to reset password. Please try again.');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again later.';
      toastStore.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleRequestNewReset = () => {
    navigate('/forgot-password');
  };

  const password = watch('newPassword');
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' };
    
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    strength = Object.values(checks).filter(Boolean).length;

    const strengthMap = {
      0: { text: 'Very Weak', color: 'text-error-600' },
      1: { text: 'Weak', color: 'text-error-600' },
      2: { text: 'Fair', color: 'text-warning-600' },
      3: { text: 'Good', color: 'text-warning-600' },
      4: { text: 'Strong', color: 'text-success-600' },
      5: { text: 'Very Strong', color: 'text-success-600' },
    };

    return { strength, ...strengthMap[strength as keyof typeof strengthMap] };
  };

  const passwordStrength = getPasswordStrength(password);

  const renderContent = () => {
    switch (tokenStatus) {
      case 'loading':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              Verifying Reset Link
            </h3>
            <p className="text-neutral-600 text-sm mb-6">
              Please wait while we verify your password reset link...
            </p>
          </div>
        );

      case 'valid':
        if (isReset) {
          return (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-success-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                Password Reset Successful!
              </h3>
              <p className="text-neutral-600 text-sm mb-6">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <Button
                onClick={handleGoToLogin}
                fullWidth
              >
                Go to Login
              </Button>
            </div>
          );
        }

        return (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Display */}
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-sm text-neutral-600">
                Resetting password for:
                <span className="block font-medium text-neutral-900">{email}</span>
              </p>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-neutral-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Enter your new password"
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
              </div>
              {errors.newPassword?.message && (
                <p className="mt-1 text-xs text-error-600">{errors.newPassword?.message}</p>
              )}
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-500">Password strength:</span>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${
                        passwordStrength.strength <= 2 ? 'bg-error-500' :
                        passwordStrength.strength <= 3 ? 'bg-warning-500' : 'bg-success-500'
                      }`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-neutral-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirm your new password"
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword?.message && (
                <p className="mt-1 text-xs text-error-600">{errors.confirmPassword?.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              fullWidth
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        );

      case 'expired':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-warning-600" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              Reset Link Expired
            </h3>
            <p className="text-neutral-600 text-sm mb-6">
              The password reset link has expired. Please request a new one.
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleRequestNewReset}
                fullWidth
              >
                Request New Reset Link
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

      case 'invalid':
      default:
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-error-600" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">
              Invalid Reset Link
            </h3>
            <p className="text-neutral-600 text-sm mb-6">
              The password reset link is invalid or has been used.
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleRequestNewReset}
                fullWidth
              >
                Request New Reset Link
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
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* Mobile Layout */}
      <div className="xl:hidden w-screen h-screen overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col justify-center px-6">
          <div className="max-w-sm w-full mx-auto">
            {/* Back Button */}
            <button
              onClick={handleGoToLogin}
              className="mb-6 flex items-center text-brand-100 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </button>

            {/* Mobile Password Reset Card */}
            <div className="bg-surface rounded-xl p-6 shadow-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Reset Password</h2>
                <p className="text-neutral-600 text-sm">
                  Create a new password for your account.
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
                {/* Back Button */}
                <button
                  onClick={handleGoToLogin}
                  className="mb-6 flex items-center text-brand-100 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </button>

                <h1 className="text-3xl lg:text-4xl font-bold mb-4">BookEase</h1>
                <p className="text-lg lg:text-xl text-brand-100">Reset Your Password</p>
              </div>
              
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Secure Reset</h3>
                    <p className="text-brand-100 text-sm">Create a strong new password for your account</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Enhanced Security</h3>
                    <p className="text-brand-100 text-sm">Your new password will be encrypted and secure</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Quick Help</h3>
                    <p className="text-brand-100 text-sm">Password strength indicator helps you create secure passwords</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Password Reset Form */}
          <div className="w-full lg:w-1/2 h-full bg-surface flex flex-col justify-center px-6 lg:px-12">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">Reset Password</h2>
                <p className="text-neutral-600 text-sm lg:text-base">
                  Create a new password for your account.
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

export default PasswordResetPage;
