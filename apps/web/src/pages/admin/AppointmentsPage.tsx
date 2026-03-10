import React, { useState, useEffect } from 'react';
import { Search, Calendar, Edit2, Trash2, User, Clock, RotateCcw, Check, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import BookingButton from '../../components/booking/BookingButton';
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
  createdBy?: string;
  bookingSource: 'Customer' | 'Staff/Admin';
}

const AppointmentsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [appointmentIdToDelete, setAppointmentIdToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [newDateTime, setNewDateTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [editNotes, setEditNotes] = useState('');

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
        updatedAt: apt.updatedAt,
        createdBy: apt.createdBy,
        bookingSource: apt.createdBy ? 'Staff/Admin' : 'Customer'
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
      await appointmentsApi.cancelBooking(appointmentId, { reason: 'Cancelled by admin' });
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      toastStore.success('Appointment cancelled successfully');
      setIsDeleteDialogOpen(false);
      setAppointmentIdToDelete(null);
    } catch (err: any) {
      console.error('Failed to cancel appointment:', err);
      toastStore.error('Failed to cancel appointment');
    }
  };

  // Reschedule appointment
  const handleRescheduleAppointment = async () => {
    if (!appointmentToReschedule || !newDateTime) return;

    try {
      const originalDate = new Date(appointmentToReschedule.dateTime);
      const newDate = new Date(newDateTime);
      const duration = appointmentToReschedule.duration || 60; // Default 60 minutes
      
      const newEndTime = new Date(newDate.getTime() + duration * 60000);

      await appointmentsApi.rescheduleBooking(appointmentToReschedule.id, {
        newStartTimeUtc: newDate.toISOString(),
        newEndTimeUtc: newEndTime.toISOString(),
        reason: rescheduleReason
      });

      // Refresh appointments
      await fetchAppointments();
      
      toastStore.success('Appointment rescheduled successfully');
      setIsRescheduleDialogOpen(false);
      setAppointmentToReschedule(null);
      setNewDateTime('');
      setRescheduleReason('');
    } catch (err: any) {
      console.error('Failed to reschedule appointment:', err);
      toastStore.error('Failed to reschedule appointment');
    }
  };

  const openRescheduleDialog = (appointment: Appointment) => {
    setAppointmentToReschedule(appointment);
    setNewDateTime(appointment.dateTime);
    setIsRescheduleDialogOpen(true);
  };

  // Edit appointment
  const handleEditAppointment = async () => {
    if (!appointmentToEdit) return;

    try {
      await appointmentsApi.addNote(appointmentToEdit.id, {
        note: editNotes
      });

      // Refresh appointments
      await fetchAppointments();
      
      toastStore.success('Appointment notes updated successfully');
      setIsEditDialogOpen(false);
      setAppointmentToEdit(null);
      setEditNotes('');
    } catch (err: any) {
      console.error('Failed to update appointment:', err);
      toastStore.error('Failed to update appointment');
    }
  };

  const openEditDialog = (appointment: Appointment) => {
    setAppointmentToEdit(appointment);
    setEditNotes(appointment.notes || '');
    setIsEditDialogOpen(true);
  };

  // Mark appointment as no-show
  const handleMarkNoShow = async (appointmentId: string) => {
    try {
      await appointmentsApi.markNoShow(appointmentId, { reason: 'Marked as no-show by admin' });
      await fetchAppointments();
      toastStore.success('Appointment marked as no-show');
    } catch (err: any) {
      console.error('Failed to mark appointment as no-show:', err);
      toastStore.error('Failed to mark appointment as no-show');
    }
  };

  // Complete appointment
  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await appointmentsApi.completeAppointment(appointmentId, { notes: 'Completed by admin' });
      await fetchAppointments();
      toastStore.success('Appointment completed successfully');
    } catch (err: any) {
      console.error('Failed to complete appointment:', err);
      toastStore.error('Failed to complete appointment');
    }
  };

  // Handle booking success
  const handleBookingSuccess = (appointment: any) => {
    // Refresh the appointments list
    fetchAppointments();
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
        <BookingButton 
          onBookingCreated={handleBookingSuccess}
          variant="primary"
        />
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
                    Booked By
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
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          appointment.bookingSource === 'Customer' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {appointment.bookingSource}
                        </span>
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
                          onClick={() => openEditDialog(appointment)}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openRescheduleDialog(appointment)}
                          className="text-yellow-600 hover:text-yellow-900 mr-2"
                          title="Reschedule"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        {appointment.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleCompleteAppointment(appointment.id)}
                            className="text-green-600 hover:text-green-900 mr-2"
                            title="Mark as Completed"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {appointment.status !== 'NO_SHOW' && appointment.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleMarkNoShow(appointment.id)}
                            className="text-orange-600 hover:text-orange-900 mr-2"
                            title="Mark as No-Show"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setAppointmentIdToDelete(appointment.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel"
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
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        onConfirm={() => appointmentIdToDelete && handleDeleteAppointment(appointmentIdToDelete)}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setAppointmentIdToDelete(null);
        }}
      />

      {/* Reschedule Modal */}
      {isRescheduleDialogOpen && appointmentToReschedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reschedule Appointment</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Customer:</strong> {appointmentToReschedule.customerName}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Service:</strong> {appointmentToReschedule.service}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Current Time:</strong> {formatDateTime(appointmentToReschedule.dateTime)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Date & Time
              </label>
              <input
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Reason for rescheduling..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsRescheduleDialogOpen(false);
                  setAppointmentToReschedule(null);
                  setNewDateTime('');
                  setRescheduleReason('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleAppointment}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditDialogOpen && appointmentToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Appointment</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Customer:</strong> {appointmentToEdit.customerName}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Service:</strong> {appointmentToEdit.service}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Date & Time:</strong> {formatDateTime(appointmentToEdit.dateTime)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add appointment notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setAppointmentToEdit(null);
                  setEditNotes('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditAppointment}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
