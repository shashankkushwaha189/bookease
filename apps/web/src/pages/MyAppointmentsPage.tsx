import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertTriangle, Filter } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { appointmentsApi } from '../api/appointments';
import { useToastStore } from '../stores/toast.store';
import Button from '../components/ui/Button';
import Badge, { AppointmentStatus } from '../components/ui/Badge';
import Input from '../components/ui/Input';

const MyAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();
  const toastStore = useToastStore();

  useEffect(() => {
    fetchStaffAppointments();
  }, [statusFilter]);

  const fetchStaffAppointments = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;
      
      const response = await appointmentsApi.getAppointments({
        staffId: user.id,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100
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
      toastStore.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      switch (status) {
        case 'COMPLETED':
          await appointmentsApi.completeAppointment(appointmentId);
          toastStore.success('Appointment completed successfully');
          break;
        case 'CANCELLED':
          await appointmentsApi.deleteAppointment(appointmentId);
          toastStore.success('Appointment cancelled successfully');
          break;
        case 'CONFIRMED':
          await appointmentsApi.confirmAppointment(appointmentId);
          toastStore.success('Appointment confirmed successfully');
          break;
        case 'NO_SHOW':
          await appointmentsApi.markNoShow(appointmentId);
          toastStore.success('Appointment marked as no-show');
          break;
        default:
          throw new Error('Invalid status');
      }
      await fetchStaffAppointments();
    } catch (error: any) {
      console.error('Failed to update appointment:', error);
      toastStore.error('Failed to update appointment');
    }
  };

  const filteredAppointments = appointments.filter(apt =>
    apt.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.service?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'NO_SHOW': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
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
          <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
          <p className="text-gray-600">Manage your appointments and customer interactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="BOOKED">Booked</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NO_SHOW">No Show</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
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
            <div className="p-3 bg-blue-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {appointments.filter(a => a.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">
                {appointments.filter(a => a.status === 'CANCELLED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Appointments</h3>
        </div>
        
        {filteredAppointments.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
            <p className="text-gray-500">No appointments match your current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAppointments.map((appointment) => {
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-gray-400" />
                          {appointment.customer?.name || 'Customer'}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {date}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          {time}
                        </div>
                        <div className="flex items-center">
                          {getStatusIcon(appointment.status)}
                          <span className="ml-1">{appointment.status}</span>
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
                    
                    {/* Action buttons for different appointment statuses */}
                    <div className="flex items-center space-x-2 ml-4">
                      {appointment.status === 'BOOKED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(appointment.id, 'CONFIRMED')}
                        >
                          Confirm
                        </Button>
                      )}
                      {appointment.status === 'CONFIRMED' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(appointment.id, 'COMPLETED')}
                          >
                            Complete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(appointment.id, 'NO_SHOW')}
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          >
                            No Show
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(appointment.id, 'CANCELLED')}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        </>
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

export default MyAppointmentsPage;
