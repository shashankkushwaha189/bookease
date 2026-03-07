import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import Button from './ui/Button';
import { useToastStore } from '../stores/toast.store';
import { appointmentsApi } from '../api/appointments';
import TimeSlotManagement from './TimeSlotManagement';
import type { Appointment } from '../types/api';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'appointment' | 'available' | 'blocked';
  color?: string;
  metadata?: {
    customerId?: string;
    customerName?: string;
    serviceId?: string;
    serviceName?: string;
    staffId?: string;
    staffName?: string;
    status?: string;
  };
}

const CalendarSimple: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const toastStore = useToastStore();

  const loadAppointments = useCallback(async (date: Date) => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const response = await appointmentsApi.getAppointments({
        fromDate: monthStart.toISOString(),
        toDate: monthEnd.toISOString(),
      });

      const calendarEvents: CalendarEvent[] = response.data.data.items.map((appointment: Appointment) => ({
        id: appointment.id,
        title: `${appointment.customer?.name} - ${appointment.service?.name}`,
        start: new Date(appointment.startTimeUtc),
        end: new Date(appointment.endTimeUtc),
        type: 'appointment',
        color: '#3B82F6',
        metadata: {
          customerId: appointment.customer?.id,
          customerName: appointment.customer?.name,
          serviceId: appointment.service?.id,
          serviceName: appointment.service?.name,
          staffId: appointment.staff?.id,
          staffName: appointment.staff?.name,
          status: appointment.status,
        },
      }));

      setEvents(calendarEvents);
    } catch (error: any) {
      toastStore.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  }, [toastStore]);

  useEffect(() => {
    if (currentDate) {
      loadAppointments(currentDate);
    }
  }, [currentDate]);

  const navigatePrevious = useCallback(() => {
    setCurrentDate(prev => subMonths(prev, 1));
  }, []);

  const navigateNext = useCallback(() => {
    setCurrentDate(prev => addMonths(prev, 1));
  }, []);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowTimeSlotModal(true);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  }, []);

  const closeModals = useCallback(() => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setShowTimeSlotModal(false);
  }, []);

  const getMonthDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => ({
      date: day,
      isCurrentMonth: isSameMonth(day, currentDate),
      isToday: isSameDay(day, new Date()),
      events: events.filter(event => isSameDay(event.start, day)),
    }));
  };

  const renderDay = (dayInfo: any) => {
    const { date, isCurrentMonth, isToday, events } = dayInfo;
    
    return (
      <div
        className={`
          relative h-20 border border-gray-200 p-1 cursor-pointer
          ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
          ${isToday ? 'ring-2 ring-blue-500' : ''}
          hover:bg-gray-100 transition-colors
        `}
        onClick={() => handleDateClick(date)}
      >
        <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
          {format(date, 'd')}
        </div>
        
        <div className="space-y-1 mt-1">
          {events.slice(0, 2).map((event: CalendarEvent) => (
            <div
              key={event.id}
              className="text-xs p-1 rounded truncate bg-blue-100 text-blue-800 hover:bg-blue-200"
              onClick={(e) => {
                e.stopPropagation();
                handleEventClick(event);
              }}
            >
              <div className="font-medium truncate">{event.title}</div>
              <div className="text-xs opacity-75">
                {format(event.start, 'HH:mm')}
              </div>
            </div>
          ))}
          {events.length > 2 && (
            <div className="text-xs text-gray-500 p-1">
              +{events.length - 2} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCalendarGrid = () => {
    const days = getMonthDays();
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        <div className="grid grid-cols-7 gap-px bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div key={day} className="p-2">
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="contents">
            {week.map((day, dayIndex) => (
              <div key={dayIndex}>
                {renderDay(day)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderEventModal = () => {
    if (!showEventModal || !selectedEvent) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
            <Button variant="ghost" onClick={closeModals}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <div className="text-sm text-gray-900">{selectedEvent.metadata?.customerName}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
              <div className="text-sm text-gray-900">{selectedEvent.metadata?.serviceName}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff</label>
              <div className="text-sm text-gray-900">{selectedEvent.metadata?.staffName}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <div className="text-sm text-gray-900">
                {format(selectedEvent.start, 'PPp')} - {format(selectedEvent.end, 'PPp')}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedEvent.metadata?.status || 'scheduled'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={closeModals}>
              Close
            </Button>
            <Button variant="primary">
              Edit Appointment
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Calendar</h1>
        <p className="text-gray-600">Manage appointments and schedule</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={navigatePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" onClick={navigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={navigateToday}>
            Today
          </Button>
          <Button variant="outline" onClick={() => setShowTimeSlotModal(true)}>
            <Plus className="w-4 h-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          {renderCalendarGrid()}
        </div>
      )}

      {showTimeSlotModal && selectedDate && (
        <TimeSlotManagement
          selectedDate={selectedDate}
          onClose={closeModals}
          onAppointmentCreated={(appointment) => {
            toastStore.success('Appointment created successfully');
            setShowTimeSlotModal(false);
            loadAppointments(currentDate);
          }}
        />
      )}

      {renderEventModal()}
    </div>
  );
};

export default CalendarSimple;
