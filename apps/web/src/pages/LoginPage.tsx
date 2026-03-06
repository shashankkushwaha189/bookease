import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Calendar, Mail, Lock, AlertCircle, CheckCircle, Users, Clock, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onForgotPassword?: () => void;
  onRegister?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onForgotPassword, onRegister }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, user } = useAuthStore();
  const { currentTenant } = useTenantStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = searchParams.get('redirect') || getDefaultRouteForRole(user.role);
      navigate(redirectTo);
    }
  }, [user, navigate, searchParams]);

  // Handle successful login redirect
  useEffect(() => {
    if (isSuccess && user) {
      const timer = setTimeout(() => {
        const redirectTo = searchParams.get('redirect') || getDefaultRouteForRole(user.role);
        navigate(redirectTo);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, user, navigate, searchParams]);

  // Get default route based on user role
  const getDefaultRouteForRole = (role: string): string => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'STAFF':
        return '/staff/schedule';
      case 'USER':
        return '/customer/bookings';
      default:
        return '/admin/dashboard';
    }
  };

  // Handle tenant selection from URL
  useEffect(() => {
    const tenantId = searchParams.get('tenant');
    if (tenantId) {
      // Set tenant logic here
    }
    
    // Ensure demo tenant ID is always set for login
    const DEMO_TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';
    const { tenantId: currentTenantId, setTenantId } = useTenantStore.getState();
    if (!currentTenantId) {
      setTenantId(DEMO_TENANT_ID);
      console.log('🏢 Initialized tenant ID:', DEMO_TENANT_ID);
    }
  }, [searchParams]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const onSubmit = async (data: LoginFormData) => {
    setSubmitError('');
    setIsSuccess(false);
    setIsLoading(true);
    
    try {
      // Ensure tenant ID is set before login
      const DEMO_TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';
      const { tenantId, setTenantId } = useTenantStore.getState();
      if (!tenantId) {
        setTenantId(DEMO_TENANT_ID);
        console.log('🏢 Set tenant ID:', DEMO_TENANT_ID);
      }
      
      await login(data.email, data.password);
      setIsSuccess(true);
    } catch (error: any) {
      setFailedAttempts(prev => prev + 1);
      
      if (error.response?.status === 401) {
        setSubmitError('Invalid email or password');
      } else if (error.response?.status === 429) {
        setSubmitError('Too many attempts. Please try again later.');
      } else {
        setSubmitError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setValue('email', 'admin@demo.com', { shouldValidate: true });
    setValue('password', 'demo123456', { shouldValidate: true });
  };

  const showCaptcha = failedAttempts >= 5;

  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* Desktop Layout - CLEAN SPLIT SCREEN */}
      <div className="hidden xl:flex w-full h-full">
        <div className="flex w-full h-full">
          {/* Left Side - Brand */}
          <div className="w-1/2 h-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex flex-col justify-center px-12">
            <div className="max-w-md">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">BookEase</h1>
                <p className="text-lg text-blue-100">Welcome to our platform</p>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Multi-Tenant Support</h3>
                    <p className="text-blue-100 text-sm">Manage multiple businesses from one platform</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Smart Scheduling</h3>
                    <p className="text-blue-100 text-sm">Intelligent booking and calendar management</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Secure & Reliable</h3>
                    <p className="text-blue-100 text-sm">Enterprise-grade security for your data</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-1/2 h-full bg-white flex flex-col justify-center px-12">
            <div className="max-w-md w-full">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h2>
                <p className="text-gray-600">Welcome back! Please enter your details</p>
              </div>

              {/* Success Message */}
              {isSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">Login successful! Redirecting...</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                    <p className="text-sm text-red-800">{submitError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      disabled={isLoading}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400 disabled:opacity-50"
                      {...register('email')}
                    />
                  </div>
                  {errors.email?.message && (
                    <p className="mt-1 text-xs text-red-600">{errors.email?.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400 disabled:opacity-50"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password?.message && (
                    <p className="mt-1 text-xs text-red-600">{errors.password?.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || showCaptcha}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </button>

                {/* Demo Credentials */}
                {!isLoading && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        <div className="font-medium mb-2">Demo Credentials:</div>
                        <div className="space-y-1">
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <code className="text-gray-800 ml-2 bg-white px-2 py-1 rounded text-xs">admin@demo.com</code>
                          </div>
                          <div>
                            <span className="text-gray-600">Password:</span>
                            <code className="text-gray-800 ml-2 bg-white px-2 py-1 rounded text-xs">demo123456</code>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={fillDemoCredentials}
                        className="text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - CLEAN DESIGN NO SCROLL */}
      <div className="xl:hidden w-screen h-screen overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex flex-col justify-center px-6">
          <div className="max-w-sm w-full mx-auto">
            {/* Mobile Logo */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">BookEase</h1>
              <p className="text-blue-100">Welcome to our platform</p>
            </div>

            {/* Mobile Login Card */}
            <div className="bg-white rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h2>
                <p className="text-gray-600 text-sm">Welcome back! Please enter your details</p>
              </div>

              {/* Success Message */}
              {isSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <p className="text-sm text-green-800">Login successful! Redirecting...</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                    <p className="text-sm text-red-800">{submitError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      disabled={isLoading}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400 disabled:opacity-50"
                      {...register('email')}
                    />
                  </div>
                  {errors.email?.message && (
                    <p className="mt-1 text-xs text-red-600">{errors.email?.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400 disabled:opacity-50"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password?.message && (
                    <p className="mt-1 text-xs text-red-600">{errors.password?.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || showCaptcha}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </button>

                {/* Demo Credentials */}
                {!isLoading && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        <div className="font-medium mb-2">Demo Credentials:</div>
                        <div className="space-y-1">
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <code className="text-gray-800 ml-2 bg-white px-2 py-1 rounded text-xs">admin@demo.com</code>
                          </div>
                          <div>
                            <span className="text-gray-600">Password:</span>
                            <code className="text-gray-800 ml-2 bg-white px-2 py-1 rounded text-xs">demo123456</code>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={fillDemoCredentials}
                        className="text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
