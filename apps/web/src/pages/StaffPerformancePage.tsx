import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Award, Target } from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import Button from '../components/ui/Button';

interface PerformanceMetrics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShows: number;
  averageRating: number;
  totalRevenue: number;
  completionRate: number;
  punctualityRate: number;
  customerSatisfaction: number;
}

interface MonthlyStats {
  month: string;
  appointments: number;
  revenue: number;
  rating: number;
}

const StaffPerformancePage: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');
  const toastStore = useToastStore();

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with real API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMetrics: PerformanceMetrics = {
        totalAppointments: 156,
        completedAppointments: 142,
        cancelledAppointments: 8,
        noShows: 6,
        averageRating: 4.8,
        totalRevenue: 12480,
        completionRate: 91.0,
        punctualityRate: 96.5,
        customerSatisfaction: 94.2
      };

      const mockMonthlyStats: MonthlyStats[] = [
        { month: 'Jan', appointments: 45, revenue: 3600, rating: 4.7 },
        { month: 'Feb', appointments: 52, revenue: 4160, rating: 4.8 },
        { month: 'Mar', appointments: 59, revenue: 4720, rating: 4.9 },
      ];

      setMetrics(mockMetrics);
      setMonthlyStats(mockMonthlyStats);
    } catch (error: any) {
      console.error('Failed to fetch performance data:', error);
      toastStore.error('Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Unable to load performance data</p>
          <Button onClick={fetchPerformanceData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Performance</h2>
          <p className="text-gray-600">Track your performance metrics and achievements</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="1year">Last Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalAppointments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.completionRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageRating}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Stats */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Appointment Breakdown</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-700">Completed</span>
              </div>
              <span className="font-semibold text-gray-900">{metrics.completedAppointments}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-gray-700">Cancelled</span>
              </div>
              <span className="font-semibold text-gray-900">{metrics.cancelledAppointments}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                <span className="text-gray-700">No Shows</span>
              </div>
              <span className="font-semibold text-gray-900">{metrics.noShows}</span>
            </div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Performance Indicators</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Punctuality</span>
                <span className="font-semibold text-gray-900">{metrics.punctualityRate}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className={`bg-brand-600 h-2 rounded-full transition-all duration-300 ease-out`}
                  style={{ width: `${metrics.punctualityRate}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Customer Satisfaction</span>
                <span className="font-semibold text-gray-900">{metrics.customerSatisfaction}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className={`bg-success-600 h-2 rounded-full transition-all duration-300 ease-out`}
                  style={{ width: `${metrics.customerSatisfaction}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Completion Rate</span>
                <span className="font-semibold text-gray-900">{metrics.completionRate}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className={`bg-brand-600 h-2 rounded-full transition-all duration-300 ease-out`}
                  style={{ width: `${metrics.completionRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {monthlyStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{stat.month}</h4>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>{stat.appointments} appointments</span>
                    <span>${stat.revenue.toLocaleString()} revenue</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    <Award className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="font-semibold text-gray-900">{stat.rating}</span>
                  </div>
                  <p className="text-xs text-gray-500">Average rating</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Achievements</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Award className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Top Performer</h4>
                <p className="text-sm text-gray-600">Highest completion rate this month</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Rising Star</h4>
                <p className="text-sm text-gray-600">20% improvement in ratings</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
              <Users className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Customer Favorite</h4>
                <p className="text-sm text-gray-600">5-star ratings from 10+ customers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPerformancePage;
