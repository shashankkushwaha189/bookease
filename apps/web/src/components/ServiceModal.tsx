import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Clock, Info } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { useToastStore } from '../stores/toast.store';

// Types
interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  price?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: Service | null;
  onSave: (serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

// Form validation schema
const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  duration: z.number().min(5, "Duration must be at least 5 minutes").max(480, "Duration must be less than 8 hours"),
  bufferBefore: z.number().min(0, "Buffer time cannot be negative"),
  bufferAfter: z.number().min(0, "Buffer time cannot be negative"),
  price: z.number().optional(),
  isActive: z.boolean(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

// Main Component
const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  service,
  onSave,
}) => {
  const { error } = useToastStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      category: 'General',
      duration: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      price: undefined,
      isActive: true,
    },
  });

  const watchedDuration = watch('duration');
  const watchedBufferBefore = watch('bufferBefore');
  const watchedBufferAfter = watch('bufferAfter');

  // Initialize form with service data when editing
  useEffect(() => {
    if (service) {
      reset({
        name: service.name,
        description: service.description || '',
        category: service.category,
        duration: service.duration,
        bufferBefore: service.bufferBefore,
        bufferAfter: service.bufferAfter,
        price: service.price,
        isActive: service.isActive,
      });
    } else {
      reset({
        name: '',
        description: '',
        category: 'General',
        duration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
        price: undefined,
        isActive: true,
      });
    }
  }, [service, reset]);

  // Handle form submission
  const onSubmit = async (data: ServiceFormData) => {
    try {
      await onSave(data);
      onClose();
    } catch (err) {
      error('Failed to save service');
    }
  };

  // Handle keyboard events
  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Add keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">
            {service ? 'Edit Service' : 'Add New Service'}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Service Name */}
          <div>
            <Input
              label="Service Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="e.g., Haircut, Beard Trim"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Category
            </label>
            <select
              {...register('category')}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="General">General</option>
              <option value="Haircut">Haircut</option>
              <option value="Massage">Massage</option>
              <option value="Consultation">Consultation</option>
              <option value="Treatment">Treatment</option>
              <option value="Styling">Styling</option>
              <option value="Grooming">Grooming</option>
              <option value="Wellness">Wellness</option>
            </select>
            {errors.category?.message && (
              <p className="text-sm text-danger mt-1">{errors.category.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Describe the service..."
            />
            {errors.description?.message && (
              <p className="text-sm text-danger mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <Input
              label="Duration"
              type="number"
              {...register('duration', { valueAsNumber: true })}
              error={errors.duration?.message}
              placeholder="30"
              min={5}
              max={480}
              required
            />
            <div className="flex items-center mt-2 text-sm text-neutral-600">
              <Clock className="w-4 h-4 mr-1" />
              This service takes <span className="font-medium">{watchedDuration || 30}</span> minutes
            </div>
          </div>

          {/* Buffer Before */}
          <div>
            <Input
              label="Buffer Before"
              type="number"
              {...register('bufferBefore', { valueAsNumber: true })}
              error={errors.bufferBefore?.message}
              placeholder="0"
              min={0}
            />
            <div className="text-sm text-neutral-600 mt-1">
              <span className="font-medium">{watchedBufferBefore || 0}</span> minutes before appointment
            </div>
          </div>

          {/* Buffer After */}
          <div>
            <Input
              label="Buffer After"
              type="number"
              {...register('bufferAfter', { valueAsNumber: true })}
              error={errors.bufferAfter?.message}
              placeholder="0"
              min={0}
            />
            <div className="text-sm text-neutral-600 mt-1">
              <span className="font-medium">{watchedBufferAfter || 0}</span> minutes after appointment
            </div>
          </div>

          {/* Buffer Time Explanation */}
          {(watchedBufferBefore > 0 || watchedBufferAfter > 0) && (
            <div className="bg-primary-soft border border-primary rounded-lg p-4">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-primary">
                  <p className="font-medium mb-1">How buffer time works:</p>
                  <p>
                    Buffer time is used to prepare between appointments. A {watchedBufferAfter || 0}-min buffer
                    after a {watchedDuration || 30}-min service means the next slot opens at the{' '}
                    {(watchedDuration || 30) + (watchedBufferAfter || 0)}-min mark.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Price */}
          <div>
            <Input
              label="Price (optional)"
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              error={errors.price?.message}
              placeholder="45.00"
              min={0}
            />
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('isActive')}
                className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-neutral-900">Active</span>
                <p className="text-xs text-neutral-600">
                  Inactive services won't be available for booking
                </p>
              </div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-neutral-200">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isDirty}
            >
              {service ? 'Update Service' : 'Create Service'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceModal;
