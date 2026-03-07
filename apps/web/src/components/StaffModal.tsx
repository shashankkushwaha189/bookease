import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Camera, User, Mail, FileText, Users } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { useToastStore } from '../stores/toast.store';

// Types
interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  photoUrl?: string;
  assignedServices: string[];
  hasAccount: boolean;
  accountEmail?: string;
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: string;
  name: string;
}

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: Staff | null;
  services: Service[];
  onSave: (staffData: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

// Form validation schema
const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  assignedServices: z.array(z.string()).min(1, "At least one service must be assigned"),
  hasAccount: z.boolean(),
  accountEmail: z.string().email("Valid account email is required").optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

// Main Component
const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  staff,
  services,
  onSave,
}) => {
  const { error } = useToastStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      bio: '',
      photoUrl: '',
      assignedServices: [],
      hasAccount: false,
      accountEmail: '',
    },
  });

  const watchedHasAccount = watch('hasAccount');
  const watchedAssignedServices = watch('assignedServices');

  // Initialize form with staff data when editing
  useEffect(() => {
    if (staff) {
      reset({
        name: staff.name,
        email: staff.email,
        phone: staff.phone || '',
        bio: staff.bio || '',
        photoUrl: staff.photoUrl || '',
        assignedServices: staff.assignedServices,
        hasAccount: staff.hasAccount,
        accountEmail: staff.accountEmail || '',
      });
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        bio: '',
        photoUrl: '',
        assignedServices: [],
        hasAccount: false,
        accountEmail: '',
      });
    }
  }, [staff, reset]);

  // Handle photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!validTypes.includes(file.type)) {
        error('Please upload a PNG, JPEG, or WebP image');
        return;
      }

      if (file.size > maxSize) {
        error('Image must be smaller than 2MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setValue('photoUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle service assignment
  const handleServiceToggle = (serviceId: string) => {
    const currentServices = watchedAssignedServices || [];
    const newServices = currentServices.includes(serviceId)
      ? currentServices.filter(id => id !== serviceId)
      : [...currentServices, serviceId];
    
    setValue('assignedServices', newServices);
  };

  // Handle form submission
  const onSubmit = async (data: StaffFormData) => {
    console.log('📝 StaffModal form submitted with data:', data);
    try {
      await onSave(data);
      console.log('✅ StaffModal onSave completed successfully');
      onClose();
    } catch (err) {
      console.error('❌ StaffModal onSubmit error:', err);
      error('Failed to save staff member');
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
      <div className="bg-surface rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">
            {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Photo
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                {watch('photoUrl') ? (
                  <img 
                    src={watch('photoUrl')} 
                    alt="Staff photo" 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-primary-soft" />
                )}
              </div>
              
              <div>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer inline-flex items-center px-3 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Photo
                </label>
                <p className="text-xs text-neutral-500 mt-1">PNG, JPEG, WebP (max 2MB)</p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <Input
              label="Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Enter staff member's name"
              required
            />
          </div>

          {/* Email */}
          <div>
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="staff@business.com"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <Input
              label="Phone"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Bio
            </label>
            <textarea
              {...register('bio')}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Brief description of the staff member's experience and specialties..."
            />
            {errors.bio?.message && (
              <p className="text-sm text-danger mt-1">{errors.bio.message}</p>
            )}
          </div>

          {/* Assigned Services */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Assigned Services
            </label>
            <div className="space-y-2">
              {services.map((service) => (
                <label key={service.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={watchedAssignedServices?.includes(service.id) || false}
                    onChange={() => handleServiceToggle(service.id)}
                    className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-neutral-900">{service.name}</span>
                </label>
              ))}
            </div>
            {errors.assignedServices?.message && (
              <p className="text-sm text-danger mt-1">{errors.assignedServices.message}</p>
            )}
          </div>

          {/* Account Access */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('hasAccount')}
                className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-neutral-900">Link to user account</span>
                <p className="text-xs text-neutral-600">
                  Allow this staff member to log in and manage their own appointments
                </p>
              </div>
            </label>
          </div>

          {/* Account Email */}
          {watchedHasAccount && (
            <div>
              <Input
                label="Account Login Email"
                type="email"
                {...register('accountEmail')}
                error={errors.accountEmail?.message}
                placeholder="staff@personal.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-neutral-200">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={Object.keys(errors).length > 0}
            >
              {staff ? 'Update Staff Member' : 'Add Staff Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffModal;
