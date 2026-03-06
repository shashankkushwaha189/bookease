import React, { useState, useEffect } from 'react';
import { Search, Calendar, Edit2, Trash2, User, Clock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToastStore } from '../../stores/toast.store';
import { appointmentsApi } from '../../api/appointments';

// Types
interface Appointment {
  id: string;
  referenceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  service: string;
  duration: number;
  staffName: string;
  dateTime: string;
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const AppointmentsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [appointmentIdToDelete, setAppointmentIdToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const toastStore = useToastStore();

  // Fetch appointments
  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await appointmentsApi.getAppointments({
        fromDate: selectedDate,
        toDate: selectedDate,
        limit: 50
      });
      
      // Transform API data to frontend format
      const transformedAppointments = response.data.data.items.map((apt: any) => ({
        id: apt.id,
        referenceId: apt.referenceId,
        customerName: apt.customer?.name || 'Unknown',
        customerEmail: apt.customer?.email || '',
        customerPhone: apt.customer?.phone,
        service: apt.service?.name || 'Unknown Service',
        duration: apt.service?.duration || 30,
        staffName: apt.staff?.name || 'Unknown Staff',
        dateTime: apt.startTimeUtc,
        status: apt.status.toLowerCase(),
        notes: apt.notes,
        createdAt: apt.createdAt,
        updatedAt: apt.updatedAt
      }));
      
      setAppointments(transformedAppointments);
    } catch (err: any) {
      console.error('Failed to fetch appointments:', err);
      setError(err.message || 'Failed to load appointments');
      toastStore.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      await appointmentsApi.deleteAppointment(appointmentId);
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      toastStore.success('Appointment deleted successfully');
      setIsDeleteDialogOpen(false);
      setAppointmentIdToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete appointment:', err);
      toastStore.error('Failed to delete appointment');
    }
  };

  // Filter appointments based on search
  const filteredAppointments = appointments.filter(apt =>
    apt.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.staffName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load appointments on mount and when date changes
  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointments</h1>
        <p className="text-gray-600">Manage your appointment schedule</p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <Button onClick={() => {/* TODO: Open create modal */}}>
          <Clock className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        /* Appointments Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No appointments found
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {appointment.referenceId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                            <User className="w-3 h-3 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{appointment.customerName}</div>
                            <div className="text-sm text-gray-500">{appointment.customerEmail}</div>
                            {appointment.customerPhone && (
                              <div className="text-xs text-gray-400">{appointment.customerPhone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div>{appointment.service}</div>
                          <div className="text-xs text-gray-500">{appointment.duration} min</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {appointment.staffName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(appointment.dateTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {/* TODO: Open edit modal */}}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAppointmentIdToDelete(appointment.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        onConfirm={() => appointmentIdToDelete && handleDeleteAppointment(appointmentIdToDelete)}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setAppointmentIdToDelete(null);
        }}
      />
    </div>
  );
};

export default AppointmentsPage;
