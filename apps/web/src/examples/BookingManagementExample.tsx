import React, { useState } from 'react';
import { useAppointments, useServices } from '../api/hooks';
import { appointmentsApi, servicesApi } from '../api';
import type { CreateAppointmentRequest } from '../api';

/**
 * Example component demonstrating API integration
 * Shows how to use the custom hooks and direct API calls
 */
export const BookingManagementExample: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Use custom hooks for data management
  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    pagination,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    confirmAppointment,
    completeAppointment,
    markNoShow,
    refresh: refreshAppointments,
  } = useAppointments({
    page: 1,
    limit: 10,
    serviceId: selectedService || undefined,
    staffId: selectedStaff || undefined,
  });

  const {
    services,
    loading: servicesLoading,
    createService,
    updateService,
    deleteService,
  } = useServices({ isActive: true });

  // Form state for new appointment
  const [newAppointment, setNewAppointment] = useState<CreateAppointmentRequest>({
    serviceId: '',
    staffId: '',
    customerId: '',
    startTimeUtc: '',
    notes: '',
  });

  // Handle appointment creation
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createAppointment(newAppointment);
      
      // Reset form
      setNewAppointment({
        serviceId: '',
        staffId: '',
        customerId: '',
        startTimeUtc: '',
        notes: '',
      });
      
      // Refresh appointments list
      refreshAppointments();
    } catch (error) {
      console.error('Failed to create appointment:', error);
    }
  };

  // Handle appointment status changes
  const handleStatusChange = async (appointmentId: string, action: string) => {
    try {
      switch (action) {
        case 'confirm':
          await confirmAppointment(appointmentId);
          break;
        case 'complete':
          await completeAppointment(appointmentId);
          break;
        case 'noshow':
          await markNoShow(appointmentId);
          break;
        case 'delete':
          await deleteAppointment(appointmentId);
          break;
      }
      
      refreshAppointments();
    } catch (error) {
      console.error(`Failed to ${action} appointment:`, error);
    }
  };

  // Example of direct API usage for availability
  const checkAvailability = async () => {
    if (!selectedService || !selectedStaff || !selectedDate) {
      alert('Please select service, staff, and date');
      return;
    }

    try {
      const response = await appointmentsApi.getAvailability({
        serviceId: selectedService,
        staffId: selectedStaff,
        date: selectedDate,
      });
      
      console.log('Available slots:', response.data.data.availableSlots);
    } catch (error) {
      console.error('Failed to check availability:', error);
    }
  };

  return (
    <div className="booking-management p-6">
      <h1 className="text-2xl font-bold mb-6">Booking Management Example</h1>
      
      {/* Error Display */}
      {(appointmentsError || servicesLoading) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {appointmentsError || 'Loading services...'}
        </div>
      )}

      {/* Services Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className={`p-4 border rounded cursor-pointer ${
                selectedService === service.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onClick={() => setSelectedService(service.id)}
            >
              <h3 className="font-semibold">{service.name}</h3>
              <p className="text-sm text-gray-600">{service.durationMinutes} minutes</p>
              {service.price && <p className="text-sm font-medium">${service.price}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Appointments</h2>
        
        {appointmentsLoading ? (
          <div className="text-center py-4">Loading appointments...</div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border rounded p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{appointment.referenceId}</h3>
                    <p className="text-sm text-gray-600">
                      {appointment.customer?.name} - {appointment.service?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {appointment.staff?.name} - {new Date(appointment.startTimeUtc).toLocaleString()}
                    </p>
                    <span className={`inline-block px-2 py-1 text-xs rounded ${
                      appointment.status === 'BOOKED' ? 'bg-yellow-100 text-yellow-800' :
                      appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                      appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {appointment.status === 'BOOKED' && (
                      <button
                        onClick={() => handleStatusChange(appointment.id, 'confirm')}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                      >
                        Confirm
                      </button>
                    )}
                    {appointment.status === 'CONFIRMED' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'complete')}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'noshow')}
                          className="px-3 py-1 bg-orange-500 text-white rounded text-sm"
                        >
                          No Show
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleStatusChange(appointment.id, 'delete')}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {appointment.notes && (
                  <p className="mt-2 text-sm text-gray-600">Notes: {appointment.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            <button
              disabled={pagination.page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => {/* Handle page change */}}
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => {/* Handle page change */}}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create Appointment Form */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Appointment</h2>
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Service</label>
              <select
                value={newAppointment.serviceId}
                onChange={(e) => setNewAppointment({...newAppointment, serviceId: e.target.value})}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.durationMinutes}min
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Customer ID</label>
              <input
                type="text"
                value={newAppointment.customerId}
                onChange={(e) => setNewAppointment({...newAppointment, customerId: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="Customer ID"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Staff ID</label>
              <input
                type="text"
                value={newAppointment.staffId}
                onChange={(e) => setNewAppointment({...newAppointment, staffId: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="Staff ID"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Start Time (UTC)</label>
              <input
                type="datetime-local"
                value={newAppointment.startTimeUtc}
                onChange={(e) => setNewAppointment({...newAppointment, startTimeUtc: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={newAppointment.notes}
              onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Optional notes..."
            />
          </div>
          
          <button
            type="submit"
            disabled={appointmentsLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {appointmentsLoading ? 'Creating...' : 'Create Appointment'}
          </button>
        </form>
      </div>

      {/* Direct API Example */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Direct API Usage Example</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Service</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Staff</label>
              <input
                type="text"
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Staff ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          
          <button
            onClick={checkAvailability}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Check Availability
          </button>
        </div>
      </div>
    </div>
  );
};
