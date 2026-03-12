import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { useTenantStore } from '../stores/tenant.store';
import { authApi } from '../api/auth';
import Button from '../components/ui/Button';
import TenantSelector from '../components/TenantSelector';

// Form validation schema
const registrationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toastStore = useToastStore();
  const { setTenantSlug } = useTenantStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  // Handle tenant from URL params and set default
  React.useEffect(() => {
    const urlTenant = searchParams.get('tenant');
    if (urlTenant) {
      setSelectedTenant(urlTenant);
      setTenantSlug(urlTenant);
    } else if (!selectedTenant) {
      const defaultTenant = 'demo-clinic';
      setSelectedTenant(defaultTenant);
      setTenantSlug(defaultTenant);
    }
  }, [searchParams, setTenantSlug]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const onSubmit = async (data: RegistrationFormData) => {
    console.log('🔍 Registration form submitted:', data);
    console.log('🏢 Selected tenant:', selectedTenant);
    
    setIsLoading(true);
    setRegisteredEmail(data.email);

    try {
      const { confirmPassword, acceptTerms, ...registrationData } = data;
      
      // Add tenant slug to registration data
      const registrationWithTenant = {
        ...registrationData,
        tenantSlug: selectedTenant || 'demo-clinic'
      };
      
      console.log('📤 Sending registration data:', registrationWithTenant);
      
      const response = await authApi.register(registrationWithTenant) as any;
      
      console.log('✅ Registration response:', response.data);
      
      if (response.data?.success) {
        setIsRegistered(true);
        toastStore.success('Account created successfully! You can now login.');
      } else {
        toastStore.error(response.data?.message || 'Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again later.';
      toastStore.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const password = watch('password');
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={handleBackToLogin}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </button>
        </div>

        {/* Registration Card */}
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="mb-6">
            <h2 className="text-center text-3xl font-extrabold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Join BookEase and start managing your appointments
            </p>
          </div>

          {!isRegistered ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Tenant Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tenant
                </label>
                <select
                  value={selectedTenant}
                  onChange={(e) => {
                    const tenant = e.target.value;
                    setSelectedTenant(tenant);
                    setTenantSlug(tenant);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isLoading}
                >
                  <option value="">Choose a tenant...</option>
                  <option value="demo-clinic">Demo Clinic</option>
                  <option value="wellness-spa-v2">Wellness Spa Center</option>
                  <option value="test-spa">Test Spa</option>
                </select>
                {selectedTenant && (
                  <p className="mt-2 text-xs text-gray-600">
                    Registering for: <span className="font-semibold text-blue-600">{selectedTenant}</span>
                  </p>
                )}
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                    disabled={isLoading}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    {...register('firstName')}
                  />
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
                    autoComplete="family-name"
                    placeholder="Last name"
                    disabled={isLoading}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    {...register('lastName')}
                  />
                  {errors.lastName?.message && (
                    <p className="mt-1 text-xs text-red-600">{errors.lastName?.message}</p>
                  )}
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  disabled={isLoading}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  {...register('email')}
                />
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
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    disabled={isLoading}
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Password strength:</span>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${
                          passwordStrength.strength <= 2 ? 'bg-red-500' :
                          passwordStrength.strength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    disabled={isLoading}
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
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

              {/* Terms and Conditions */}
              <div>
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    {...register('acceptTerms')}
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    I agree to the{' '}
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                      Terms and Conditions
                    </a>
                  </span>
                </label>
                {errors.acceptTerms?.message && (
                  <p className="mt-1 text-xs text-red-600">{errors.acceptTerms?.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Account Created Successfully!
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Your account has been created successfully!
                <br />
                <span className="font-medium text-gray-800">{registeredEmail}</span>
              </p>
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  You can now login with your credentials.
                </p>
                <button
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Login
                </button>
              </div>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={handleBackToLogin}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
