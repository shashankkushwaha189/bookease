import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToastStore } from '../stores/toast.store';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/auth.store';
import Button from '../components/ui/Button';

// Form validation schema
const twoFactorSchema = z.object({
  code: z.string().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits").regex(/^\d+$/, "Code must contain only numbers"),
});

type TwoFactorFormData = z.infer<typeof twoFactorSchema>;

interface TwoFactorAuthProps {
  onVerify: (code: string) => Promise<void>;
  onResend?: () => Promise<void>;
  onUseBackup?: () => void;
  isLoading?: boolean;
  email?: string;
  method?: 'totp' | 'email' | 'sms';
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
  onVerify,
  onResend,
  onUseBackup,
  isLoading = false,
  email = '',
  method = 'totp',
}) => {
  const toastStore = useToastStore();
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: '',
    },
  });

  const code = watch('code');

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Auto-focus on code input
  useEffect(() => {
    const firstInput = document.querySelector('input[name="code"]') as HTMLInputElement;
    if (firstInput) {
      firstInput.focus();
    }
  }, []);

  const onSubmit = async (data: TwoFactorFormData) => {
    try {
      await onVerify(data.code);
    } catch (error: any) {
      console.error('2FA verification error:', error);
      const errorMessage = error.response?.data?.message || 'Invalid code. Please try again.';
      toastStore.error(errorMessage);
      setValue('code', '');
    }
  };

  const handleResend = async () => {
    if (!canResend || resendLoading) return;

    setResendLoading(true);
    try {
      await onResend?.();
      toastStore.success('New code sent successfully!');
      setTimeLeft(300); // Reset timer
      setCanResend(false);
      setValue('code', '');
    } catch (error: any) {
      console.error('Resend code error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to resend code. Please try again.';
      toastStore.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    // Update the full code
    const currentCode = code || '';
    const newCode = currentCode.substring(0, index) + value + currentCode.substring(index + 1);
    setValue('code', newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.querySelector(`input[name="code-${index + 1}"]`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.querySelector(`input[name="code-${index - 1}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMethodIcon = () => {
    switch (method) {
      case 'totp':
        return <Smartphone className="w-6 h-6" />;
      case 'email':
        return <Mail className="w-6 h-6" />;
      case 'sms':
        return <Smartphone className="w-6 h-6" />;
      default:
        return <Shield className="w-6 h-6" />;
    }
  };

  const getMethodTitle = () => {
    switch (method) {
      case 'totp':
        return 'Authenticator App';
      case 'email':
        return 'Email Verification';
      case 'sms':
        return 'SMS Verification';
      default:
        return 'Two-Factor Authentication';
    }
  };

  const getMethodDescription = () => {
    switch (method) {
      case 'totp':
        return 'Enter the 6-digit code from your authenticator app';
      case 'email':
        return `Enter the 6-digit code sent to ${email}`;
      case 'sms':
        return 'Enter the 6-digit code sent to your phone';
      default:
        return 'Enter your verification code';
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {getMethodIcon()}
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">
          {getMethodTitle()}
        </h3>
        <p className="text-neutral-600 text-sm">
          {getMethodDescription()}
        </p>
      </div>

      {/* Code Input */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <div className="flex justify-center space-x-2 mb-4">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                name={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={code[index] || ''}
                onChange={(e) => handleInputChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={isLoading}
                className="w-12 h-12 text-center text-lg font-semibold border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                autoComplete="one-time-code"
              />
            ))}
          </div>
          <input
            type="hidden"
            {...register('code')}
          />
          {errors.code?.message && (
            <p className="text-center text-xs text-error-600 mt-2">{errors.code.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || code.length !== 6}
          loading={isLoading}
          fullWidth
        >
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </Button>
      </form>

      {/* Resend & Options */}
      <div className="mt-6 space-y-4">
        {/* Timer */}
        {!canResend && (
          <div className="text-center">
            <p className="text-sm text-neutral-500">
              Code expires in <span className="font-medium">{formatTime(timeLeft)}</span>
            </p>
          </div>
        )}

        {/* Resend Button */}
        {onResend && (
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || resendLoading}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resendLoading ? 'Sending...' : canResend ? 'Resend Code' : `Resend in ${formatTime(timeLeft)}`}
            </button>
          </div>
        )}

        {/* Backup Code Option */}
        {onUseBackup && (
          <div className="text-center">
            <button
              type="button"
              onClick={onUseBackup}
              disabled={isLoading}
              className="text-sm text-neutral-500 hover:text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Use backup code
            </button>
          </div>
        )}

        {/* Help */}
        <div className="text-center">
          <p className="text-xs text-neutral-400">
            Having trouble?{' '}
            <a href="/support/2fa" className="text-brand-600 hover:text-brand-700 font-medium">
              Get help
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
