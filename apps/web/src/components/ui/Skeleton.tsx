import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
  width?: string;
  variant?: 'text' | 'card' | 'table' | 'calendar';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  lines = 1,
  height,
  width,
  variant = 'text'
}) => {
  const baseClasses = 'animate-pulse bg-neutral-200 rounded';
  
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'text':
        return 'h-4 w-full';
      case 'card':
        return 'h-32 w-full rounded-lg';
      case 'table':
        return 'h-12 w-full';
      case 'calendar':
        return 'h-20 w-full rounded';
      default:
        return 'h-4 w-full';
    }
  };

  const renderTextSkeleton = () => {
    if (lines === 1) {
      return (
        <div
          className={`${baseClasses} ${getVariantClasses()} ${className}`}
          style={{ height, width }}
        />
      );
    }

    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`${baseClasses} h-4`}
            style={{
              width: index === lines - 1 ? '75%' : '100%',
              height
            }}
          />
        ))}
      </div>
    );
  };

  const renderVariantSkeleton = () => {
    return (
      <div
        className={`${baseClasses} ${getVariantClasses()} ${className}`}
        style={{ height, width }}
      />
    );
  };

  return variant === 'text' ? renderTextSkeleton() : renderVariantSkeleton();
};

export default Skeleton;
