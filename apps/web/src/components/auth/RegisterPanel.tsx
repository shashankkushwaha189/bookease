import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft, User, Building } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useTenantStore } from '../stores/tenant.store';

// Form validation schema
const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  businessName: z.string().min(1, "Business name is required"),
  tenantSlug: z.string().min(3, "Tenant slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterPanelProps {
  onBack?: () => void;
}

export const RegisterPanel: React.FC<RegisterPanelProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const { createTenant } = useTenantStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [step, setStep] = useState(1); // 1: User info, 2: Business info, 3: Success

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      tenantSlug: '',
    },
  });

  const email = watch('email');
  const businessName = watch('businessName');

  // Auto-generate tenant slug from business name
  useEffect(() => {
    if (businessName) {
      const slug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
      setValue('tenantSlug', slug);
    }
  }, [businessName, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitError('');
    setIsLoading(true);
    
    try {
      // Create tenant first
      const tenant = await createTenant({
        name: data.businessName,
        slug: data.tenantSlug,
        timezone: 'UTC',
      });

      // Register user with tenant
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        tenantId: tenant.id,
        role: 'ADMIN',
      });

      setIsSuccess(true);
      setStep(3);
    } catch (error: any) {
      if (error.response?.status === 409) {
        setSubmitError('Email or business name already exists');
      } else if (error.response?.status === 400) {
        setSubmitError('Invalid information provided');
      } else {
        setSubmitError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
      const hasErrors = requiredFields.some(field => errors[field as keyof RegisterFormData]);
      if (!hasErrors) {
        setStep(2);
      }
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  if (step === 3 && isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your account has been created successfully. You can now sign in to access your dashboard.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            {onBack && (
              <button
                onClick={onBack}
                className="absolute left-4 top-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Get started with your free trial</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((stepNumber) => (
                <React.Fragment key={stepNumber}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      stepNumber === step
                        ? 'bg-blue-600 text-white'
                        : stepNumber < step
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNumber < step ? '✓' : stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div
                      className={`w-8 h-1 ${
                        stepNumber < step ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            </div>
          )}

          {/* Step 1: User Information */}
          {step === 1 && (
            <form onSubmit={handleSubmit(nextStep)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="John"
                      disabled={isLoading}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      {...register('firstName')}
                    />
                  </div>
                  {errors.firstName?.message && (
                    <p className="mt-1 text-xs text-red-600">{errors.firstName?.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    {...register('lastName')}
                  />
                  {errors.lastName?.message && (
                    <p className="mt-1 text-xs text-red-600">{errors.lastName?.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    disabled={isLoading}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    {...register('email')}
                  />
                </div>
                {errors.email?.message && (
                  <p className="mt-1 text-xs text-red-600">{errors.email?.message}</p>
                )}
              </div>

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
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword?.message && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirmPassword?.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              >
                Next Step
              </button>
            </form>
          )}

          {/* Step 2: Business Information */}
          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="HealthFirst Clinic"
                    disabled={isLoading}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    {...register('businessName')}
                  />
                </div>
                {errors.businessName?.message && (
                  <p className="mt-1 text-xs text-red-600">{errors.businessName?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant URL
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                    app.bookesease.com/
                  </span>
                  <input
                    type="text"
                    placeholder="healthfirst-clinic"
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    {...register('tenantSlug')}
                  />
                </div>
                {errors.tenantSlug?.message && (
                  <p className="mt-1 text-xs text-red-600">{errors.tenantSlug?.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  This will be your unique URL. Use only lowercase letters, numbers, and hyphens.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm mb-3"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
