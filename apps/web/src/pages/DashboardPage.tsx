import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  BarChart3,
  Activity,
  Settings,
  Plus,
  ChevronRight,
  Home
} from 'lucide-react';
import dashboardApi, { DashboardSummary, Appointment, PeakTime } from '../api/dashboard';
import { useAuthStore } from '../stores/auth.store';
import Badge from '../components/ui/Badge';

// Enhanced Summary Card with trend and sparkline
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  trend?: number;
  color?: string;
  sparkline?: number[];
}> = ({ icon, title, value, subtitle, trend, color = 'blue', sparkline }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border-blue-200 shadow-lg',
    green: 'bg-gradient-to-br from-green-50 to-green-100 text-green-600 border-green-200 shadow-lg',
    yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-600 border-yellow-200 shadow-lg',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 border-purple-200 shadow-lg',
    red: 'bg-gradient-to-br from-red-50 to-red-100 text-red-600 border-red-200 shadow-lg'
  };

  // Simple sparkline visualization
  const renderSparkline = () => {
    if (!sparkline || sparkline.length < 2) return null;
    
    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min || 1;
    
    const points = sparkline.map((value, index) => {
      const x = (index / (sparkline.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="60" height="20" className="ml-2">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke={`url(#gradient-${color})`}
          strokeWidth="2"
          className="opacity-80"
        />
      </svg>
    );
  };

  return (
    <div className={`group relative bg-gradient-to-br from-white to-gray-50/30 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:border-gray-200/80`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${colorClasses[color]}`}>
          <div className="relative">
            {icon}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {trend && (
            <div className={`flex items-center text-sm font-medium px-3 py-1 rounded-full ${
              trend > 0 ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-success' : 
              'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-danger'
            }`}>
              <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}%
            </div>
          )}
          {sparkline && renderSparkline()}
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          {value}
        </div>
        <div className="text-sm text-gray-600 font-medium">{subtitle}</div>
      </div>
    </div>
  );
};

// Sidebar Navigation Component
const Sidebar: React.FC<{ activeItem: string; onNavigate: (item: string) => void }> = ({ activeItem, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', icon: <Home className="w-5 h-5" />, label: 'Dashboard' },
    { id: 'appointments', icon: <Calendar className="w-5 h-5" />, label: 'Appointments' },
    { id: 'staff', icon: <Users className="w-5 h-5" />, label: 'Staff' },
    { id: 'analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' },
    { id: 'reports', icon: <Activity className="w-5 h-5" />, label: 'Reports' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  return (
    <div className="w-64 h-full bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">BookEase</h2>
            <p className="text-gray-400 text-xs">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  activeItem === item.id
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-gray-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">Admin User</p>
            <p className="text-gray-400 text-xs">admin@demo.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [peakTimes, setPeakTimes] = useState<PeakTime[]>([]);
  const [staffUtilization, setStaffUtilization] = useState<{ percentage: number; activeStaff: number }>({ percentage: 0, activeStaff: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  // Fetch data
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await dashboardApi.getSummary();
        setSummary(data);
      } catch (error) {
        console.error('Failed to fetch dashboard summary:', error);
      } finally {
        setSummaryLoading(false);
      }
    };

    const fetchAppointments = async () => {
      try {
        const data = await dashboardApi.getTodayAppointments();
        setAppointments(data);
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
      } finally {
        setAppointmentsLoading(false);
      }
    };

    const fetchPeakTimes = async () => {
      try {
        const data = await dashboardApi.getPeakTimes();
        setPeakTimes(data);
      } catch (error) {
        console.error('Failed to fetch peak times:', error);
      }
    };

    const fetchStaffUtilization = async () => {
      try {
        const data = await dashboardApi.getStaffUtilization();
        setStaffUtilization(data);
      } catch (error) {
        console.error('Failed to fetch staff utilization:', error);
      }
    };

    fetchSummary();
    fetchAppointments();
    fetchPeakTimes();
    fetchStaffUtilization();
  }, []);

  const handleNavigation = (section: string) => {
    setActiveSection(section);
    // Here you can add actual navigation logic
    console.log('Navigate to:', section);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar activeItem={activeSection} onNavigate={handleNavigation} />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeSection === 'dashboard' && 'Dashboard'}
                {activeSection === 'appointments' && 'Appointments'}
                {activeSection === 'staff' && 'Staff Management'}
                {activeSection === 'analytics' && 'Analytics'}
                {activeSection === 'reports' && 'Reports'}
                {activeSection === 'settings' && 'Settings'}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium shadow-primary hover:shadow-lg transition-all duration-200">
                <Plus className="w-4 h-4 mr-2" />
                New Appointment
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium border border-gray-300 hover:from-gray-200 hover:to-gray-300 transition-all duration-200">
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {activeSection === 'dashboard' && (
            <div>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <SummaryCard
                  icon={<Calendar className="w-6 h-6 text-blue-600" />}
                  title="Today's Bookings"
                  value={summary?.totalAppointments || 0}
                  subtitle="Total appointments"
                  trend={5}
                  color="blue"
                  sparkline={[3, 5, 4, 7, 6, 8, 5]}
                />
                <SummaryCard
                  icon={<Users className="w-6 h-6 text-green-600" />}
                  title="Confirmed"
                  value={summary?.completedCount || 0}
                  subtitle="Completed appointments"
                  trend={12}
                  color="green"
                  sparkline={[2, 3, 4, 3, 5, 4, 6]}
                />
                <SummaryCard
                  icon={<Clock className="w-6 h-6 text-yellow-600" />}
                  title="Cancelled"
                  value={summary?.cancelledCount || 0}
                  subtitle="Cancelled appointments"
                  trend={-3}
                  color="yellow"
                  sparkline={[4, 3, 3, 2, 3, 2, 1]}
                />
                <SummaryCard
                  icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
                  title="Show Rate"
                  value={`${Math.round(100 - (summary?.noShowRate || 0))}%`}
                  subtitle={`No-show rate: ${Math.round(summary?.noShowRate || 0)}%`}
                  trend={8}
                  color={summary?.noShowRate && summary.noShowRate > 10 ? 'red' : 'green'}
                  sparkline={[85, 87, 86, 88, 90, 89, 91]}
                />
              </div>

              {/* Today's Appointments */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Today's Appointments</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All
                  </button>
                </div>
                
                {appointmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments today</h3>
                    <p className="text-gray-600">You're all caught up! No appointments scheduled for today.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.slice(0, 5).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => console.log('View appointment:', appointment)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="text-sm font-medium text-gray-900 w-16">
                                {new Date(appointment.startTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {appointment.customer?.name || 'Unknown Customer'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {appointment.service?.name || 'Unknown Service'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-sm text-gray-600">
                              {appointment.staff?.name || 'Unknown Staff'}
                            </div>
                            <Badge status={appointment.status.toLowerCase() as any} />
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Other sections would go here */}
          {activeSection !== 'dashboard' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600">This section is under development.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
