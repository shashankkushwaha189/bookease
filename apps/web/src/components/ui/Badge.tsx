import React from 'react';

export type AppointmentStatus = 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

interface BadgeProps {
  status?: AppointmentStatus;
  variant?: string;
  children?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ status, variant, children }) => {
  const getStatusClasses = (status: AppointmentStatus): string => {
    switch (status) {
      case 'booked':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'no_show':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVariantClasses = (variant: string): string => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-soft text-primary border-primary';
      case 'success':
        return 'bg-success-soft text-success border-success';
      case 'warning':
        return 'bg-warning-soft text-warning border-warning';
      case 'danger':
        return 'bg-danger-soft text-danger border-danger';
      case 'neutral':
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const classes = status
    ? getStatusClasses(status)
    : variant
    ? getVariantClasses(variant)
    : 'bg-neutral-100 text-neutral-800 border-neutral-200';

  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';

  return (
    <span className={`${baseClasses} ${classes}`}>
      {children || (status && status.replace('_', ' ').toUpperCase())}
    </span>
  );
};

export default Badge;
