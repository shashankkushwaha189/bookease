import React, { useId, forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  required = false,
  className = '',
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 text-sm';
  const stateClasses = error
    ? 'border-danger-300 text-danger-900 placeholder-danger-300 focus:ring-danger-500 focus:border-danger-500'
    : 'border-neutral-300 text-neutral-900 placeholder-neutral-500 focus:ring-primary-500 focus:border-primary-500';
  const iconClasses = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';
  const bothIconsClasses = leftIcon && rightIcon ? 'pl-10 pr-10' : '';

  const classes = [
    baseClasses,
    stateClasses,
    iconClasses,
    bothIconsClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="w-4 h-4 text-neutral-400">{leftIcon}</span>
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={classes}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="w-4 h-4 text-neutral-400">{rightIcon}</span>
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-danger-600">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-neutral-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
