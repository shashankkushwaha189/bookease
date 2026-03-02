import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, isAuthenticated, user } = useAuthStore();
  const { currentTenant } = useTenantStore();
  
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string>('');
  const [failedAttempts, setFailedAttempts] = React.useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const returnUrl = searchParams.get('returnUrl');
      navigate(returnUrl || '/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate, searchParams]);

  // Ensure tenant ID is set for login
  useEffect(() => {
    const DEMO_TENANT_ID = '259ccbbf-2587-4eee-a214-43713a1f0bde';
    const { tenantId, setTenantId } = useTenantStore.getState();
    if (!tenantId) {
      setTenantId(DEMO_TENANT_ID);
    }
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setSubmitError('');
    
    try {
      await login(data.email, data.password);
      // Navigation is handled by useEffect above
    } catch (error: any) {
      // Increment failed attempts
      setFailedAttempts(prev => prev + 1);
      
      // Handle different error types with generic messages
      if (error.response?.status === 401) {
        setSubmitError('Invalid email or password');
      } else if (error.response?.status === 429) {
        setSubmitError('Too many attempts. Try again in a few minutes.');
      } else {
        setSubmitError('An error occurred. Please try again.');
      }
      
      // Never reveal which field is wrong - set error on form level
      setError('root', { message: submitError });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Demo credentials auto-fill
  const fillDemoCredentials = () => {
    setValue('email', 'admin@demo.com');
    setValue('password', 'demo123456');
  };

  // Show CAPTCHA placeholder after 5 failed attempts
  const showCaptcha = failedAttempts >= 5;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Business Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          {currentTenant?.logoUrl ? (
            <img 
              src={currentTenant.logoUrl} 
              alt={currentTenant.businessName || 'Business'} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <svg className="w-8 h-8 text-primary-soft" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          {currentTenant?.businessName || 'BookEase'}
        </h1>
        <h2 className="text-lg font-semibold text-neutral-900">Welcome back</h2>
        <p className="text-neutral-600">Sign in to your account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Field */}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          disabled={isLoading}
          error={errors.email?.message}
          {...register('email')}
        />
        
        {/* Password Field */}
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            disabled={isLoading}
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 pr-3 flex items-center pt-6"
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
            ) : (
              <Eye className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
            )}
          </button>
        </div>

        {/* Form-level Error */}
        {errors.root?.message && (
          <div className="bg-danger-soft border border-danger rounded-lg p-3">
            <p className="text-danger text-sm">{errors.root.message}</p>
          </div>
        )}

        {/* CAPTCHA Placeholder */}
        {showCaptcha && (
          <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-4 text-center">
            <p className="text-neutral-600 text-sm">CAPTCHA verification required</p>
            <p className="text-neutral-500 text-xs mt-1">Please complete the security check to continue</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isLoading}
          disabled={isLoading || showCaptcha}
          className="w-full"
        >
          Sign In
        </Button>

        {/* Demo Credentials Button */}
        {import.meta.env.VITE_DEMO_MODE && (
          <div className="pt-4 border-t border-neutral-200">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={fillDemoCredentials}
              className="w-full"
            >
              <Zap className="w-4 h-4 mr-2" />
              Fill Demo Credentials
            </Button>
            <p className="text-xs text-neutral-500 text-center mt-2">
              Demo credentials — do not use in production
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default LoginPage;
