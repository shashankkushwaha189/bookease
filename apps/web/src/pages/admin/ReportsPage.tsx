import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  Users, 
  X, 
  CheckCircle, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import { useToastStore } from '../../stores/toast.store';

// Types
interface ReportSummary {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShows: number;
  revenue?: number;
}

interface DailyBooking {
  date: string;
  total: number;
  completed: number;
}

interface ServiceBooking {
  serviceName: string;
  count: number;
}

interface StaffBooking {
  staffName: string;
  count: number;
}

interface PeakTimeData {
  day: number; // 0-6 (Mon-Sun)
  hour: number; // 8-20 (8am-8pm)
  count: number;
}

// API Hooks (mock implementations - replace with actual API calls)
const useReportSummary = (fromDate: string, toDate: string) => {
  const [data, setData] = React.useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockSummary: ReportSummary = {
          totalAppointments: 342,
          completed: 298,
          cancelled: 28,
          noShows: 16,
          revenue: 15420
        };
        
        setData(mockSummary);
      } catch (error) {
        console.error('Failed to fetch summary:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [fromDate, toDate]);

  return { data, isLoading };
};

const useDailyBookings = (fromDate: string, toDate: string) => {
  const [data, setData] = React.useState<DailyBooking[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    const fetchDailyBookings = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const mockDailyBookings: DailyBooking[] = [
          { date: '2024-02-01', total: 12, completed: 11 },
          { date: '2024-02-02', total: 15, completed: 13 },
          { date: '2024-02-03', total: 18, completed: 16 },
          { date: '2024-02-04', total: 14, completed: 12 },
          { date: '2024-02-05', total: 20, completed: 18 },
          { date: '2024-02-06', total: 16, completed: 14 },
          { date: '2024-02-07', total: 22, completed: 20 },
          { date: '2024-02-08', total: 19, completed: 17 },
          { date: '2024-02-09', total: 25, completed: 23 },
          { date: '2024-02-10', total: 21, completed: 19 },
          { date: '2024-02-11', total: 17, completed: 15 },
          { date: '2024-02-12', total: 23, completed: 21 },
          { date: '2024-02-13', total: 26, completed: 24 },
          { date: '2024-02-14', total: 28, completed: 25 },
          { date: '2024-02-15', total: 24, completed: 22 },
        ];
        
        setData(mockDailyBookings);
      } catch (error) {
        console.error('Failed to fetch daily bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyBookings();
  }, [fromDate, toDate]);

  return { data, isLoading };
};

const useServiceBookings = (fromDate: string, toDate: string) => {
  const [data, setData] = React.useState<ServiceBooking[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    const fetchServiceBookings = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockServiceBookings: ServiceBooking[] = [
          { serviceName: 'Haircut', count: 145 },
          { serviceName: 'Haircut & Beard', count: 89 },
          { serviceName: 'Color & Style', count: 67 },
          { serviceName: 'Full Service', count: 34 },
          { serviceName: 'Beard Trim', count: 23 },
        ];
        
        setData(mockServiceBookings);
      } catch (error) {
        console.error('Failed to fetch service bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceBookings();
  }, [fromDate, toDate]);

  return { data, isLoading };
};

const useStaffBookings = (fromDate: string, toDate: string) => {
  const [data, setData] = React.useState<StaffBooking[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    const fetchStaffBookings = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockStaffBookings: StaffBooking[] = [
          { staffName: 'Sarah Johnson', count: 128 },
          { staffName: 'Mike Wilson', count: 98 },
          { staffName: 'Emma Davis', count: 76 },
          { staffName: 'James Taylor', count: 40 },
        ];
        
        setData(mockStaffBookings);
      } catch (error) {
        console.error('Failed to fetch staff bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaffBookings();
  }, [fromDate, toDate]);

  return { data, isLoading };
};

const usePeakTimes = (fromDate: string, toDate: string) => {
  const [data, setData] = React.useState<PeakTimeData[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    const fetchPeakTimes = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 700));
        
        const mockPeakTimes: PeakTimeData[] = [];
        
        // Generate mock peak times data
        for (let day = 0; day < 7; day++) {
          for (let hour = 8; hour <= 20; hour++) {
            const baseCount = Math.floor(Math.random() * 15) + 2;
            const peakMultiplier = (hour >= 10 && hour <= 14) || (hour >= 16 && hour <= 18) ? 2 : 1;
            const weekendMultiplier = (day === 0 || day === 6) ? 0.7 : 1;
            
            mockPeakTimes.push({
              day,
              hour,
              count: Math.floor(baseCount * peakMultiplier * weekendMultiplier)
            });
          }
        }
        
        setData(mockPeakTimes);
      } catch (error) {
        console.error('Failed to fetch peak times:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPeakTimes();
  }, [fromDate, toDate]);

  return { data, isLoading };
};

// Components
const SummaryCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  isLoading?: boolean;
}> = ({ title, value, subtitle, icon, color, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-surface border border-neutral-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-neutral-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-neutral-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        {subtitle && (
          <div className="text-sm text-neutral-600 mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
};

const HeatmapCell: React.FC<{
  count: number;
  maxCount: number;
  day: number;
  hour: number;
}> = ({ count, maxCount, day, hour }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const intensity = maxCount > 0 ? count / maxCount : 0;
  
  // Calculate color intensity from white to brand color
  const brandColor = '#1A56DB'; // Primary brand color
  const getHeatmapColor = (intensity: number) => {
    if (intensity === 0) return '#ffffff';
    
    // Convert hex to RGB
    const r = parseInt(brandColor.slice(1, 3), 16);
    const g = parseInt(brandColor.slice(3, 5), 16);
    const b = parseInt(brandColor.slice(5, 7), 16);
    
    // Interpolate from white to brand color
    const newR = Math.round(255 - (255 - r) * intensity);
    const newG = Math.round(255 - (255 - g) * intensity);
    const newB = Math.round(255 - (255 - b) * intensity);
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  };

  const backgroundColor = getHeatmapColor(intensity);
  const textColor = intensity > 0.5 ? '#ffffff' : '#374151';

  return (
    <div
      className="relative group cursor-pointer border border-neutral-200"
      style={{ backgroundColor }}
      title={`${days[day]} ${hour}:00 - ${count} bookings`}
    >
      <div className="w-full h-8 flex items-center justify-center text-xs font-medium" style={{ color: textColor }}>
        {count > 0 && count}
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {days[day]} {hour}:00: {count} bookings
      </div>
    </div>
  );
};

// Main Component
const ReportsPage: React.FC = () => {
  const { success, error } = useToastStore();
  
  // Date range state
  const [fromDate, setFromDate] = React.useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  
  const [toDate, setToDate] = React.useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Export states
  const [isExportingAppointments, setIsExportingAppointments] = React.useState(false);
  const [isExportingCustomers, setIsExportingCustomers] = React.useState(false);

  // API hooks
  const { data: summary, isLoading: summaryLoading } = useReportSummary(fromDate, toDate);
  const { data: dailyBookings, isLoading: dailyLoading } = useDailyBookings(fromDate, toDate);
  const { data: serviceBookings, isLoading: serviceLoading } = useServiceBookings(fromDate, toDate);
  const { data: staffBookings, isLoading: staffLoading } = useStaffBookings(fromDate, toDate);
  const { data: peakTimes, isLoading: peakLoading } = usePeakTimes(fromDate, toDate);

  // Calculate derived values
  const completedRate = summary ? Math.round((summary.completed / summary.totalAppointments) * 100) : 0;
  const cancelledRate = summary ? Math.round((summary.cancelled / summary.totalAppointments) * 100) : 0;
  const noShowRate = summary ? Math.round((summary.noShows / summary.totalAppointments) * 100) : 0;

  const maxPeakCount = useMemo(() => {
    return Math.max(...peakTimes.map(pt => pt.count), 1);
  }, [peakTimes]);

  // Export handlers
  const handleExportAppointments = async () => {
    setIsExportingAppointments(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock CSV content
      const csvContent = 'Reference ID,Customer,Service,Staff,Date,Status\nBK-2024-00042,John Smith,Haircut,Sarah Johnson,2024-03-01T14:30:00,completed';
      
      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointments_${fromDate}_to_${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      success('Appointments exported successfully');
    } catch (err) {
      error('Failed to export appointments');
    } finally {
      setIsExportingAppointments(false);
    }
  };

  const handleExportCustomers = async () => {
    setIsExportingCustomers(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock CSV content
      const csvContent = 'Name,Email,Phone,Total Appointments,Last Visit\nJohn Smith,john.smith@email.com,+1 (555) 123-4567,24,2024-03-01';
      
      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_${fromDate}_to_${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      success('Customers exported successfully');
    } catch (err) {
      error('Failed to export customers');
    } finally {
      setIsExportingCustomers(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
          <p className="text-neutral-600">Analytics and insights for your business</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-40"
            />
            <span className="text-neutral-600">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* ROW 1 - Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Appointments"
          value={summary?.totalAppointments || 0}
          icon={<Calendar className="w-5 h-5" />}
          color="#1A56DB"
          isLoading={summaryLoading}
        />
        
        <SummaryCard
          title="Completed"
          value={summary?.completed || 0}
          subtitle={`${completedRate}% of total`}
          icon={<CheckCircle className="w-5 h-5" />}
          color="#10B981"
          isLoading={summaryLoading}
        />
        
        <SummaryCard
          title="Cancelled"
          value={summary?.cancelled || 0}
          subtitle={`${cancelledRate}% of total`}
          icon={<XCircle className="w-5 h-5" />}
          color="#EF4444"
          isLoading={summaryLoading}
        />
        
        <SummaryCard
          title="No-Show Rate"
          value={`${noShowRate}%`}
          subtitle={`${summary?.noShows || 0} appointments`}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={noShowRate > 10 ? '#EF4444' : noShowRate > 5 ? '#F59E0B' : '#10B981'}
          isLoading={summaryLoading}
        />
      </div>

      {/* ROW 2 - Line Chart */}
      <div className="bg-surface border border-neutral-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Daily Bookings Trend</h2>
        
        {dailyLoading ? (
          <div className="h-64">
            <Skeleton variant="card" height="100%" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyBookings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [value, name === 'total' ? 'Total Bookings' : 'Completed']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#1A56DB" 
                strokeWidth={2}
                dot={{ fill: '#1A56DB' }}
                name="Total Bookings"
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981' }}
                name="Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ROW 3 - Two Column Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Bookings */}
        <div className="bg-surface border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Bookings by Service</h2>
          
          {serviceLoading ? (
            <div className="h-64">
              <Skeleton variant="card" height="100%" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceBookings.sort((a, b) => b.count - a.count)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="serviceName" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1A56DB" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Staff Bookings */}
        <div className="bg-surface border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Bookings by Staff</h2>
          
          {staffLoading ? (
            <div className="h-64">
              <Skeleton variant="card" height="100%" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={staffBookings.sort((a, b) => b.count - a.count)}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="staffName" 
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#1A56DB" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ROW 4 - Heatmap */}
      <div className="bg-surface border border-neutral-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Peak Booking Hours</h2>
        
        {peakLoading ? (
          <div className="h-64">
            <Skeleton variant="card" height="100%" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header row */}
              <div className="grid grid-cols-14 gap-1 mb-2">
                <div className="text-xs font-medium text-neutral-600"></div>
                {Array.from({ length: 13 }, (_, i) => (
                  <div key={i} className="text-xs font-medium text-neutral-600 text-center">
                    {8 + i}:00
                  </div>
                ))}
              </div>
              
              {/* Data rows */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => (
                <div key={day} className="grid grid-cols-14 gap-1">
                  <div className="text-xs font-medium text-neutral-600">{day}</div>
                  {Array.from({ length: 13 }, (_, hourIndex) => {
                    const hour = hourIndex + 8;
                    const data = peakTimes.find(pt => pt.day === dayIndex && pt.hour === hour);
                    const count = data?.count || 0;
                    
                    return (
                      <HeatmapCell
                        key={`${dayIndex}-${hour}`}
                        count={count}
                        maxCount={maxPeakCount}
                        day={dayIndex}
                        hour={hour}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-surface border border-neutral-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Export Data</h2>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            onClick={handleExportAppointments}
            disabled={isExportingAppointments}
            loading={isExportingAppointments}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Appointments CSV
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleExportCustomers}
            disabled={isExportingCustomers}
            loading={isExportingCustomers}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Customers CSV
          </Button>
        </div>
        
        <p className="text-sm text-neutral-600 mt-2">
          Export data for the selected date range: {fromDate} to {toDate}
        </p>
      </div>
    </div>
  );
};

export default ReportsPage;
