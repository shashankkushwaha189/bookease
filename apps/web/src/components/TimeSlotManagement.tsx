import React, { useState, useCallback, useEffect } from 'react';
import { format, addDays, addHours, setMinutes, startOfDay, endOfDay, isSameDay, differenceInMinutes } from 'date-fns';
import { Clock, Plus, X, Users, Calendar } from 'lucide-react';
import Button from './ui/Button';
import Select from './ui/Select';
import { useToastStore } from '../stores/toast.store';

interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  staffId?: string;
  appointmentId?: string;
}

interface TimeSlotManagementProps {
  selectedDate: Date;
  onClose: () => void;
  onAppointmentCreated: (appointment: any) => void;
}

const TimeSlotManagement: React.FC<TimeSlotManagementProps> = ({ 
  selectedDate, 
  onClose, 
  onAppointmentCreated 
}) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toastStore = useToastStore();

  // Generate time slots for the selected date
  const generateTimeSlots = useCallback(() => {
    if (!selectedDate) return [];
    
    const slots: TimeSlot[] = [];
    const startHour = 9; // 9:00 AM
    const endHour = 17; // 5:00 PM
    const slotDuration = 30; // 30 minutes
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const startTime = setMinutes(setHours(selectedDate, hour), minute);
        const endTime = addMinutes(startTime, slotDuration);
        
        slots.push({
          id: `${hour}-${minute}`,
          startTime,
          endTime,
          isAvailable: true,
        });
      }
    }
    
    return slots;
  }, [selectedDate]);

  // Load existing appointments for the date
  const loadAppointments = useCallback(async () => {
    if (!selectedDate) return;
    
    try {
      // This would integrate with your appointment API
      const response = await fetch(`/api/appointments?date=${format(selectedDate, 'yyyy-MM-dd')}`);
      const appointments = response.data?.items || [];
      
      // Mark occupied slots as unavailable
      const updatedSlots = timeSlots.map(slot => {
        const hasAppointment = appointments.some((apt: any) => {
          const aptStart = new Date(apt.startTimeUtc);
          const aptEnd = new Date(apt.endTimeUtc);
          return (
            isSameDay(aptStart, selectedDate) &&
            ((differenceInMinutes(slot.startTime, aptStart) >= 0 && differenceInMinutes(slot.startTime, aptStart) < slotDuration) ||
             (differenceInMinutes(aptEnd, slot.startTime) > 0 && differenceInMinutes(aptEnd, slot.startTime) < slotDuration))
          );
        });
        
        return {
          ...slot,
          isAvailable: !hasAppointment,
          appointmentId: hasAppointment ? appointments.find((apt: any) => 
            isSameDay(new Date(apt.startTimeUtc), selectedDate) &&
            differenceInMinutes(slot.startTime, new Date(apt.startTimeUtc)) >= 0 && 
            differenceInMinutes(slot.startTime, new Date(apt.startTimeUtc)) < slotDuration
          )?.id : undefined,
        };
      });
      
      setTimeSlots(updatedSlots);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  }, [selectedDate, timeSlots]);

  // Initialize time slots when date changes
  useEffect(() => {
    const slots = generateTimeSlots();
    setTimeSlots(slots);
    loadAppointments();
  }, [selectedDate, generateTimeSlots, loadAppointments]);

  const handleTimeSlotClick = useCallback((slot: TimeSlot) => {
    if (!slot.isAvailable) {
      toastStore.warning('This time slot is already booked');
      return;
    }
    setSelectedTimeSlot(slot);
    setShowAppointmentModal(true);
  }, [toastStore]);

  const handleCreateAppointment = useCallback(async (customerData: any) => {
    if (!selectedTimeSlot) return;
    
    setIsLoading(true);
    try {
      const appointmentData = {
        startTimeUtc: selectedTimeSlot.startTime.toISOString(),
        endTimeUtc: selectedTimeSlot.endTime.toISOString(),
        customerId: customerData.customerId,
        serviceId: customerData.serviceId,
        staffId: selectedStaff || undefined,
        status: 'scheduled',
        notes: customerData.notes,
      };

      // This would integrate with your appointment creation API
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': localStorage.getItem('tenantId') || '',
        },
        body: JSON.stringify(appointmentData),
      });

      if (response.ok) {
        const newAppointment = await response.json();
        toastStore.success('Appointment created successfully');
        onAppointmentCreated(newAppointment);
        onClose();
      } else {
        throw new Error('Failed to create appointment');
      }
    } catch (error: any) {
      toastStore.error('Failed to create appointment');
      console.error('Appointment creation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeSlot, selectedStaff, toastStore, onAppointmentCreated, onClose]);

  const getTimeSlotColor = (slot: TimeSlot) => {
    if (!slot.isAvailable) return 'bg-red-100 border-red-300 text-red-700';
    if (selectedTimeSlot?.id === slot.id) return 'bg-blue-100 border-blue-300';
    return 'bg-green-100 border-green-300 hover:bg-green-200 cursor-pointer';
  };

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-sm text-gray-600">Select a time slot</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          {/* Staff Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
            <Select
              value={selectedStaff}
              onChange={setSelectedStaff}
              placeholder="Any staff member"
            >
              <option value="">Any staff member</option>
              <option value="staff-1">John Doe</option>
              <option value="staff-2">Jane Smith</option>
              <option value="staff-3">Mike Johnson</option>
            </Select>
          </div>

          {/* Time Slots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {timeSlots.map((slot) => (
              <button
                key={slot.id}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-200
                  ${getTimeSlotColor(slot)}
                  ${slot.isAvailable ? 'hover:scale-105' : 'cursor-not-allowed opacity-60'}
                `}
                onClick={() => handleTimeSlotClick(slot)}
                disabled={!slot.isAvailable}
              >
                <div className="text-center">
                  <div className="text-lg font-medium mb-1">
                    {formatTime(slot.startTime)}
                  </div>
                  <div className="text-sm opacity-75">
                    {formatTime(slot.endTime)}
                  </div>
                  {slot.appointmentId && (
                    <div className="text-xs text-red-600 mt-1">
                      Booked
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Appointment Creation Modal */}
        {showAppointmentModal && selectedTimeSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Appointment</h3>
                <Button variant="ghost" onClick={() => setShowAppointmentModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <div className="p-3 bg-gray-50 rounded border border-gray-300">
                    <div className="text-lg font-medium">
                      {formatTime(selectedTimeSlot.startTime)} - {formatTime(selectedTimeSlot.endTime)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <Select placeholder="Select customer">
                    <option value="">Select a customer...</option>
                    <option value="customer-1">Alice Johnson</option>
                    <option value="customer-2">Bob Smith</option>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <Select placeholder="Select service">
                    <option value="">Select a service...</option>
                    <option value="service-1">Haircut - $30</option>
                    <option value="service-2">Beard Trim - $15</option>
                    <option value="service-3">Shave - $20</option>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Add any notes..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowAppointmentModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => handleCreateAppointment({
                    customerId: 'customer-1',
                    serviceId: 'service-1',
                    notes: 'Regular appointment',
                  })}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Appointment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSlotManagement;
