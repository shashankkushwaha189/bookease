import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import Button from './ui/Button';
import { useToastStore } from '../stores/toast.store';
import { appointmentsApi } from '../api/appointments';
import TimeSlotManagement from './TimeSlotManagement';
import type { Appointment } from '../types/api';

type ViewType = 'month' | 'week' | 'day';

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

interface DayInfo {
  date: Date;
  isCurrentMonth?: boolean;
  isCurrentWeek?: boolean;
  isCurrentDay?: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewType, setViewType] = useState<ViewType>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const toastStore = useToastStore();

  // Load appointments for current month
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

  // Load appointments when date changes
  useEffect(() => {
    loadAppointments(currentDate);
  }, [currentDate]);

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    setCurrentDate(prev => subMonths(prev, 1));
  }, []);

  const navigateNext = useCallback(() => {
    setCurrentDate(prev => addMonths(prev, 1));
  }, []);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Generate calendar days based on view type
  const getCalendarDays = useMemo(() => {
    if (viewType === 'month') {
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
    } else if (viewType === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      return days.map(day => ({
        date: day,
        isCurrentWeek: true,
        isToday: isSameDay(day, new Date()),
        events: events.filter(event => isSameDay(event.start, day)),
      }));
    } else if (viewType === 'day') {
      const dayStart = startOfDay(currentDate);
      const dayEnd = addDays(dayStart, 1);
      
      const days = eachDayOfInterval({ start: dayStart, end: dayEnd });
      
      return days.map(day => ({
        date: day,
        isCurrentDay: isSameDay(day, currentDate),
        isToday: isSameDay(day, new Date()),
        events: events.filter(event => isSameDay(event.start, day)),
      }));
    }
    
    return [];
  }, [currentDate, events, viewType]);

  // Handle date click
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowTimeSlotModal(true);
  }, []);

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  }, []);

  // Close modals
  const closeModals = useCallback(() => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setShowTimeSlotModal(false);
  }, []);

  // View type controls
  const renderViewControls = () => (
    <div className="flex gap-2 mb-4">
      <Button
        variant={viewType === 'day' ? 'primary' : 'outline'}
        size="sm"
        onClick={() => setViewType('day')}
      >
        Day
      </Button>
      <Button
        variant={viewType === 'week' ? 'primary' : 'outline'}
        size="sm"
        onClick={() => setViewType('week')}
      >
        Week
      </Button>
      <Button
        variant={viewType === 'month' ? 'primary' : 'outline'}
        size="sm"
        onClick={() => setViewType('month')}
      >
        Month
      </Button>
    </div>
  );

  // Calendar header
  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={navigatePrevious}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <Button variant="outline" size="sm" onClick={navigateNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={navigateToday}>
          Today
        </Button>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </div>
    </div>
  );

  // Render single day
  const renderDay = (dayInfo: DayInfo) => {
    const { date, isCurrentMonth, isCurrentWeek, isCurrentDay, isToday, events } = dayInfo;
    
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
        
        {/* Event indicators */}
        <div className="space-y-1 mt-1">
          {events.slice(0, 2).map((event: CalendarEvent, index: number) => (
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

  // Render calendar grid
  const renderCalendarGrid = () => {
    const days = getCalendarDays;
    
    if (viewType === 'month') {
      const weeks = [];
      for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }

      return (
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-rows-7 gap-px">
              {week.map((day, dayIndex) => (
                <div key={`${weekIndex}-${dayIndex}`}>
                  {renderDay(day)}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    } else if (viewType === 'week') {
      return (
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          <div className="col-span-7 bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
            {format(days[0].date, 'MMM dd')} - {format(days[days.length - 1].date, 'MMM dd')}
          </div>
          {days.map((day, index) => (
            <div key={index} className="border-t border-gray-200 p-1">
              {renderDay(day)}
            </div>
          ))}
        </div>
      );
    } else if (viewType === 'day') {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {days.map((day, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                day.isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {format(day.date, 'h:mm a')}
                  </span>
                  <span className="text-sm text-gray-500">
                    {day.events.length} appointments
                  </span>
                </div>
                <div className="space-y-2">
                  {day.events.map((event: any, eventIndex) => (
                    <div
                      key={event.id}
                      className="p-3 bg-blue-100 rounded border border-blue-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-blue-900">{event.title}</div>
                          <div className="text-sm text-blue-700">
                            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Event modal
  const renderEventModal = () => {
    if (!showEventModal || !selectedEvent) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Appointment Details</h3>
            <Button variant="ghost" size="sm" onClick={closeModal}>
              <X className="w-4 h-4" />
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
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  ${selectedEvent.metadata?.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                  ${selectedEvent.metadata?.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                  ${selectedEvent.metadata?.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : ''}
                `}>
                  {selectedEvent.metadata?.status || 'scheduled'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={closeModal}>
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

      {renderViewControls()}
      {renderCalendarHeader()}
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-7 gap-px bg-gray-200 mb-px">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
                {day}
              </div>
            ))}
          </div>
          {renderCalendarGrid()}
        </div>
      )}

      <Calendar />
      
      {showTimeSlotModal && selectedDate && (
        <TimeSlotManagement
          selectedDate={selectedDate}
          onClose={closeModals}
          onAppointmentCreated={(appointment) => {
            toastStore.success('Appointment created successfully');
            setShowTimeSlotModal(false);
            loadAppointments(currentDate); // Refresh appointments
          }}
        />
      )}

      {renderEventModal()}
    </div>
  );
};

export default Calendar;
