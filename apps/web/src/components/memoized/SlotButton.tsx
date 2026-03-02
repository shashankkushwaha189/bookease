import React from 'react';
import { Clock } from 'lucide-react';

interface SlotButtonProps {
  time: string;
  available: boolean;
  selected: boolean;
  onSelect: (time: string) => void;
  disabled?: boolean;
}

const SlotButton: React.FC<SlotButtonProps> = React.memo(({ 
  time, 
  available, 
  selected, 
  onSelect,
  disabled = false
}) => {
  const baseClasses = "flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium";
  
  const getClasses = () => {
    if (disabled) {
      return `${baseClasses} border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed`;
    }
    
    if (!available) {
      return `${baseClasses} border-neutral-200 bg-neutral-50 text-neutral-400 cursor-not-allowed`;
    }
    
    if (selected) {
      return `${baseClasses} border-primary bg-primary text-white cursor-pointer hover:bg-primary-600`;
    }
    
    return `${baseClasses} border-neutral-300 bg-white text-neutral-900 cursor-pointer hover:border-primary hover:bg-primary-soft`;
  };

  const handleClick = () => {
    if (available && !disabled) {
      onSelect(time);
    }
  };

  return (
    <button
      className={getClasses()}
      onClick={handleClick}
      disabled={disabled || !available}
      aria-label={`Select ${time} slot${available ? '' : ' - not available'}`}
      aria-disabled={!available || disabled}
    >
      <Clock className="w-4 h-4 mr-2" />
      {time}
    </button>
  );
});

SlotButton.displayName = 'SlotButton';

export default SlotButton;
