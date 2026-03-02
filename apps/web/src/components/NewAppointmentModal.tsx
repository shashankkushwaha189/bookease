import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Search, Calendar, Clock, Users, Repeat, Plus, AlertCircle, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Select';
import { useToastStore } from '../stores/toast.store';

// Types
interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price?: number;
}

interface Staff {
  id: string;
  name: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Form validation schema
const appointmentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().email("Valid email required"),
  customerPhone: z.string().optional(),
  serviceId: z.string().min(1, "Service is required"),
  staffId: z.string().min(1, "Staff is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  recurringOccurrences: z.number().min(1).max(52).optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

// Helper functions for recurring appointments
const calculateRecurringDates = (
  startDate: string,
  frequency: 'weekly' | 'biweekly' | 'monthly',
  occurrences: number
): Date[] => {
  const dates: Date[] = [];
  const start = new Date(startDate);
  
  for (let i = 0; i < occurrences; i++) {
    const date = new Date(start);
    
    switch (frequency) {
      case 'weekly':
        date.setDate(start.getDate() + (i * 7));
        break;
      case 'biweekly':
        date.setDate(start.getDate() + (i * 14));
        break;
      case 'monthly':
        date.setMonth(start.getMonth() + i);
        break;
    }
    
    dates.push(date);
  }
  
  return dates;
};

const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
};

// API Hooks (mock implementations - replace with actual API calls)
const useCustomers = (searchQuery: string) => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setCustomers([]);
      return;
    }

    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockCustomers: Customer[] = [
          { id: '1', name: 'John Smith', email: 'john.smith@email.com', phone: '+1 (555) 123-4567' },
          { id: '2', name: 'Emma Davis', email: 'emma.davis@email.com', phone: '+1 (555) 987-6543' },
          { id: '3', name: 'Robert Brown', email: 'robert.brown@email.com', phone: '+1 (555) 456-7890' },
          { id: '4', name: 'Lisa Anderson', email: 'lisa.anderson@email.com', phone: '+1 (555) 234-5678' },
          { id: '5', name: 'James Taylor', email: 'james.taylor@email.com', phone: '+1 (555) 345-6789' },
        ].filter(customer => 
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        setCustomers(mockCustomers);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [searchQuery]);

  return { customers, isLoading };
};

const useServices = () => {
  const [services, setServices] = React.useState<Service[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const mockServices: Service[] = [
          { id: '1', name: 'Haircut', duration: 30, price: 45 },
          { id: '2', name: 'Beard Trim', duration: 15, price: 25 },
          { id: '3', name: 'Haircut & Beard', duration: 45, price: 65 },
          { id: '4', name: 'Color & Style', duration: 120, price: 120 },
          { id: '5', name: 'Full Service', duration: 90, price: 95 },
        ];
        
        setServices(mockServices);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  return { services, isLoading };
};

const useStaff = (serviceId?: string) => {
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (!serviceId) {
      setStaff([]);
      return;
    }

    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockStaff: Staff[] = [
          { id: '1', name: 'Sarah Johnson' },
          { id: '2', name: 'Mike Wilson' },
          { id: '3', name: 'Emma Davis' },
        ];
        
        setStaff(mockStaff);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [serviceId]);

  return { staff, isLoading };
};

const useAvailability = (serviceId?: string, staffId?: string, date?: string) => {
  const [slots, setSlots] = React.useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (!serviceId || !staffId || !date) {
      setSlots([]);
      return;
    }

    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockSlots: TimeSlot[] = [
          { time: '9:00 AM', available: true },
          { time: '9:30 AM', available: false },
          { time: '10:00 AM', available: true },
          { time: '10:30 AM', available: true },
          { time: '11:00 AM', available: false },
          { time: '11:30 AM', available: true },
          { time: '2:00 PM', available: true },
          { time: '2:30 PM', available: true },
          { time: '3:00 PM', available: false },
          { time: '3:30 PM', available: true },
          { time: '4:00 PM', available: true },
          { time: '4:30 PM', available: false },
        ];
        
        setSlots(mockSlots);
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [serviceId, staffId, date]);

  return { slots, isLoading };
};

// Components
const CustomerSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSelect: (customer: Customer) => void;
  onNewCustomer: (name: string, email: string) => void;
}> = ({ value, onChange, onSelect, onNewCustomer }) => {
  const { customers, isLoading } = useCustomers(value);
  const [isOpen, setIsOpen] = React.useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = React.useState(false);
  const [newCustomerName, setNewCustomerName] = React.useState('');
  const [newCustomerEmail, setNewCustomerEmail] = React.useState('');

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer);
    setIsOpen(false);
    onChange(customer.name);
  };

  const handleCreateNewCustomer = () => {
    if (newCustomerName.trim() && newCustomerEmail.trim()) {
      onNewCustomer(newCustomerName.trim(), newCustomerEmail.trim());
      setShowNewCustomerForm(false);
      setNewCustomerName('');
      setNewCustomerEmail('');
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          label="Customer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search existing customer or enter new..."
          leftIcon={<Search className="w-4 h-4" />}
        />
        {isLoading && (
          <div className="absolute right-3 top-9">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Customer Dropdown */}
      {isOpen && value.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-neutral-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {customers.length > 0 ? (
            customers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="w-full px-4 py-3 text-left hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0"
              >
                <div className="font-medium text-neutral-900">{customer.name}</div>
                <div className="text-sm text-neutral-600">{customer.email}</div>
                {customer.phone && (
                  <div className="text-xs text-neutral-500">{customer.phone}</div>
                )}
              </button>
            ))
          ) : (
            <div className="p-4">
              <p className="text-sm text-neutral-600 mb-3">No customers found</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNewCustomerForm(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create New Customer
              </Button>
            </div>
          )}
        </div>
      )}

      {/* New Customer Form */}
      {showNewCustomerForm && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-neutral-200 rounded-lg shadow-lg z-10 p-4">
          <h4 className="font-medium text-neutral-900 mb-3">Create New Customer</h4>
          <div className="space-y-3">
            <Input
              label="Name"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Customer name"
              size="sm"
            />
            <Input
              label="Email"
              type="email"
              value={newCustomerEmail}
              onChange={(e) => setNewCustomerEmail(e.target.value)}
              placeholder="Email address"
              size="sm"
            />
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNewCustomerForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateNewCustomer}
                disabled={!newCustomerName.trim() || !newCustomerEmail.trim()}
                className="flex-1"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TimeSlotPicker: React.FC<{
  slots: TimeSlot[];
  selectedTime: string;
  onSelect: (time: string) => void;
  isLoading: boolean;
  hasError?: boolean;
}> = ({ slots, selectedTime, onSelect, isLoading, hasError }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} className="h-10 bg-neutral-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-4 text-neutral-600">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
        <p className="text-sm">No time slots available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot, index) => (
          <button
            key={index}
            onClick={() => slot.available && onSelect(slot.time)}
            disabled={!slot.available}
            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              selectedTime === slot.time
                ? 'bg-primary text-primary-soft'
                : slot.available
                ? 'bg-surface border border-neutral-200 hover:bg-neutral-50 text-neutral-900'
                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            } ${hasError && 'border-danger'}`}
          >
            {slot.time}
            {!slot.available && (
              <div className="text-xs mt-1">Unavailable</div>
            )}
          </button>
        ))}
      </div>
      {hasError && (
        <p className="text-sm text-danger mt-2 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          Slot no longer available
        </p>
      )}
    </div>
  );
};

// Main Component
const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToastStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [timeSlotError, setTimeSlotError] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset,
    setError,
    clearError,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    mode: 'onChange',
  });

  // Watch form values
  const watchedValues = watch();
  const isRecurring = watchedValues.isRecurring;

  // API hooks
  const { services } = useServices();
  const { staff } = useStaff(watchedValues.serviceId);
  const { slots, isLoading: slotsLoading } = useAvailability(
    watchedValues.serviceId,
    watchedValues.staffId,
    watchedValues.date
  );

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setValue('customerId', customer.id);
    setValue('customerName', customer.name);
    setValue('customerEmail', customer.email);
    setValue('customerPhone', customer.phone || '');
  };

  // Handle new customer creation
  const handleNewCustomer = (name: string, email: string) => {
    const newCustomer: Customer = {
      id: `new-${Date.now()}`,
      name,
      email,
    };
    handleCustomerSelect(newCustomer);
  };

  // Handle service change
  const handleServiceChange = (serviceId: string) => {
    setValue('serviceId', serviceId);
    setValue('staffId', ''); // Reset staff when service changes
    setValue('time', ''); // Reset time when service changes
  };

  // Handle time slot selection
  const handleTimeSlotSelect = (time: string) => {
    setValue('time', time);
    setTimeSlotError(false);
    clearError('time');
  };

  // Handle form submission
  const onSubmit = async (data: AppointmentFormData) => {
    setIsSubmitting(true);
    setTimeSlotError(false);

    try {
      if (data.isRecurring && data.recurringFrequency && data.recurringOccurrences) {
        // Handle recurring appointment creation
        const dates = calculateRecurringDates(
          data.date,
          data.recurringFrequency,
          data.recurringOccurrences
        );
        
        // Mock API call for recurring appointments
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        success(`${data.recurringOccurrences} recurring appointments created`);
        
        // Show success with appointment list
        const appointmentList = dates.map(date => formatDate(date)).join('\n');
        console.log('Created appointments:\n', appointmentList);
      } else {
        // Handle single appointment creation
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Simulate slot conflict (10% chance for demo)
        if (Math.random() < 0.1) {
          setTimeSlotError(true);
          setError('time', { message: 'Slot no longer available' });
          return;
        }

        success('Appointment created successfully');
      }
      
      reset();
      setSelectedCustomer(null);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setTimeSlotError(true);
        setError('time', { message: 'Slot no longer available' });
      } else {
        error('Failed to create appointment');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedCustomer(null);
      setTimeSlotError(false);
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">New Appointment</h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Customer Search */}
          <CustomerSearch
            value={watchedValues.customerName || ''}
            onChange={(value) => setValue('customerName', value)}
            onSelect={handleCustomerSelect}
            onNewCustomer={handleNewCustomer}
          />

          {/* Hidden customer fields */}
          <input type="hidden" {...register('customerId')} />
          <input type="hidden" {...register('customerEmail')} />
          <input type="hidden" {...register('customerPhone')} />

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Service
            </label>
            <select
              {...register('serviceId', { onChange: (e) => handleServiceChange(e.target.value) })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.duration} min) {service.price && `- $${service.price}`}
                </option>
              ))}
            </select>
            {errors.serviceId && (
              <p className="text-sm text-danger mt-1">{errors.serviceId.message}</p>
            )}
          </div>

          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Staff
            </label>
            <select
              {...register('staffId')}
              disabled={!watchedValues.serviceId}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-neutral-100"
            >
              <option value="">Select staff member</option>
              {staff.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.name}
                </option>
              ))}
            </select>
            {errors.staffId && (
              <p className="text-sm text-danger mt-1">{errors.staffId.message}</p>
            )}
          </div>

          {/* Date Selection */}
          <div>
            <Input
              label="Date"
              type="date"
              {...register('date')}
              min={new Date().toISOString().split('T')[0]}
              error={errors.date?.message}
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Time
            </label>
            <TimeSlotPicker
              slots={slots}
              selectedTime={watchedValues.time || ''}
              onSelect={handleTimeSlotSelect}
              isLoading={slotsLoading}
              hasError={!!errors.time || timeSlotError}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Notes (optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Add any notes about this appointment..."
            />
          </div>

          {/* Recurring Options */}
          <div>
            <label className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                {...register('isRecurring')}
                className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-neutral-900">Recurring appointment</span>
                <p className="text-xs text-neutral-600">Create multiple appointments automatically</p>
              </div>
            </label>

            {isRecurring && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">
                    Frequency
                  </label>
                  <select
                    {...register('recurringFrequency')}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 Weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">
                    Number of occurrences
                  </label>
                  <Input
                    type="number"
                    {...register('recurringOccurrences', { valueAsNumber: true })}
                    min={2}
                    max={52}
                    placeholder="How many appointments?"
                  />
                  <p className="text-xs text-neutral-600 mt-1">
                    Ends after {watchedValues.recurringOccurrences || 2} appointments
                  </p>
                </div>

                {/* Preview List */}
                {watchedValues.date && watchedValues.recurringFrequency && watchedValues.recurringOccurrences && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-2">
                      Your appointments will be on:
                    </label>
                    <div className="bg-white border border-neutral-200 rounded-lg p-3">
                      {(() => {
                        const dates = calculateRecurringDates(
                          watchedValues.date,
                          watchedValues.recurringFrequency,
                          watchedValues.recurringOccurrences
                        );
                        
                        const displayDates = dates.slice(0, 5);
                        const hasMore = dates.length > 5;
                        
                        return (
                          <div className="space-y-2">
                            {displayDates.map((date, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <span className="text-sm text-neutral-900">
                                  {formatDate(date)}
                                </span>
                                {/* Mock availability check - in real implementation, check against actual availability */}
                                {Math.random() > 0.8 && (
                                  <AlertTriangle className="w-4 h-4 text-warning" />
                                )}
                              </div>
                            ))}
                            {hasMore && (
                              <div className="text-sm text-neutral-600 italic">
                                ...and {dates.length - 5} more
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Conflict Warning */}
                {(() => {
                  const dates = calculateRecurringDates(
                    watchedValues.date,
                    watchedValues.recurringFrequency,
                    watchedValues.recurringOccurrences
                  );
                  
                  // Mock conflict detection - in real implementation, check against actual availability
                  const conflictDates = dates.filter(() => Math.random() > 0.8);
                  
                  if (conflictDates.length > 0) {
                    return (
                      <div className="bg-warning-soft border border-warning rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-warning font-medium">
                              {conflictDates.length} date{conflictDates.length > 1 ? 's' : ''} have no availability. 
                              Only available dates will be booked.
                            </p>
                            <p className="text-xs text-warning mt-1">
                              Unavailable: {conflictDates.map(date => 
                                date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              ).join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-neutral-200">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? (
                isRecurring ? 
                  `Creating ${watchedValues.recurringOccurrences || 2} appointments...` : 
                  'Creating appointment...'
              ) : (
                isRecurring ? 'Create Recurring' : 'Create Appointment'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAppointmentModal;
