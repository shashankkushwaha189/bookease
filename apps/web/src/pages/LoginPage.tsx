import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';
import SocialLoginButtons from '../components/SocialLoginButtons';

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onForgotPassword?: () => void;
  onRegister?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, user, isLocked, lockoutUntil, failedAttempts, incrementFailedAttempts, checkLockoutStatus } = useAuthStore();
  const { setTenantId } = useTenantStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log('🔍 User logged in:', { 
        email: user.email, 
        role: user.role,
        roleType: typeof user.role 
      });
      const redirectTo = searchParams.get('redirect') || getDefaultRouteForRole(user.role);
      console.log('🚀 Redirecting to:', redirectTo);
      navigate(redirectTo);
    }
  }, [user, navigate, searchParams]);

  // Handle successful login redirect
  useEffect(() => {
    if (isSuccess && user) {
      console.log('✅ Login successful:', { 
        email: user.email, 
        role: user.role,
        roleType: typeof user.role 
      });
      const timer = setTimeout(() => {
        const redirectTo = searchParams.get('redirect') || getDefaultRouteForRole(user.role);
        console.log('⏰ Timer redirecting to:', redirectTo);
        navigate(redirectTo);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, user, navigate, searchParams]);

  // Get default route based on user role
  const getDefaultRouteForRole = (role: string): string => {
    console.log('🎯 getDefaultRouteForRole called with:', { role, roleType: typeof role });
    switch (role) {
      case 'ADMIN':
        console.log('🎯 Redirecting to ADMIN route: /admin/dashboard');
        return '/admin/dashboard';
      case 'STAFF':
        console.log('🎯 Redirecting to STAFF route: /staff/schedule');
        return '/staff/schedule';
      case 'USER':
        console.log('🎯 Redirecting to USER route: /customer/bookings');
        return '/customer/bookings';
      default:
        console.log('🎯 Unknown role, defaulting to ADMIN route: /admin/dashboard');
        return '/admin/dashboard';
    }
  };

  // Handle tenant selection from URL
  useEffect(() => {
    const tenantId = searchParams.get('tenant');
    if (tenantId) {
      setTenantId(tenantId);
    }
    
    // Ensure demo tenant ID is always set for login
    const DEMO_TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';
    const { tenantId: currentTenantId } = useTenantStore.getState();
    if (!currentTenantId) {
      setTenantId(DEMO_TENANT_ID);
      console.log('🏢 Initialized tenant ID:', DEMO_TENANT_ID);
    }
  }, [searchParams, setTenantId]);

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
      const { tenantId, setTenantId: setTenant } = useTenantStore.getState();
      if (!tenantId) {
        setTenant(DEMO_TENANT_ID);
        console.log('🏢 Set tenant ID:', DEMO_TENANT_ID);
      }
      
      console.log('🔐 Attempting login with:', { 
        email: data.email, 
        rememberMe: data.rememberMe,
        tenantId: useTenantStore.getState().tenantId,
        apiUrl: import.meta.env.VITE_API_URL 
      });
      
      await login(data.email, data.password, data.rememberMe);
      setIsSuccess(true);
    } catch (error: any) {
      console.error('❌ Login error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      incrementFailedAttempts();
      
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

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const showCaptcha = failedAttempts >= 5;

  // Check lockout status
  useEffect(() => {
    checkLockoutStatus();
  }, [checkLockoutStatus]);

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-gray-50">
      {/* Full Screen Login Form */}
      <div className="flex min-h-screen w-full">
        {/* Login Form - Full Width */}
        <div className="w-full min-h-screen bg-white flex flex-col justify-center px-6 lg:px-8 xl:px-12 py-8">
          <div className="w-full max-w-lg mx-auto">
            <div className="mb-8 lg:mb-10 text-center">
              <h1 className="text-4xl lg:text-5xl font-bold text-blue-600 mb-4">BookEase</h1>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">Welcome Back</h2>
              <p className="text-gray-600 text-lg">Sign in to your account to continue</p>
            </div>

            {/* Success Message */}
            {isSuccess && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-3 mb-4 animate-slide-in">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-success-600 mr-2" />
                  <p className="text-sm text-success-800">Login successful! Redirecting...</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-3 mb-4 animate-slide-in">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-error-600 mr-2" />
                  <p className="text-sm text-error-800">{submitError}</p>
                </div>
              </div>
            )}

            {/* Account Lockout Warning */}
            {isLocked && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-error-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-error-800 mb-1">
                      Account Temporarily Locked
                    </h4>
                    <p className="text-xs text-error-700 mb-2">
                      Too many failed login attempts. Your account has been locked for security.
                    </p>
                    {lockoutUntil && (
                      <p className="text-xs text-error-600">
                        Lockout expires: {lockoutUntil.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Failed Attempts Warning */}
            {!isLocked && failedAttempts > 0 && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-warning-600 mr-2" />
                  <p className="text-xs text-warning-800">
                    {5 - failedAttempts} attempts remaining before account lockout
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base placeholder-gray-400 disabled:opacity-50 transition-all duration-200 bg-gray-50 focus:bg-white"
                    {...register('email')}
                  />
                </div>
                {errors.email?.message && (
                  <p className="mt-2 text-sm text-red-600 font-medium">{errors.email?.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isLoading}
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base placeholder-gray-400 disabled:opacity-50 transition-all duration-200 bg-gray-50 focus:bg-white"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password?.message && (
                  <p className="mt-2 text-sm text-red-600 font-medium">{errors.password?.message}</p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center py-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  {...register('rememberMe')}
                />
                <label htmlFor="rememberMe" className="ml-3 text-base text-gray-700 font-medium">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || showCaptcha || isLocked}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Additional Links */}
              <div className="mt-8 flex items-center justify-between text-base">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={handleRegister}
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  Create account
                </button>
              </div>

              {/* Social Login */}
              <SocialLoginButtons 
                isLoading={isLoading}
                disabled={showCaptcha || isLocked}
                className="mt-8"
              />

              {/* Demo Credentials */}
              {!isLoading && (
                <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                  <div className="flex flex-col space-y-3">
                    <div className="text-base text-gray-700">
                      <div className="font-bold text-lg mb-3 text-blue-800">Demo Credentials:</div>
                      <div className="space-y-3">
                        {/* Admin */}
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <div className="font-semibold text-blue-700 mb-2">👑 ADMIN</div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-medium">Email:</span>
                              <code className="text-gray-800 bg-blue-50 px-3 py-2 rounded-md text-sm border border-blue-200 font-mono">admin@demo.com</code>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-medium">Password:</span>
                              <code className="text-gray-800 bg-blue-50 px-3 py-2 rounded-md text-sm border border-blue-200 font-mono">demo123456</code>
                            </div>
                          </div>
                        </div>
                        
                        {/* Staff */}
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <div className="font-semibold text-green-700 mb-2">👥 STAFF</div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-medium">Email:</span>
                              <code className="text-gray-800 bg-green-50 px-3 py-2 rounded-md text-sm border border-green-200 font-mono">staff@demo.com</code>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-medium">Password:</span>
                              <code className="text-gray-800 bg-green-50 px-3 py-2 rounded-md text-sm border border-green-200 font-mono">demo123456</code>
                            </div>
                          </div>
                        </div>
                        
                        {/* Customer */}
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <div className="font-semibold text-purple-700 mb-2">🛍️ CUSTOMER</div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-medium">Email:</span>
                              <code className="text-gray-800 bg-purple-50 px-3 py-2 rounded-md text-sm border border-purple-200 font-mono">customer@demo.com</code>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-medium">Password:</span>
                              <code className="text-gray-800 bg-purple-50 px-3 py-2 rounded-md text-sm border border-purple-200 font-mono">demo123456</code>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setValue('email', 'admin@demo.com', { shouldValidate: true });
                          setValue('password', 'demo123456', { shouldValidate: true });
                        }}
                        className="flex-1 text-sm bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-semibold"
                      >
                        Fill Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setValue('email', 'staff@demo.com', { shouldValidate: true });
                          setValue('password', 'demo123456', { shouldValidate: true });
                        }}
                        className="flex-1 text-sm bg-green-600 text-white px-3 py-2 rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 font-semibold"
                      >
                        Fill Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setValue('email', 'customer@demo.com', { shouldValidate: true });
                          setValue('password', 'demo123456', { shouldValidate: true });
                        }}
                        className="flex-1 text-sm bg-purple-600 text-white px-3 py-2 rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 font-semibold"
                      >
                        Fill Customer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
