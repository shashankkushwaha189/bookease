import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { authApi } from '../api/auth';
import Button from '../components/ui/Button';

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
  const toastStore = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    setRegisteredEmail(data.email);

    try {
      const { confirmPassword, acceptTerms, ...registrationData } = data;
      const response = await authApi.register(registrationData) as any;
      
      if (response.data?.success) {
        setIsRegistered(true);
        toastStore.success('Registration successful! Please check your email for verification.');
      } else {
        toastStore.error(response.data?.message || 'Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
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

            {/* Mobile Registration Card */}
            <div className="bg-surface rounded-xl p-6 shadow-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Create Account</h2>
                <p className="text-neutral-600 text-sm">
                  Join BookEase and start managing your appointments efficiently.
                </p>
              </div>

              {!isRegistered ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        First Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="w-4 h-4 text-neutral-400" />
                        </div>
                        <input
                          type="text"
                          autoComplete="given-name"
                          placeholder="First name"
                          disabled={isLoading}
                          className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                          {...register('firstName')}
                        />
                      </div>
                      {errors.firstName?.message && (
                        <p className="mt-1 text-xs text-error-600">{errors.firstName?.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        autoComplete="family-name"
                        placeholder="Last name"
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                        {...register('lastName')}
                      />
                      {errors.lastName?.message && (
                        <p className="mt-1 text-xs text-error-600">{errors.lastName?.message}</p>
                      )}
                    </div>
                  </div>

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

                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-neutral-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Create a password"
                        disabled={isLoading}
                        className="w-full pl-10 pr-10 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                        {...register('password')}
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
                    {errors.password?.message && (
                      <p className="mt-1 text-xs text-error-600">{errors.password?.message}</p>
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
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-neutral-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Confirm your password"
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

                  {/* Terms and Conditions */}
                  <div>
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        disabled={isLoading}
                        className="mt-1 w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-500 disabled:opacity-50"
                        {...register('acceptTerms')}
                      />
                      <span className="ml-2 text-xs text-neutral-600">
                        I agree to the{' '}
                        <a href="/terms" className="text-brand-600 hover:text-brand-700 font-medium">
                          Terms and Conditions
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-brand-600 hover:text-brand-700 font-medium">
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    {errors.acceptTerms?.message && (
                      <p className="mt-1 text-xs text-error-600">{errors.acceptTerms?.message}</p>
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
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              ) : (
                /* Success State */
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    Registration Successful!
                  </h3>
                  <p className="text-neutral-600 text-sm mb-6">
                    We've sent a verification email to:
                    <br />
                    <span className="font-medium text-neutral-800">{registeredEmail}</span>
                  </p>
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-500">
                      Please check your email and click the verification link to activate your account.
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleBackToLogin}
                      fullWidth
                    >
                      Go to Login
                    </Button>
                  </div>
                </div>
              )}

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <span className="text-sm text-neutral-600">
                  Already have an account?{' '}
                  <button
                    onClick={handleBackToLogin}
                    className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  >
                    Sign in
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Similar structure with responsive adjustments */}
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
                <p className="text-lg lg:text-xl text-brand-100">Create Your Account</p>
              </div>
              
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Easy Setup</h3>
                    <p className="text-brand-100 text-sm">Create your account in minutes and start booking</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Secure & Private</h3>
                    <p className="text-brand-100 text-sm">Your data is protected with enterprise-grade security</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Smart Features</h3>
                    <p className="text-brand-100 text-sm">AI-powered scheduling and automated reminders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Registration Form */}
          <div className="w-full lg:w-1/2 h-full bg-surface flex flex-col justify-center px-6 lg:px-12">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6 lg:mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">Create Account</h2>
                <p className="text-neutral-600 text-sm lg:text-base">
                  Join BookEase and start managing your appointments efficiently.
                </p>
              </div>

              {!isRegistered ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Same form fields as mobile but with better spacing */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        First Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="w-4 h-4 text-neutral-400" />
                        </div>
                        <input
                          type="text"
                          autoComplete="given-name"
                          placeholder="First name"
                          disabled={isLoading}
                          className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                          {...register('firstName')}
                        />
                      </div>
                      {errors.firstName?.message && (
                        <p className="mt-1 text-xs text-error-600">{errors.firstName?.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        autoComplete="family-name"
                        placeholder="Last name"
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                        {...register('lastName')}
                      />
                      {errors.lastName?.message && (
                        <p className="mt-1 text-xs text-error-600">{errors.lastName?.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Email, Password, Confirm Password, Terms - same as mobile */}
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

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-neutral-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Create a password"
                        disabled={isLoading}
                        className="w-full pl-10 pr-10 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm placeholder-neutral-400 disabled:opacity-50 transition-colors"
                        {...register('password')}
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
                    {errors.password?.message && (
                      <p className="mt-1 text-xs text-error-600">{errors.password?.message}</p>
                    )}
                    
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

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-neutral-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Confirm your password"
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

                  <div>
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        disabled={isLoading}
                        className="mt-1 w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-500 disabled:opacity-50"
                        {...register('acceptTerms')}
                      />
                      <span className="ml-2 text-sm text-neutral-600">
                        I agree to the{' '}
                        <a href="/terms" className="text-brand-600 hover:text-brand-700 font-medium">
                          Terms and Conditions
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-brand-600 hover:text-brand-700 font-medium">
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    {errors.acceptTerms?.message && (
                      <p className="mt-1 text-xs text-error-600">{errors.acceptTerms?.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    loading={isLoading}
                    fullWidth
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              ) : (
                /* Success State - same as mobile */
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    Registration Successful!
                  </h3>
                  <p className="text-neutral-600 text-sm mb-6">
                    We've sent a verification email to:
                    <br />
                    <span className="font-medium text-neutral-800">{registeredEmail}</span>
                  </p>
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-500">
                      Please check your email and click the verification link to activate your account.
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleBackToLogin}
                      fullWidth
                    >
                      Go to Login
                    </Button>
                  </div>
                </div>
              )}

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <span className="text-sm text-neutral-600">
                  Already have an account?{' '}
                  <button
                    onClick={handleBackToLogin}
                    className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  >
                    Sign in
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
