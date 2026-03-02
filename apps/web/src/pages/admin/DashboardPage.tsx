import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  UserX, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Plus,
  ChevronRight
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

// Types
interface DashboardSummary {
  todaysBookings: {
    total: number;
    confirmed: number;
    pending: number;
    trend: number; // percentage change vs yesterday
  };
  upcomingBookings: {
    count: number;
    nextAppointment?: {
      time: string;
      customerName: string;
    };
  };
  noShowRate: {
    percentage: number;
    total: number;
    noShows: number;
  };
  staffUtilization: {
    percentage: number;
    activeStaff: number;
  };
}

interface Appointment {
  id: string;
  time: string;
  customerName: string;
  service: string;
  staff: string;
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
}

interface Insight {
  type: 'info' | 'warning' | 'success';
  text: string;
}

// API Hooks (mock implementations - replace with actual API calls)
const useDashboardSummary = (date: string) => {
  const [data, setData] = React.useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSummary = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockData: DashboardSummary = {
          todaysBookings: {
            total: 24,
            confirmed: 18,
            pending: 6,
            trend: 12.5
          },
          upcomingBookings: {
            count: 3,
            nextAppointment: {
              time: '2:30 PM',
              customerName: 'Sarah'
            }
          },
          noShowRate: {
            percentage: 8.3,
            total: 24,
            noShows: 2
          },
          staffUtilization: {
            percentage: 78,
            activeStaff: 5
          }
        };
        
        setData(mockData);
      } catch (error) {
        console.error('Failed to fetch dashboard summary:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [date]);

  return { data, isLoading };
};

const useTodayAppointments = () => {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAppointments = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const mockAppointments: Appointment[] = [
          {
            id: '1',
            time: '9:00 AM',
            customerName: 'John Smith',
            service: 'Haircut',
            staff: 'Sarah Johnson',
            status: 'confirmed'
          },
          {
            id: '2',
            time: '9:30 AM',
            customerName: 'Emma Davis',
            service: 'Color & Style',
            staff: 'Mike Wilson',
            status: 'confirmed'
          },
          {
            id: '3',
            time: '10:00 AM',
            customerName: 'Robert Brown',
            service: 'Beard Trim',
            staff: 'Sarah Johnson',
            status: 'booked'
          },
          {
            id: '4',
            time: '10:30 AM',
            customerName: 'Lisa Anderson',
            service: 'Haircut',
            staff: 'Mike Wilson',
            status: 'confirmed'
          },
          {
            id: '5',
            time: '11:00 AM',
            customerName: 'James Taylor',
            service: 'Full Service',
            staff: 'Sarah Johnson',
            status: 'completed'
          }
        ];
        
        setAppointments(mockAppointments);
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  return { appointments, isLoading };
};

const useWeekPeakTimes = () => {
  const [insights, setInsights] = React.useState<Insight[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchInsights = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 700));
        
        const mockInsights: Insight[] = [
          {
            type: 'info',
            text: 'Peak time: Tuesday 10-11am'
          },
          {
            type: 'success',
            text: 'Haircut is most booked service this week'
          },
          {
            type: 'warning',
            text: 'No-show rate increased 5% vs last week'
          }
        ];
        
        setInsights(mockInsights);
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, []);

  return { insights, isLoading };
};

// Components
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  trend?: number;
  isLoading?: boolean;
  color?: 'green' | 'amber' | 'red';
}> = ({ icon, title, value, subtitle, trend, isLoading, color }) => {
  if (isLoading) {
    return (
      <div className="bg-surface border border-neutral-200 rounded-lg p-6">
        <Skeleton variant="card" height="96px" />
      </div>
    );
  }

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend > 0 ? (
      <TrendingUp className="w-4 h-4 text-success" />
    ) : (
      <TrendingDown className="w-4 h-4 text-danger" />
    );
  };

  const getTrendColor = () => {
    if (!trend) return 'text-neutral-600';
    return trend > 0 ? 'text-success' : 'text-danger';
  };

  return (
    <div className="bg-surface border border-neutral-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className="p-2 bg-primary-soft rounded-lg text-primary mr-3">
              {icon}
            </div>
            <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">{value}</div>
          <div className="flex items-center text-sm text-neutral-600">
            <span>{subtitle}</span>
            {trend && (
              <span className={`flex items-center ml-2 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="ml-1">{Math.abs(trend)}%</span>
              </span>
            )}
          </div>
        </div>
        {color && (
          <div className={`w-3 h-3 rounded-full ${
            color === 'green' ? 'bg-success' : 
            color === 'amber' ? 'bg-warning' : 'bg-danger'
          }`} />
        )}
      </div>
    </div>
  );
};

const InsightChip: React.FC<{ insight: Insight }> = ({ insight }) => {
  const getColorClasses = () => {
    switch (insight.type) {
      case 'success':
        return 'bg-success-soft text-success border-success';
      case 'warning':
        return 'bg-warning-soft text-warning border-warning';
      default:
        return 'bg-primary-soft text-primary border-primary';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getColorClasses()}`}>
      {insight.text}
    </div>
  );
};

const AppointmentRow: React.FC<{ appointment: Appointment; onClick: () => void }> = ({ 
  appointment, 
  onClick 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'confirmed';
      case 'booked': return 'booked';
      case 'completed': return 'completed';
      case 'cancelled': return 'cancelled';
      case 'no_show': return 'no_show';
      default: return 'booked';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-surface border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 cursor-pointer transition-colors duration-150"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-neutral-900 w-16">
              {appointment.time}
            </div>
            <div>
              <div className="font-medium text-neutral-900">{appointment.customerName}</div>
              <div className="text-sm text-neutral-600">{appointment.service}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-neutral-600">{appointment.staff}</div>
          <Badge status={getStatusColor(appointment.status)} />
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </div>
      </div>
    </div>
  );
};

const MiniCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const getDaysInWeek = () => {
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

  const handleDayClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    navigate(`/admin/calendar?date=${dateStr}`);
  };

  const handleQuickBook = () => {
    // Open new appointment modal (to be implemented)
    console.log('Open quick book modal');
  };

  const days = getDaysInWeek();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-surface border border-neutral-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">This Week</h3>
        <Button variant="ghost" size="sm" onClick={handleQuickBook}>
          <Plus className="w-4 h-4 mr-1" />
          Quick Book
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-4">
        {dayNames.map((day, index) => (
          <div key={index} className="text-center text-xs font-medium text-neutral-600 py-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => {
          const isToday = date.toDateString() === new Date().toDateString();
          const hasAppointments = Math.random() > 0.3; // Mock - replace with actual data
          
          return (
            <button
              key={index}
              onClick={() => handleDayClick(date)}
              className={`relative p-2 rounded-lg text-center transition-colors duration-150 ${
                isToday 
                  ? 'bg-primary text-primary-soft' 
                  : 'hover:bg-neutral-100 text-neutral-900'
              }`}
            >
              <div className="text-sm font-medium">{date.getDate()}</div>
              {hasAppointments && (
                <div className={`w-1 h-1 rounded-full mx-auto mt-1 ${
                  isToday ? 'bg-primary-soft' : 'bg-primary'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Main Dashboard Component
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(today);
  const { appointments, isLoading: appointmentsLoading } = useTodayAppointments();
  const { insights, isLoading: insightsLoading } = useWeekPeakTimes();

  const handleAppointmentClick = (appointmentId: string) => {
    // Open appointment detail drawer (to be implemented)
    console.log('Open appointment:', appointmentId);
  };

  const getNoShowColor = (percentage: number) => {
    if (percentage < 10) return 'green';
    if (percentage <= 20) return 'amber';
    return 'red';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* SECTION 1 - Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          icon={<Calendar className="w-5 h-5" />}
          title="Today's Bookings"
          value={summary?.todaysBookings.total || 0}
          subtitle={`${summary?.todaysBookings.confirmed || 0} confirmed, ${summary?.todaysBookings.pending || 0} pending`}
          trend={summary?.todaysBookings.trend}
          isLoading={summaryLoading}
        />
        
        <SummaryCard
          icon={<Clock className="w-5 h-5" />}
          title="Upcoming (Next 2 Hours)"
          value={summary?.upcomingBookings.count || 0}
          subtitle={summary?.upcomingBookings.nextAppointment 
            ? `${summary.upcomingBookings.nextAppointment.time} with ${summary.upcomingBookings.nextAppointment.customerName}`
            : 'No upcoming appointments'
          }
          isLoading={summaryLoading}
        />
        
        <SummaryCard
          icon={<UserX className="w-5 h-5" />}
          title="No-Show Rate (This Week)"
          value={`${summary?.noShowRate.percentage || 0}%`}
          subtitle={`${summary?.noShowRate.noShows || 0} of ${summary?.noShowRate.total || 0} appointments`}
          isLoading={summaryLoading}
          color={summary ? getNoShowColor(summary.noShowRate.percentage) : undefined}
        />
        
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          title="Staff Utilization"
          value={`${summary?.staffUtilization.percentage || 0}%`}
          subtitle={`${summary?.staffUtilization.activeStaff || 0} staff active today`}
          isLoading={summaryLoading}
        />
      </div>

      {/* SECTION 2 - Insights Strip */}
      {!insightsLoading && insights.length > 0 && (
        <div className="bg-surface border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Key Insights</h3>
          <div className="flex flex-wrap gap-3">
            {insights.map((insight, index) => (
              <InsightChip key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3 - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT - Today's Appointments (60%) */}
        <div className="lg:col-span-3">
          <div className="bg-surface border border-neutral-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Today's Appointments</h3>
            
            <Suspense fallback={<Skeleton variant="card" height="400px" />}>
              {appointmentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Skeleton key={index} variant="card" height="80px" />
                  ))}
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      onClick={() => handleAppointmentClick(appointment.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No appointments today"
                  description="Enjoy the quiet! Maybe it's time for some admin tasks."
                  icon={<Calendar className="w-12 h-12 text-neutral-400" />}
                />
              )}
            </Suspense>
          </div>
        </div>

        {/* RIGHT - Mini Calendar (40%) */}
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton variant="card" height="300px" />}>
            <MiniCalendar />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
