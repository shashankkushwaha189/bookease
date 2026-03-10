import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { useToastStore } from '../../stores/toast.store';
import { appointmentsApi } from '../../api/appointments';
import { servicesApi } from '../../api/services';
import { staffApi } from '../../api/staff';
import { customersApi } from '../../api/customers';

// Types
interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price?: number;
  description?: string;
}

interface Staff {
  id: string;
  name: string;
  email?: string;
  role?: string;
  services?: Array<{
    id: string;
    name: string;
    durationMinutes: number;
  }>;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

// Form validation schema
const manualBookingSchema = z.object({
  serviceId: z.string().min(1, 'Please select a service'),
  staffId: z.string().min(1, 'Please select a staff member'),
  customerId: z.string().min(1, 'Please select a customer'),
  date: z.string().min(1, 'Please select a date'),
  time: z.string().min(1, 'Please select a time'),
  notes: z.string().optional(),
});

type ManualBookingForm = z.infer<typeof manualBookingSchema>;

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (appointment: any) => void;
}

const ManualBookingModal: React.FC<ManualBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { success, error } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset
  } = useForm<ManualBookingForm>({
    resolver: zodResolver(manualBookingSchema),
    mode: 'onChange'
  });

  const watchedServiceId = watch('serviceId');
  const watchedStaffId = watch('staffId');
  const watchedDate = watch('date');

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        console.log('🔍 Fetching services...');
        const response = await servicesApi.getServices({ isActive: true });
        console.log('🔍 Services response:', response);
        setServices(response.data.data || []);
      } catch (err) {
        console.error('🔍 Failed to fetch services:', err);
        error('Failed to fetch services');
      }
    };
    fetchServices();
  }, [error]);

  // Fetch staff when service is selected
  useEffect(() => {
    if (!watchedServiceId) return;

    const fetchStaff = async () => {
      try {
        console.log('🔍 Fetching staff for service:', watchedServiceId);
        const response = await staffApi.getStaff({ isActive: true, includeServices: true });
        console.log('🔍 Staff response:', response);
        setStaff(response.data.data || []);
      } catch (err) {
        console.error('🔍 Failed to fetch staff:', err);
        error('Failed to fetch staff');
      }
    };
    fetchStaff();
  }, [watchedServiceId, error]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        console.log('🔍 Fetching customers...');
        const response = await customersApi.getCustomers();
        console.log('🔍 Customers response:', response);
        if (response.data?.success && response.data?.data) {
          setCustomers(response.data.data.items);
        }
      } catch (err) {
        console.error('🔍 Failed to fetch customers:', err);
        error('Failed to fetch customers');
      }
    };
    fetchCustomers();
  }, [error]);

  // Update selected service
  useEffect(() => {
    if (watchedServiceId) {
      const service = services.find(s => s.id === watchedServiceId);
      setSelectedService(service || null);
    }
  }, [watchedServiceId, services]);

  // Fetch availability when date, service, and staff are selected
  useEffect(() => {
    if (!watchedDate || !watchedServiceId) return;

    const fetchAvailability = async () => {
      try {
        const params: any = {
          serviceId: watchedServiceId,
          date: watchedDate
        };
        
        if (watchedStaffId && watchedStaffId !== 'any') {
          params.staffId = watchedStaffId;
        }

        const response = await appointmentsApi.getAvailability(params);
        
        if (response.data?.data) {
          // Handle availability response structure
          const availabilityData = response.data.data as any;
          const slots = availabilityData.slots || availabilityData;
          
          if (Array.isArray(slots)) {
            const mappedSlots = slots.map((slot: any) => ({
              time: new Date(slot.startTimeUtc).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }),
              available: slot.isAvailable !== false
            }));
            setAvailableSlots(mappedSlots);
          } else {
            setAvailableSlots([]);
          }
        } else {
          setAvailableSlots([]);
        }
      } catch (err) {
        console.error('Failed to fetch availability:', err);
        setAvailableSlots([]);
      }
    };

    fetchAvailability();
  }, [watchedDate, watchedServiceId, watchedStaffId]);

  // Handle form submission
  const onSubmit = async (data: ManualBookingForm) => {
    if (!selectedService) {
      error('Please select a service');
      return;
    }

    setIsLoading(true);
    try {
      // Create start and end times
      const startTime = new Date(`${data.date} ${data.time}`);
      const endTime = new Date(startTime.getTime() + selectedService.durationMinutes * 60000);

      const bookingData = {
        serviceId: data.serviceId,
        staffId: data.staffId === 'any' ? staff[0]?.id || data.staffId : data.staffId,
        customerId: data.customerId,
        startTimeUtc: startTime.toISOString(),
        endTimeUtc: endTime.toISOString(),
        notes: data.notes
      };

      const response = await appointmentsApi.createManualBooking(bookingData);
      
      if (response.data?.success && response.data?.data) {
        success('Appointment booked successfully!');
        onSuccess?.(response.data.data);
        reset();
        onClose();
      } else {
        error('Failed to book appointment');
      }
    } catch (err: any) {
      console.error('Booking error:', err);
      if (err.response?.status === 409) {
        error('This time slot is no longer available');
      } else {
        error('Failed to book appointment. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter staff based on selected service
  const filteredStaff = watchedServiceId 
    ? staff.filter(s => s.services?.some(service => service.id === watchedServiceId))
    : staff;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Appointment Booking">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Service Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service *
          </label>
          <Select
            {...register('serviceId')}
            error={errors.serviceId?.message}
            placeholder="Select a service"
            options={[
              { value: '', label: 'Select a service' },
              ...services.map((service) => ({
                value: service.id,
                label: `${service.name} (${service.durationMinutes} min) ${service.price ? `- $${service.price}` : ''}`
              }))
            ]}
          />
        </div>

        {/* Staff Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Staff Member *
          </label>
          <Select
            {...register('staffId')}
            error={errors.staffId?.message}
            placeholder="Select staff"
            options={[
              { value: '', label: 'Select staff member' },
              ...filteredStaff.map((staffMember) => ({
                value: staffMember.id,
                label: `${staffMember.name} ${staffMember.role ? `(${staffMember.role})` : ''}`
              }))
            ]}
          />
        </div>

        {/* Customer Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Customer *
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewCustomerForm(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Customer
            </Button>
          </div>
          <Select
            {...register('customerId')}
            error={errors.customerId?.message}
            placeholder="Select customer"
            options={[
              { value: '', label: 'Select customer' },
              ...customers.map((customer) => ({
                value: customer.id,
                label: `${customer.name} (${customer.email})`
              }))
            ]}
          />
        </div>

        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date *
          </label>
          <Input
            type="date"
            {...register('date')}
            error={errors.date?.message}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Time Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.length > 0 ? (
              availableSlots.map((slot, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={!slot.available}
                  className={`p-2 rounded text-sm font-medium transition-colors ${
                    slot.available
                      ? 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-900'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => setValue('time', slot.time)}
                >
                  {slot.time}
                  {!slot.available && ' (Taken)'}
                </button>
              ))
            ) : (
              <div className="col-span-3 text-center text-gray-500 py-4">
                {watchedDate ? 'No available slots' : 'Select a date first'}
              </div>
            )}
          </div>
          <Input
            type="hidden"
            {...register('time')}
            error={errors.time?.message}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add any notes about the appointment..."
          />
        </div>

        {/* Selected Service Summary */}
        {selectedService && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Service Details</h4>
            <div className="text-sm text-blue-800">
              <p><strong>Duration:</strong> {selectedService.durationMinutes} minutes</p>
              {selectedService.price && <p><strong>Price:</strong> ${selectedService.price}</p>}
              {selectedService.description && <p><strong>Description:</strong> {selectedService.description}</p>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || isLoading}
            loading={isLoading}
          >
            Book Appointment
          </Button>
        </div>
      </form>

      {/* New Customer Modal */}
      {showNewCustomerForm && (
        <Modal
          isOpen={showNewCustomerForm}
          onClose={() => setShowNewCustomerForm(false)}
          title="Add New Customer"
        >
          <div className="text-center py-4">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Customer creation form would go here</p>
            <Button
              onClick={() => setShowNewCustomerForm(false)}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default ManualBookingModal;
