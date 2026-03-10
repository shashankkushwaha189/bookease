import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Button from '../ui/Button';
import ManualBookingModal from './ManualBookingModal';
import { useToastStore } from '../../stores/toast.store';

interface BookingButtonProps {
  onBookingCreated?: (appointment: any) => void;
  variant?: 'primary' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BookingButton: React.FC<BookingButtonProps> = ({
  onBookingCreated,
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { success } = useToastStore();

  const handleBookingSuccess = (appointment: any) => {
    success('Appointment booked successfully!');
    onBookingCreated?.(appointment);
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        <Plus className="w-4 h-4 mr-2" />
        Book Appointment
      </Button>

      <ManualBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleBookingSuccess}
      />
    </>
  );
};

export default BookingButton;
