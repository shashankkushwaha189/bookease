import React, { useState, useEffect } from 'react';
import { useTenant } from './TenantProvider';
import { ServicesApiService, StaffApiService, AvailabilityApiService, BookingApiService } from '../lib/api-client';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  specialization?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface BookingData {
  serviceId: string;
  staffId: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  startTimeUtc: string;
  endTimeUtc: string;
  consentGiven: boolean;
  notes?: string;
  sessionToken: string;
}

export const TenantAwareBookingPage: React.FC = () => {
  const { tenant, profile, loading, error } = useTenant();
  
  // Form state
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bookingError, setBookingError] = useState<string>('');

  // Load services
  useEffect(() => {
    if (tenant) {
      loadServices();
    }
  }, [tenant]);

  // Load staff when service is selected
  useEffect(() => {
    if (selectedService) {
      loadStaff();
    }
  }, [selectedService]);

  // Load availability when date and staff are selected
  useEffect(() => {
    if (selectedDate && selectedStaff && selectedService) {
      loadAvailability();
    }
  }, [selectedDate, selectedStaff, selectedService]);

  const loadServices = async () => {
    try {
      const response = await ServicesApiService.getPublicServices();
      if (response.success && response.data) {
        setServices(response.data);
      }
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await StaffApiService.getPublicStaff();
      if (response.success && response.data) {
        setStaff(response.data);
      }
    } catch (err) {
      console.error('Error loading staff:', err);
    }
  };

  const loadAvailability = async () => {
    if (!selectedService || !selectedDate) return;

    try {
      const params: any = {
        serviceId: selectedService.id,
        date: selectedDate,
      };
      
      if (selectedStaff) {
        params.staffId = selectedStaff.id;
      }

      const response = await AvailabilityApiService.getPublicAvailability(params);
      if (response.success && response.data) {
        setAvailableSlots(response.data.slots || []);
      }
    } catch (err) {
      console.error('Error loading availability:', err);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedStaff(null);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleStaffSelect = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setStep(3);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setAvailableSlots([]);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    
    setSelectedSlot(slot);
    setStep(4);
  };

  const handleBookingSubmit = async (customerData: {
    name: string;
    email: string;
    phone?: string;
    notes?: string;
  }) => {
    if (!selectedService || !selectedStaff || !selectedSlot) {
      setBookingError('Missing required booking information');
      return;
    }

    setBookingStatus('loading');
    setBookingError('');

    try {
      const booking: BookingData = {
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        customer: customerData,
        startTimeUtc: selectedSlot.startTime,
        endTimeUtc: selectedSlot.endTime,
        consentGiven: true,
        notes: customerData.notes,
        sessionToken: generateSessionToken(),
      };

      const response = await BookingApiService.createPublicBooking(booking);
      
      if (response.success) {
        setBookingData(response.data);
        setBookingStatus('success');
        setStep(5);
      } else {
        setBookingError(response.error?.message || 'Booking failed');
        setBookingStatus('error');
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setBookingError(err instanceof Error ? err.message : 'Booking failed');
      setBookingStatus('error');
    }
  };

  const generateSessionToken = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedSlot(null);
    setBookingData(null);
    setBookingStatus('idle');
    setBookingError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with tenant branding */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              {profile?.logoUrl && (
                <img
                  src={profile.logoUrl}
                  alt={profile.businessName}
                  className="h-8 w-8 rounded"
                />
              )}
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900">
                  {profile?.businessName || 'Book Appointment'}
                </h1>
                {profile?.description && (
                  <p className="text-sm text-gray-600">{profile.description}</p>
                )}
              </div>
            </div>
            {tenant && (
              <div className="text-sm text-gray-500">
                Booking with {tenant.name}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Booking steps */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Progress indicator */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[1, 2, 3, 4, 5].map((stepNumber) => (
                <div
                  key={stepNumber}
                  className={`flex-1 text-center py-4 px-1 border-b-2 ${
                    step >= stepNumber
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {stepNumber === 1 && 'Service'}
                    {stepNumber === 2 && 'Staff'}
                    {stepNumber === 3 && 'Time'}
                    {stepNumber === 4 && 'Details'}
                    {stepNumber === 5 && 'Confirm'}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Step content */}
          <div className="p-6">
            {step === 1 && (
              <ServiceSelectionStep
                services={services}
                selectedService={selectedService}
                onServiceSelect={handleServiceSelect}
              />
            )}

            {step === 2 && (
              <StaffSelectionStep
                staff={staff}
                selectedStaff={selectedStaff}
                onStaffSelect={handleStaffSelect}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && (
              <DateTimeSelectionStep
                selectedService={selectedService}
                selectedStaff={selectedStaff}
                selectedDate={selectedDate}
                availableSlots={availableSlots}
                onDateSelect={handleDateSelect}
                onSlotSelect={handleSlotSelect}
                onBack={() => setStep(2)}
              />
            )}

            {step === 4 && (
              <CustomerDetailsStep
                selectedService={selectedService}
                selectedStaff={selectedStaff}
                selectedSlot={selectedSlot}
                onSubmit={handleBookingSubmit}
                onBack={() => setStep(3)}
                loading={bookingStatus === 'loading'}
                error={bookingError}
              />
            )}

            {step === 5 && (
              <BookingConfirmationStep
                bookingData={bookingData}
                selectedService={selectedService}
                selectedStaff={selectedStaff}
                selectedSlot={selectedSlot}
                onNewBooking={resetBooking}
                profile={profile}
              />
            )}
          </div>
        </div>

        {/* Policy display */}
        {profile?.policyText && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Policy & Terms</h3>
            <div className="prose max-w-none text-gray-600">
              {profile.policyText}
            </div>
          </div>
        )}

        {/* Contact information */}
        {profile && (profile.phone || profile.email || profile.address) && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="space-y-2 text-gray-600">
              {profile.phone && (
                <div>
                  <strong>Phone:</strong> {profile.phone}
                </div>
              )}
              {profile.email && (
                <div>
                  <strong>Email:</strong> {profile.email}
                </div>
              )}
              {profile.address && (
                <div>
                  <strong>Address:</strong> {profile.address}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Step components (simplified for brevity)
const ServiceSelectionStep: React.FC<{
  services: Service[];
  selectedService: Service | null;
  onServiceSelect: (service: Service) => void;
}> = ({ services, selectedService, onServiceSelect }) => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Select a Service</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => (
        <div
          key={service.id}
          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
            selectedService?.id === service.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onServiceSelect(service)}
        >
          <h3 className="font-semibold">{service.name}</h3>
          <p className="text-gray-600 text-sm mt-1">{service.description}</p>
          <div className="mt-2 text-sm">
            <span className="font-medium">Duration:</span> {service.duration} min
          </div>
          <div className="text-sm">
            <span className="font-medium">Price:</span> ${service.price}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StaffSelectionStep: React.FC<{
  staff: Staff[];
  selectedStaff: Staff | null;
  onStaffSelect: (staff: Staff) => void;
  onBack: () => void;
}> = ({ staff, selectedStaff, onStaffSelect, onBack }) => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Select Staff Member</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {staff.map((staffMember) => (
        <div
          key={staffMember.id}
          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
            selectedStaff?.id === staffMember.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onStaffSelect(staffMember)}
        >
          <h3 className="font-semibold">{staffMember.name}</h3>
          <p className="text-gray-600 text-sm mt-1">{staffMember.email}</p>
          {staffMember.specialization && (
            <div className="mt-2 text-sm text-gray-600">
              Specialization: {staffMember.specialization}
            </div>
          )}
        </div>
      ))}
    </div>
    <button
      onClick={onBack}
      className="mt-6 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
    >
      Back
    </button>
  </div>
);

const DateTimeSelectionStep: React.FC<{
  selectedService: Service | null;
  selectedStaff: Staff | null;
  selectedDate: string;
  availableSlots: TimeSlot[];
  onDateSelect: (date: string) => void;
  onSlotSelect: (slot: TimeSlot) => void;
  onBack: () => void;
}> = ({ selectedService, selectedStaff, selectedDate, availableSlots, onDateSelect, onSlotSelect, onBack }) => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Select Date & Time</h2>
    
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Date
      </label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateSelect(e.target.value)}
        min={new Date().toISOString().split('T')[0]}
        className="block w-full border border-gray-300 rounded-md px-3 py-2"
      />
    </div>

    {selectedDate && availableSlots.length > 0 && (
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Time Slots</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableSlots.map((slot, index) => (
            <button
              key={index}
              onClick={() => slot.available && onSlotSelect(slot)}
              disabled={!slot.available}
              className={`px-3 py-2 rounded-md text-sm ${
                slot.available
                  ? 'border border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  : 'border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {new Date(slot.startTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </button>
          ))}
        </div>
      </div>
    )}

    <button
      onClick={onBack}
      className="mt-6 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
    >
      Back
    </button>
  </div>
);

const CustomerDetailsStep: React.FC<{
  selectedService: Service | null;
  selectedStaff: Staff | null;
  selectedSlot: TimeSlot | null;
  onSubmit: (data: { name: string; email: string; phone?: string; notes?: string }) => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}> = ({ selectedService, selectedStaff, selectedSlot, onSubmit, onBack, loading, error }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Details</h2>
      
      {/* Booking summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2">Booking Summary</h3>
        <div className="space-y-1 text-sm">
          <div><strong>Service:</strong> {selectedService?.name}</div>
          <div><strong>Staff:</strong> {selectedStaff?.name}</div>
          <div><strong>Date:</strong> {selectedSlot && new Date(selectedSlot.startTime).toLocaleDateString()}</div>
          <div><strong>Time:</strong> {selectedSlot && new Date(selectedSlot.startTime).toLocaleTimeString()}</div>
          <div><strong>Duration:</strong> {selectedService?.duration} minutes</div>
          <div><strong>Price:</strong> ${selectedService?.price}</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
};

const BookingConfirmationStep: React.FC<{
  bookingData: any;
  selectedService: Service | null;
  selectedStaff: Staff | null;
  selectedSlot: TimeSlot | null;
  onNewBooking: () => void;
  profile: BusinessProfile | null;
}> = ({ bookingData, selectedService, selectedStaff, selectedSlot, onNewBooking, profile }) => (
  <div className="text-center">
    <div className="mb-6">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>

    <h2 className="text-2xl font-bold mb-4">Booking Confirmed!</h2>
    
    <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
      <h3 className="font-semibold mb-4">Booking Details</h3>
      <div className="space-y-2">
        <div><strong>Confirmation:</strong> {bookingData?.referenceId || 'N/A'}</div>
        <div><strong>Service:</strong> {selectedService?.name}</div>
        <div><strong>Staff:</strong> {selectedStaff?.name}</div>
        <div><strong>Date:</strong> {selectedSlot && new Date(selectedSlot.startTime).toLocaleDateString()}</div>
        <div><strong>Time:</strong> {selectedSlot && new Date(selectedSlot.startTime).toLocaleTimeString()}</div>
        <div><strong>Customer:</strong> {bookingData?.customer?.name}</div>
        <div><strong>Email:</strong> {bookingData?.customer?.email}</div>
      </div>
    </div>

    <div className="space-y-3">
      <p className="text-gray-600">
        A confirmation email has been sent to your email address.
      </p>
      
      {profile?.phone && (
        <p className="text-gray-600">
          For any changes, please call us at {profile.phone}.
        </p>
      )}

      <button
        onClick={onNewBooking}
        className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700"
      >
        Book Another Appointment
      </button>
    </div>
  </div>
);
