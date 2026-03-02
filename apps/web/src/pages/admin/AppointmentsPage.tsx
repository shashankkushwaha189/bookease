import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import AppointmentDrawer from '../../components/AppointmentDrawer';

// Types
interface Appointment {
  id: string;
  referenceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  service: string;
  duration: number;
  staffId: string;
  staffName: string;
  staffColor: string;
  dateTime: string;
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show';
  performedBy: string;
  timestamp: string;
  details?: string;
}

type ViewType = 'list' | 'day' | 'week';

// Mock API hooks
const useAppointments = (filters: {
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  staffId?: string;
  search?: string;
  page?: number;
}) => {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [totalCount, setTotalCount] = React.useState(0);

  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockAppointments: Appointment[] = [
          {
            id: '1',
            referenceId: 'BK-2024-00042',
            customerName: 'John Smith',
            customerEmail: 'john.smith@email.com',
            customerPhone: '+1 (555) 123-4567',
            service: 'Haircut',
            duration: 30,
            staffId: '1',
            staffName: 'Sarah Johnson',
            staffColor: '#1A56DB',
            dateTime: '2024-03-02T09:00:00',
            status: 'confirmed',
            createdAt: '2024-03-01T14:30:00',
            updatedAt: '2024-03-01T14:30:00'
          },
          {
            id: '2',
            referenceId: 'BK-2024-00043',
            customerName: 'Emma Davis',
            customerEmail: 'emma.davis@email.com',
            service: 'Color & Style',
            duration: 120,
            staffId: '2',
            staffName: 'Mike Wilson',
            staffColor: '#10B981',
            dateTime: '2024-03-02T10:30:00',
            status: 'booked',
            createdAt: '2024-03-01T16:20:00',
            updatedAt: '2024-03-01T16:20:00'
          },
          {
            id: '3',
            referenceId: 'BK-2024-00044',
            customerName: 'Robert Brown',
            customerEmail: 'robert.brown@email.com',
            service: 'Beard Trim',
            duration: 15,
            staffId: '1',
            staffName: 'Sarah Johnson',
            staffColor: '#1A56DB',
            dateTime: '2024-03-02T11:00:00',
            status: 'completed',
            createdAt: '2024-03-01T18:45:00',
            updatedAt: '2024-03-02T11:15:00'
          },
          {
            id: '4',
            referenceId: 'BK-2024-00045',
            customerName: 'Lisa Anderson',
            customerEmail: 'lisa.anderson@email.com',
            service: 'Haircut & Beard',
            duration: 45,
            staffId: '3',
            staffName: 'Emma Davis',
            staffColor: '#F59E0B',
            dateTime: '2024-03-02T14:00:00',
            status: 'confirmed',
            createdAt: '2024-03-01T09:15:00',
            updatedAt: '2024-03-01T09:15:00'
          },
          {
            id: '5',
            referenceId: 'BK-2024-00046',
            customerName: 'James Taylor',
            customerEmail: 'james.taylor@email.com',
            service: 'Full Service',
            duration: 90,
            staffId: '2',
            staffName: 'Mike Wilson',
            staffColor: '#10B981',
            dateTime: '2024-03-02T15:30:00',
            status: 'cancelled',
            createdAt: '2024-03-01T11:30:00',
            updatedAt: '2024-03-02T08:00:00'
          }
        ];
        
        setAppointments(mockAppointments);
        setTotalCount(mockAppointments.length);
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [filters]);

  return { appointments, isLoading, totalCount };
};

const useStaff = () => {
  const [staff, setStaff] = React.useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const mockStaff = [
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
  }, []);

  return { staff, isLoading };
};

// Components
const StatusFilter: React.FC<{
  selectedStatuses: string[];
  onChange: (statuses: string[]) => void;
}> = ({ selectedStatuses, onChange }) => {
  const statuses = [
    { value: 'booked', label: 'Booked', color: 'booked' },
    { value: 'confirmed', label: 'Confirmed', color: 'confirmed' },
    { value: 'completed', label: 'Completed', color: 'completed' },
    { value: 'cancelled', label: 'Cancelled', color: 'cancelled' },
    { value: 'no_show', label: 'No-Show', color: 'no_show' },
  ];

  const [isOpen, setIsOpen] = React.useState(false);

  const toggleStatus = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    onChange(newStatuses);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center"
      >
        <Filter className="w-4 h-4 mr-2" />
        Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-neutral-200 rounded-lg shadow-lg z-10">
          <div className="p-2">
            {statuses.map((status) => (
              <label key={status.value} className="flex items-center p-2 hover:bg-neutral-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status.value)}
                  onChange={() => toggleStatus(status.value)}
                  className="mr-2"
                />
                <Badge status={status.color as any} className="mr-2" />
                <span className="text-sm">{status.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AppointmentRow: React.FC<{
  appointment: Appointment;
  onView: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}> = ({ appointment, onView, onReschedule, onCancel }) => {
  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDateTime(appointment.dateTime);

  return (
    <tr className="border-b border-neutral-200 hover:bg-neutral-50">
      <td className="px-4 py-3 text-sm">
        <div className="font-mono text-neutral-900">{appointment.referenceId}</div>
      </td>
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-neutral-900">{appointment.customerName}</div>
          <div className="text-sm text-neutral-600">{appointment.customerEmail}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-neutral-900">{appointment.service}</td>
      <td className="px-4 py-3 text-sm text-neutral-900">{appointment.staffName}</td>
      <td className="px-4 py-3 text-sm">
        <div className="text-neutral-900">{date}</div>
        <div className="text-neutral-600">{time}</div>
      </td>
      <td className="px-4 py-3">
        <Badge status={appointment.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onView}>
            View
          </Button>
          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <Button variant="ghost" size="sm" onClick={onReschedule}>
              Reschedule
            </Button>
          )}
          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};

const DayViewTimeline: React.FC<{
  appointments: Appointment[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}> = ({ appointments, selectedDate, onDateChange, onAppointmentClick }) => {
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm
  
  const getAppointmentsForTime = (hour: number) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.dateTime);
      const aptHour = aptDate.getHours();
      return aptDate.toDateString() === selectedDate && aptHour === hour;
    });
  };

  const navigateDay = (direction: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    onDateChange(date.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-surface border border-neutral-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateDay(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="font-medium text-neutral-900">
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <Button variant="ghost" onClick={() => navigateDay(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Timeline */}
      <div className="overflow-y-auto" style={{ height: '600px' }}>
        {hours.map((hour) => {
          const hourAppointments = getAppointmentsForTime(hour);
          
          return (
            <div key={hour} className="flex border-b border-neutral-100">
              <div className="w-20 px-4 py-3 text-sm text-neutral-600 font-medium">
                {hour}:00
              </div>
              <div className="flex-1 px-4 py-2 min-h-[60px]">
                {hourAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => onAppointmentClick(apt)}
                    className="mb-2 p-3 bg-primary-soft border border-primary rounded-lg cursor-pointer hover:bg-primary-100 transition-colors"
                    style={{ borderLeftColor: apt.staffColor, borderLeftWidth: '4px' }}
                  >
                    <div className="font-medium text-neutral-900">{apt.customerName}</div>
                    <div className="text-sm text-neutral-600">{apt.service}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {new Date(apt.dateTime).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} • {apt.staffName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WeekViewGrid: React.FC<{
  appointments: Appointment[];
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}> = ({ appointments, selectedWeek, onWeekChange, onAppointmentClick }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date(selectedWeek));
  
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.dateTime);
      return aptDate.toDateString() === date.toDateString();
    });
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
    onWeekChange(newDate.toISOString().split('T')[0]);
  };

  const days = getWeekDays();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-surface border border-neutral-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="font-medium text-neutral-900">
            Week of {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <Button variant="ghost" onClick={() => navigateWeek(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[800px]">
          {/* Day headers */}
          {dayNames.map((day, index) => (
            <div key={index} className="border-r border-neutral-200 p-2 text-center">
              <div className="text-xs font-medium text-neutral-600">{day}</div>
              <div className="text-sm font-medium text-neutral-900">
                {days[index].getDate()}
              </div>
            </div>
          ))}
          
          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const dayAppointments = getAppointmentsForDay(day);
            
            return (
              <div key={dayIndex} className="border-r border-neutral-200 min-h-[400px] p-2">
                {dayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => onAppointmentClick(apt)}
                    className="mb-2 p-2 bg-primary-soft border border-primary rounded cursor-pointer hover:bg-primary-100 transition-colors text-xs"
                    style={{ borderLeftColor: apt.staffColor, borderLeftWidth: '3px' }}
                  >
                    <div className="font-medium text-neutral-900 truncate">{apt.customerName}</div>
                    <div className="text-neutral-600 truncate">{apt.service}</div>
                    <div className="text-neutral-500">
                      {new Date(apt.dateTime).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Main Component
const AppointmentsPage: React.FC = () => {
  // State
  const [viewType, setViewType] = React.useState<ViewType>('list');
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  
  // Filters
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  
  // View-specific state
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = React.useState(new Date().toISOString().split('T')[0]);

  // API hooks
  const { appointments, isLoading, totalCount } = useAppointments({
    dateFrom,
    dateTo,
    status: selectedStatuses,
    staffId: selectedStaffId,
    search: searchQuery,
    page: currentPage,
  });
  
  const { staff } = useStaff();

  // Event handlers
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDrawerOpen(true);
  };

  const handleView = (appointment: Appointment) => {
    handleAppointmentClick(appointment);
  };

  const handleReschedule = (appointment: Appointment) => {
    // Open reschedule modal (to be implemented)
    console.log('Reschedule appointment:', appointment.id);
  };

  const handleCancel = (appointment: Appointment) => {
    // Open cancel confirmation (to be implemented)
    console.log('Cancel appointment:', appointment.id);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedStatuses([]);
    setSelectedStaffId('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = dateFrom || dateTo || selectedStatuses.length > 0 || selectedStaffId || searchQuery;

  // Render view content
  const renderViewContent = () => {
    if (isLoading) {
      if (viewType === 'list') {
        return (
          <div className="bg-surface border border-neutral-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Reference ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }, (_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3"><Skeleton variant="text" height="20px" /></td>
                      <td className="px-4 py-3"><Skeleton variant="text" height="20px" /></td>
                      <td className="px-4 py-3"><Skeleton variant="text" height="20px" /></td>
                      <td className="px-4 py-3"><Skeleton variant="text" height="20px" /></td>
                      <td className="px-4 py-3"><Skeleton variant="text" height="20px" /></td>
                      <td className="px-4 py-3"><Skeleton variant="text" height="20px" /></td>
                      <td className="px-4 py-3"><Skeleton variant="text" height="20px" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      } else {
        return (
          <div className="bg-surface border border-neutral-200 rounded-lg p-8">
            <Skeleton variant="card" height="600px" />
          </div>
        );
      }
    }

    if (appointments.length === 0) {
      return (
        <EmptyState
          title="No appointments found"
          description={hasActiveFilters ? "Try adjusting your filters" : "No appointments scheduled"}
          icon={<Calendar className="w-12 h-12 text-neutral-400" />}
          action={hasActiveFilters ? (
            <Button onClick={clearFilters}>Clear Filters</Button>
          ) : null}
        />
      );
    }

    switch (viewType) {
      case 'list':
        return (
          <div className="bg-surface border border-neutral-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Reference ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      onView={() => handleView(appointment)}
                      onReschedule={() => handleReschedule(appointment)}
                      onCancel={() => handleCancel(appointment)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalCount > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
                <div className="text-sm text-neutral-600">
                  Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-neutral-600">
                    Page {currentPage} of {Math.ceil(totalCount / 20)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage >= Math.ceil(totalCount / 20)}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'day':
        return (
          <DayViewTimeline
            appointments={appointments}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onAppointmentClick={handleAppointmentClick}
          />
        );

      case 'week':
        return (
          <WeekViewGrid
            appointments={appointments}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            onAppointmentClick={handleAppointmentClick}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Appointments</h1>
          <p className="text-neutral-600">Manage all appointments and bookings</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center bg-neutral-100 rounded-lg p-1">
          <button
            onClick={() => setViewType('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewType === 'list' 
                ? 'bg-surface text-neutral-900 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <List className="w-4 h-4 inline mr-1" />
            List
          </button>
          <button
            onClick={() => setViewType('day')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewType === 'day' 
                ? 'bg-surface text-neutral-900 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            Day
          </button>
          <button
            onClick={() => setViewType('week')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewType === 'week' 
                ? 'bg-surface text-neutral-900 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Grid className="w-4 h-4 inline mr-1" />
            Week
          </button>
        </div>
      </div>

      {/* Filters - Only show for list view */}
      {viewType === 'list' && (
        <div className="bg-surface border border-neutral-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search by name or reference ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                placeholder="From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                type="date"
                placeholder="To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            
            <StatusFilter
              selectedStatuses={selectedStatuses}
              onChange={setSelectedStatuses}
            />
            
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
            >
              <option value="">All Staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {renderViewContent()}

      {/* Appointment Drawer */}
      <AppointmentDrawer
        appointment={selectedAppointment}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppointment(null);
        }}
      />
    </div>
  );
};

export default AppointmentsPage;
