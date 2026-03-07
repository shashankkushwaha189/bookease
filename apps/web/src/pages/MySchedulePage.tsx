import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { appointmentsApi } from '../api/appointments';
import { useToastStore } from '../stores/toast.store';
import Button from '../components/ui/Button';
import Badge, { AppointmentStatus } from '../components/ui/Badge';

const MySchedulePage: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { user } = useAuthStore();
  const toastStore = useToastStore();

  useEffect(() => {
    fetchStaffAppointments();
  }, [selectedDate]);

  const fetchStaffAppointments = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;
      
      const response = await appointmentsApi.getAppointments({
        staffId: user.id,
        fromDate: selectedDate,
        toDate: selectedDate,
        limit: 50
      });
      
      console.log('📅 Staff appointments API response:', response);
      
      // Type assertion to handle actual response structure
      const responseData = response.data as any;
      console.log('📊 Response structure:', {
        data: responseData,
        hasItems: 'items' in responseData,
        items: responseData?.items
      });
      
      // The API returns data directly with items property
      if (responseData?.items && Array.isArray(responseData.items)) {
        setAppointments(responseData.items);
      } else {
        console.warn('⚠️ No items found in response, setting empty array');
        setAppointments([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch staff appointments:', error);
      toastStore.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
          <p className="text-gray-600">View and manage your work schedule</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Schedule Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Confirmed</p>
              <p className="text-2xl font-bold text-gray-900">
                {appointments.filter(a => a.status === 'CONFIRMED').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Role</p>
              <p className="text-2xl font-bold text-gray-900">Staff</p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Today's Appointments</h3>
        </div>
        
        {appointments.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
            <p className="text-gray-500">You have no appointments for this date.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {appointments.map((appointment) => {
              const { date, time } = formatDateTime(appointment.startTimeUtc);
              return (
                <div key={appointment.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-medium text-gray-900 mr-3">
                          {appointment.service?.name || 'Service Appointment'}
                        </h3>
                        <Badge status={appointment.status as AppointmentStatus} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {date}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          {time}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-gray-400" />
                          {appointment.customer?.name || 'Customer'}
                        </div>
                      </div>

                      {appointment.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {appointment.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySchedulePage;
