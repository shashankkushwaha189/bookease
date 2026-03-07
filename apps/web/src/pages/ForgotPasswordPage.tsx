import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { authApi } from '../api/auth';
import Button from '../components/ui/Button';

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const toastStore = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setSubmittedEmail(data.email);

    try {
      const response = await authApi.forgotPassword(data) as any;
      
      if (response.data?.success) {
        setIsSubmitted(true);
        toastStore.success('Password reset instructions have been sent to your email');
      } else {
        toastStore.error(response.data?.message || 'Failed to send reset email. Please try again.');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again later.';
      toastStore.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* Mobile Layout */}
      <div className="xl:hidden w-screen h-screen overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col justify-center px-6">
          <div className="max-w-sm w-full mx-auto">
            {/* Back Button */}
            <button
              onClick={handleBackToLogin}
              className="mb-6 flex items-center text-brand-100 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </button>

            {/* Mobile Forgot Password Card */}
            <div className="bg-surface rounded-xl p-6 shadow-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Forgot Password</h2>
                <p className="text-neutral-600 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {!isSubmitted ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="w-4 h-4 text-neutral-400" />
                      </div>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        disabled={isLoading}
                        className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                        {...register('email')}
                      />
                    </div>
                    {errors.email?.message && (
                      <p className="mt-1 text-xs text-error-600">{errors.email?.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    loading={isLoading}
                    fullWidth
                    className="w-full"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              ) : (
                /* Success State */
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    Check Your Email
                  </h3>
                  <p className="text-neutral-600 text-sm mb-6">
                    We've sent password reset instructions to:
                    <br />
                    <span className="font-medium text-neutral-800">{submittedEmail}</span>
                  </p>
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-500">
                      Didn't receive the email? Check your spam folder or
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setIsSubmitted(false)}
                      className="w-full"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleBackToLogin}
                  className="text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors"
                >
                  Back to Login
                </button>
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
                {/* Back Button */}
                <button
                  onClick={handleBackToLogin}
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
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Email Reset Link</h3>
                    <p className="text-brand-100 text-sm">We'll send you a secure link to reset your password</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Secure Process</h3>
                    <p className="text-brand-100 text-sm">Password reset links are secure and expire after 24 hours</p>
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
                    <p className="text-brand-100 text-sm">Can't find the email? Check your spam folder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Forgot Password Form */}
          <div className="w-full lg:w-1/2 h-full bg-surface flex flex-col justify-center px-6 lg:px-12">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">Forgot Password</h2>
                <p className="text-neutral-600 text-sm lg:text-base">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {!isSubmitted ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="w-4 h-4 text-neutral-400" />
                      </div>
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        disabled={isLoading}
                        className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                        {...register('email')}
                      />
                    </div>
                    {errors.email?.message && (
                      <p className="mt-1 text-xs text-error-600">{errors.email?.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    loading={isLoading}
                    fullWidth
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              ) : (
                /* Success State */
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    Check Your Email
                  </h3>
                  <p className="text-neutral-600 text-sm mb-6">
                    We've sent password reset instructions to:
                    <br />
                    <span className="font-medium text-neutral-800">{submittedEmail}</span>
                  </p>
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-500">
                      Didn't receive the email? Check your spam folder or
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setIsSubmitted(false)}
                      fullWidth
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleBackToLogin}
                  className="text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
