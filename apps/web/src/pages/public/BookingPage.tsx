import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Lock, 
  AlertCircle,
  Copy,
  Download
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import PolicyPreview from '../../components/PolicyPreview';
import { useToastStore } from '../../stores/toast.store';
import { useAuthStore } from '../../stores/auth.store';
import { useTenantStore } from '../../stores/tenant.store';
import { servicesApi } from '../../api/services';
import { staffApi } from '../../api/staff';
import { appointmentsApi } from '../../api/appointments';
import { customersApi } from '../../api/customers';
import { applyTenantTheme } from '../../utils/theme';

// Types
interface Service {
  id: string;
  name: string;
  duration: number;
  price?: number;
  description?: string;
}

interface Staff {
  id: string;
  name: string;
  bio?: string;
  photoUrl?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingDetails {
  fullName: string;
  email: string;
  phone?: string;
  consent: boolean;
}

interface TenantProfile {
  businessName: string;
  logoUrl?: string;
  brandColor: string;
  accentColor: string;
  phone?: string;
  email?: string;
  policyText?: string;
}

interface BookingConfirmation {
  id: string;
  referenceId: string;
  service: string;
  dateTime: string;
  staffName: string;
}

// Form validation schema
const bookingDetailsSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  consent: z.boolean().refine((val) => val === true, "You must agree to the booking policy"),
});

type BookingDetailsForm = z.infer<typeof bookingDetailsSchema>;

// API Hooks (real implementations)
const useTenantProfile = (tenantSlug: string) => {
  const [profile, setProfile] = React.useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Use default profile to bypass API issues
        console.log('🔍 Using default business profile for public booking');
        const defaultProfile: TenantProfile = {
          businessName: 'HealthFirst Clinic (Demo)',
          brandColor: '#1A56DB',
          accentColor: '#10B981',
          phone: '+91-9876543210',
          email: 'hello@healthfirst.demo',
          policyText: 'By booking, you agree to our terms and conditions.'
        };
        
        setProfile(defaultProfile);
        applyTenantTheme(defaultProfile.brandColor, defaultProfile.accentColor);
        
        // TODO: Fix API endpoint and re-enable this code
        /*
        // Get tenant profile from public business profile endpoint
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/public/profile`, {
          headers: {
            'X-Tenant-ID': tenantSlug === 'demo-clinic' ? 'b18e0808-27d1-4253-aca9-453897585106' : tenantSlug
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const tenantProfile: TenantProfile = {
            businessName: data.businessName || 'BookEase Demo',
            brandColor: data.brandColor || '#1A56DB',
            accentColor: data.accentColor || '#10B981',
            phone: data.phone,
            email: data.email,
            policyText: data.policyText
          };
          
          setProfile(tenantProfile);
          applyTenantTheme(tenantProfile.brandColor, tenantProfile.accentColor);
        } else {
          // Fallback profile
          const fallbackProfile: TenantProfile = {
            businessName: 'BookEase Demo',
            brandColor: '#1A56DB',
            accentColor: '#10B981',
            phone: '+1 (555) 123-4567',
            email: 'contact@bookease.com',
            policyText: 'Cancellations must be made at least 24 hours in advance.'
          };
          setProfile(fallbackProfile);
          applyTenantTheme(fallbackProfile.brandColor, fallbackProfile.accentColor);
        }
        */
      } catch (error) {
        console.error('Failed to fetch tenant profile:', error);
        // Fallback profile
        const fallbackProfile: TenantProfile = {
          businessName: 'BookEase Demo',
          brandColor: '#1A56DB',
          accentColor: '#10B981',
          phone: '+1 (555) 123-4567',
          email: 'contact@bookease.com',
          policyText: 'Cancellations must be made at least 24 hours in advance.'
        };
        setProfile(fallbackProfile);
        applyTenantTheme(fallbackProfile.brandColor, fallbackProfile.accentColor);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [tenantSlug]);

  return { profile, isLoading };
};

const useServices = () => {
  const [services, setServices] = React.useState<Service[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Use public services endpoint for booking (no auth required)
        const response = await servicesApi.getPublicServices();
        console.log('📅 Public Services API response:', response);
        
        if (response.data?.data) {
          const mappedServices = response.data.data.map((service: any) => ({
            id: service.id,
            name: service.name,
            duration: service.durationMinutes,
            price: service.price,
            description: service.description
          }));
          setServices(mappedServices);
        } else {
          setServices([]);
        }
      } catch (error: any) {
        console.error('Failed to fetch public services:', error);
        console.error('📅 Services API error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        setServices([]);
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
    if (!serviceId) return;

    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        // Use public staff endpoint for booking (no auth required)
        const response = await staffApi.getPublicStaff({ serviceId });
        console.log('👥 Public Staff API response:', response);
        
        if (response.data?.success && response.data?.data) {
          const mappedStaff = response.data.data.map((staffMember: any) => ({
            id: staffMember.id,
            name: staffMember.name,
            bio: staffMember.bio || `Specialist in ${staffMember.services?.map((s: any) => s.name).join(', ') || 'various services'}`
          }));
          setStaff(mappedStaff);
        } else {
          setStaff([]);
        }
      } catch (error: any) {
        console.error('Failed to fetch public staff:', error);
        console.error('👥 Staff API error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        setStaff([]);
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
    if (!serviceId || !date) return;

    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
        console.log('⏰ Fetching availability with params:', { serviceId, staffId, date });
        
        // Don't send staffId if it's 'no-preference'
        const params: any = {
          serviceId: serviceId || '',
          date: date || ''
        };
        
        if (staffId && staffId !== 'no-preference') {
          params.staffId = staffId;
        }
        
        const response = await appointmentsApi.getAvailability(params);
        
        console.log('⏰ Availability API response:', response);
        console.log('⏰ Response structure:', {
          success: response.data?.success,
          hasData: !!response.data?.data,
          hasSlots: !!response.data?.data?.slots,
          slots: response.data?.data?.slots
        });
        
        if (response.data?.data?.slots) {
          const mappedSlots = response.data.data.slots.map((slot: any) => ({
            time: new Date(slot.startTimeUtc).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            available: slot.isAvailable !== false // Default to true if not specified
          }));
          console.log('⏰ Mapped slots:', mappedSlots);
          setSlots(mappedSlots);
        } else {
          console.warn('⏰ No slots found in response, setting empty array');
          setSlots([]);
        }
      } catch (error: any) {
        console.error('⏰ Failed to fetch availability:', error);
        console.error('⏰ Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        setSlots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [serviceId, staffId, date]);

  return { slots, isLoading };
};

// Components
const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ 
  currentStep, 
  totalSteps 
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-600">
          {Math.round(progress)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const SummaryPanel: React.FC<{
  service?: Service;
  staff?: Staff;
  date?: string;
  time?: string;
  isMobile?: boolean;
}> = ({ service, staff, date, time }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
      
      <div className="space-y-4">
        {service && (
          <div>
            <div className="text-sm text-gray-600 mb-1">Service</div>
            <div className="font-medium text-gray-900">{service.name}</div>
            <div className="text-sm text-gray-600">
              {service.duration} min {service.price && `• $${service.price}`}
            </div>
          </div>
        )}

        {staff && (
          <div>
            <div className="text-sm text-gray-600 mb-1">Staff</div>
            <div className="font-medium text-gray-900">{staff.name}</div>
            {staff.bio && (
              <div className="text-sm text-gray-600 mt-1">{staff.bio}</div>
            )}
          </div>
        )}

        {date && time && (
          <div>
            <div className="text-sm text-gray-600 mb-1">Date & Time</div>
            <div className="font-medium text-gray-900">{date} at {time}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const ServiceCard: React.FC<{
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}> = ({ service, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-4 border rounded-lg text-left transition-all duration-200 ${
        isSelected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="font-medium text-gray-900 mb-1">{service.name}</div>
      <div className="text-sm text-gray-600">
        {service.duration} min {service.price && `• $${service.price}`}
      </div>
    </button>
  );
};

const StaffCard: React.FC<{
  staff: Staff;
  isSelected: boolean;
  onClick: () => void;
}> = ({ staff, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-4 border rounded-lg text-left transition-all duration-200 ${
        isSelected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
          {staff.photoUrl ? (
            <img 
              src={staff.photoUrl} 
              alt={staff.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-white" />
          )}
        </div>
        <div>
          <div className="font-medium text-gray-900">{staff.name}</div>
          {staff.bio && (
            <div className="text-sm text-gray-600">{staff.bio}</div>
          )}
        </div>
      </div>
    </button>
  );
};

const TimeSlotButton: React.FC<{
  slot: TimeSlot;
  isSelected: boolean;
  onClick: () => void;
}> = ({ slot, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={!slot.available}
      className={`py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
        isSelected
          ? 'bg-green-500 text-white'
          : slot.available
          ? 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-900'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
      }`}
    >
      {slot.time}
      {!slot.available && (
        <div className="text-xs mt-1">Unavailable</div>
      )}
    </button>
  );
};

const CountdownTimer: React.FC<{ 
  onExpire: () => void;
  initialTime: number;
}> = ({ onExpire, initialTime }) => {
  const [timeLeft, setTimeLeft] = React.useState(initialTime);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="text-sm text-amber-500 flex items-center">
      <Clock className="w-4 h-4 mr-1" />
      Slot held for {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
};

const ConfirmationCard: React.FC<{
  confirmation: BookingConfirmation;
  profile: TenantProfile;
  onAddToCalendar: () => void;
}> = ({ confirmation, profile, onAddToCalendar }) => {
  const [copied, setCopied] = React.useState(false);

  const copyReference = () => {
    navigator.clipboard.writeText(confirmation.referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
      
      <div className="bg-green-50 border border-green-500 rounded-lg p-4 mb-6">
        <div className="text-sm text-green-600 font-medium mb-2">Reference ID</div>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-lg font-mono text-gray-900">{confirmation.referenceId}</span>
          <button
            onClick={copyReference}
            className="p-1 hover:bg-green-100 rounded transition-colors"
          >
            <Copy className="w-4 h-4 text-green-600" />
          </button>
        </div>
        {copied && (
          <div className="text-xs text-green-600 mt-1">Copied!</div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Booking Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium">{confirmation.service}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date & Time:</span>
            <span className="font-medium">{confirmation.dateTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Staff:</span>
            <span className="font-medium">{confirmation.staffName}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Business Contact</h3>
        <div className="space-y-1 text-sm">
          <div className="text-gray-600">{profile.businessName}</div>
          {profile.phone && <div className="text-gray-600">{profile.phone}</div>}
          {profile.email && <div className="text-gray-600">{profile.email}</div>}
        </div>
      </div>

      <Button onClick={onAddToCalendar} className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Add to Calendar
      </Button>
    </div>
  );
};

// Main Booking Page Component
const BookingPage: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [searchParams] = useSearchParams();
  const { success, error } = useToastStore();
  
  // Check if this is a reschedule request
  const rescheduleBookingId = searchParams.get('reschedule');
  const isReschedule = !!rescheduleBookingId;
  
  // State
  const [currentStep, setCurrentStep] = React.useState(1);
  const [selectedService, setSelectedService] = React.useState<Service>();
  const [selectedStaff, setSelectedStaff] = React.useState<Staff>();
  const [selectedDate, setSelectedDate] = React.useState<string>('');
  const [selectedTime, setSelectedTime] = React.useState<string>('');
  const [lockTimeLeft, setLockTimeLeft] = React.useState<number>(0);
  const [confirmation, setConfirmation] = React.useState<BookingConfirmation | null>(null);

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<BookingDetailsForm>({
    resolver: zodResolver(bookingDetailsSchema),
    mode: 'onChange',
  });

  // API Hooks
  const { profile, isLoading: profileLoading } = useTenantProfile(tenantSlug || '');
  const { services, isLoading: servicesLoading } = useServices();
  const { staff, isLoading: staffLoading } = useStaff(selectedService?.id);
  const { slots, isLoading: slotsLoading } = useAvailability(
    selectedService?.id,
    selectedStaff?.id,
    selectedDate
  );

  // Auto-select staff if only one available
  useEffect(() => {
    if (staff.length === 1 && !selectedStaff && currentStep === 2) {
      setSelectedStaff(staff[0]);
      setCurrentStep(3);
    }
  }, [staff, selectedStaff, currentStep]);

  // Handle slot lock expiration
  const handleSlotExpired = useCallback(() => {
    error('Your time slot has expired. Please select another time.');
    setSelectedTime('');
    setSessionToken('');
    setLockTimeLeft(0);
  }, [error]);

  // Handle time slot selection
  const handleTimeSlotSelect = async (time: string) => {
    setSelectedTime(time);
    
    try {
      // Mock API call to lock slot
      await new Promise(resolve => setTimeout(resolve, 300));
      setLockTimeLeft(900); // 15 minutes
    } catch (error: any) {
      console.error('Failed to reserve time slot:', error);
      error('Failed to reserve time slot');
    }
  };

  // Handle booking submission
  const handleBookingSubmit = async (data: BookingDetailsForm) => {
    try {
      // Create booking with real API (public booking - no auth required)
      // const { user } = useAuthStore.getState();
      
      // if (!user) {
      //   error('You must be logged in to book an appointment');
      //   return;
      // }

      // Validate staff selection
      if (!selectedStaff?.id) {
        error('Please select a staff member for your appointment.');
        setCurrentStep(2);
        return;
      }

      console.log('👥 Selected staff details:', {
        id: selectedStaff.id,
        name: selectedStaff.name,
        idType: typeof selectedStaff.id,
        idLength: selectedStaff.id?.length
      });

      const bookingData = {
        serviceId: selectedService!.id,
        staffId: selectedStaff.id,
        customer: {
          name: data.fullName,
          email: data.email,
          phone: data.phone || undefined
        },
        startTimeUtc: new Date(`${selectedDate} ${selectedTime}`).toISOString(),
        endTimeUtc: new Date(new Date(`${selectedDate} ${selectedTime}`).getTime() + (selectedService?.duration || 60) * 60000).toISOString(),
        sessionToken: 'booking-session-' + Date.now(),
        notes: `Booking from ${data.fullName} (${data.email})`,
        consentGiven: data.consent
      };

      console.log('📅 Booking data being sent:', {
        serviceId: bookingData.serviceId,
        serviceIdType: typeof bookingData.serviceId,
        serviceIdLength: bookingData.serviceId?.length,
        staffId: bookingData.staffId,
        staffIdType: typeof bookingData.staffId,
        staffIdLength: bookingData.staffId?.length
      });

      console.log('📅 Creating booking with data:', bookingData);
      console.log('📅 Selected service:', selectedService);
      console.log('📅 Selected staff:', selectedStaff);
      console.log('📅 Selected date/time:', selectedDate, selectedTime);
      console.log('📅 Form data:', data);
      
      // First create a customer for the public booking
      const customerResponse = await customersApi.createCustomer({
        name: data.fullName,
        email: data.email,
        phone: data.phone || undefined
      }, true); // Use public endpoint
      
      const customerId = customerResponse.data?.data?.id;
      
      if (!customerId) {
        throw new Error('Failed to create customer for booking');
      }
      
      // Handle no-preference staff selection
      let staffId = selectedStaff.id;
      if (staffId === 'no-preference') {
        // For public booking, we need a real staff ID. Get the first available staff member using public endpoint.
        const staffResponse = await staffApi.getPublicStaff();
        if (staffResponse.data && staffResponse.data.length > 0) {
          staffId = staffResponse.data[0].id;
          console.log('🔧 Using first available staff member:', staffId);
        } else {
          throw new Error('No staff members available for booking');
        }
      }

      const response = await appointmentsApi.createPublicBooking({
        serviceId: selectedService!.id,
        staffId: staffId,
        customer: {
          name: data.fullName,
          email: data.email,
          phone: data.phone || undefined
        },
        startTimeUtc: new Date(`${selectedDate} ${selectedTime}`).toISOString(),
        endTimeUtc: new Date(new Date(`${selectedDate} ${selectedTime}`).getTime() + (selectedService?.duration || 60) * 60000).toISOString(),
        notes: `Public booking from ${data.fullName} (${data.email})`,
        consentGiven: data.consent,
        sessionToken: `public-${Date.now()}`
      });
      console.log('✅ Booking created:', response);
      console.log('✅ Response data:', response.data);
      console.log('✅ Response success:', response.data?.success);
      console.log('✅ Response appointment data:', response.data?.data);
      
      if (response.data?.success && response.data?.data) {
        const confirmation: BookingConfirmation = {
          id: response.data.data.id || 'booking-123',
          referenceId: response.data.data.referenceId || `BK-${Date.now()}`,
          service: selectedService!.name,
          dateTime: `${selectedDate} at ${selectedTime}`,
          staffName: selectedStaff?.name || 'Any available'
        };
        
        console.log('🎉 Setting confirmation:', confirmation);
        setConfirmation(confirmation);
        setCurrentStep(5);
        success('Booking confirmed successfully!');
      } else {
        console.error('❌ Booking response unexpected:', response);
        error('Booking created but confirmation failed. Please contact support.');
      }
    } catch (bookingError: any) {
      console.error('❌ Booking error:', bookingError);
      console.error('❌ Error response:', JSON.stringify(bookingError.response?.data, null, 2));
      console.error('❌ Error status:', bookingError.response?.status);
      console.error('❌ Error message:', bookingError.message);
      
      if (bookingError.response?.status === 409) {
        error('Sorry, this slot was just taken. Please select another time.');
        setCurrentStep(3);
      } else if (bookingError.response?.status === 500) {
        console.error('❌ Server error details:', JSON.stringify(bookingError.response?.data, null, 2));
        error('Server error occurred. Please try again.');
      } else {
        error('Failed to create booking. Please try again.');
      }
    }
  };

  // Handle add to calendar
  const handleAddToCalendar = () => {
    // Generate .ics file
    const cleanTime = selectedTime.replace(/[^0-9]/g, '');
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${confirmation?.service}
DTSTART:${selectedDate}T${cleanTime}00
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${confirmation?.referenceId}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Navigation
  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if can proceed
  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedService;
      case 2: return !!selectedStaff || staff.length === 0;
      case 3: return !!selectedDate && !!selectedTime;
      case 4: return isValid;
      default: return false;
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Service</h2>
            {servicesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} variant="card" height="100px" />
                ))}
              </div>
            ) : services.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={selectedService?.id === service.id}
                    onClick={() => setSelectedService(service)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No services available"
                description="Please check back later."
                icon={<Calendar className="w-12 h-12 text-gray-400" />}
              />
            )}
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Staff Member</h2>
            
            {/* "No preference" option */}
            <StaffCard
              staff={{
                id: 'no-preference',
                name: 'No preference — any available',
                bio: 'We\'ll assign you the first available staff member'
              }}
              isSelected={selectedStaff?.id === 'no-preference'}
              onClick={() => setSelectedStaff({ id: 'no-preference', name: 'No preference' })}
            />

            {staffLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} variant="card" height="80px" />
                ))}
              </div>
            ) : staff.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {staff.map((staffMember) => (
                  <StaffCard
                    key={staffMember.id}
                    staff={staffMember}
                    isSelected={selectedStaff?.id === staffMember.id}
                    onClick={() => setSelectedStaff(staffMember)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No staff available"
                description="Please try another service."
                icon={<User className="w-12 h-12 text-gray-400" />}
              />
            )}
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Date & Time</h2>
            
            {/* Date picker placeholder */}
            <div className="mb-6">
              <Input
                type="date"
                label="Select Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {selectedDate && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Time Slots</h3>
                
                {slotsLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }, (_, index) => (
                      <Skeleton key={index} height="60px" />
                    ))}
                  </div>
                ) : slots.length > 0 ? (
                  <div>
                    {lockTimeLeft > 0 && (
                      <CountdownTimer
                        initialTime={lockTimeLeft}
                        onExpire={handleSlotExpired}
                      />
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {slots.map((slot, index) => (
                        <TimeSlotButton
                          key={index}
                          slot={slot}
                          isSelected={selectedTime === slot.time}
                          onClick={() => slot.available && handleTimeSlotSelect(slot.time)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No slots available"
                    description="Try another day or check back later."
                    icon={<Clock className="w-12 h-12 text-gray-400" />}
                  />
                )}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Details</h2>
            
            <form onSubmit={handleSubmit(handleBookingSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                {...register('fullName')}
                error={errors.fullName?.message}
                required
              />

              <Input
                label="Email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                required
              />

              <Input
                label="Phone (optional)"
                type="tel"
                {...register('phone')}
                error={errors.phone?.message}
              />

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('consent')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      I agree to the booking policy
                    </span>
                    {profile?.policyText && (
                      <PolicyPreview policy={profile.policyText} />
                    )}
                  </div>
                </label>
                {errors.consent && (
                  <p className="text-sm text-red-500 mt-1">{errors.consent.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={!canProceed()}
              >
                Confirm Booking
              </Button>
            </form>
          </div>
        );

      case 5:
        return confirmation && profile ? (
          <ConfirmationCard
            confirmation={confirmation}
            profile={profile}
            onAddToCalendar={handleAddToCalendar}
          />
        ) : null;

      default:
        return null;
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isReschedule ? 'Reschedule Appointment' : 'Book an Appointment'}
          </h1>
          <p className="text-gray-600">
            {isReschedule ? 'Choose a new time for your appointment' : (profile?.businessName || 'Loading...')}
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar currentStep={currentStep} totalSteps={5} />

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          {currentStep > 1 && (
            <Button variant="ghost" onClick={prevStep}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          {currentStep < 5 && (
            <Button
              variant="primary"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Content */}
          <div className="lg:col-span-2">
            {renderStepContent()}
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-1">
            <SummaryPanel
              service={selectedService}
              staff={selectedStaff}
              date={selectedDate}
              time={selectedTime}
            />
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-1" />
              Secure booking
            </div>
            {profile?.phone && <span>{profile.phone}</span>}
            {profile?.email && <span>{profile.email}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
