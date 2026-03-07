import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Plus, AlertCircle, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi } from '../api/appointments';
import { useAuthStore } from '../stores/auth.store';
import { useToastStore } from '../stores/toast.store';
import Badge, { AppointmentStatus } from '../components/ui/Badge';
import Button from '../components/ui/Button';

const CustomerBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const toastStore = useToastStore();

  useEffect(() => {
    fetchCustomerBookings();
  }, []);

  const fetchCustomerBookings = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;
      
      // Use the customer appointments API
      const response = await appointmentsApi.getAppointments({
        customerId: user.id,
        fromDate: new Date().toISOString().split('T')[0],
        limit: 50
      });
      
      console.log('📅 Customer bookings API response:', response);
      
      // Type assertion to handle the actual response structure
      const responseData = response.data as any;
      console.log('📊 Response structure:', {
        data: responseData,
        hasItems: 'items' in responseData,
        items: responseData?.items
      });
      
      // The API returns data directly with items property
      if (responseData?.items && Array.isArray(responseData.items)) {
        setBookings(responseData.items);
      } else {
        console.warn('⚠️ No items found in response, setting empty array');
        setBookings([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch bookings:', error);
      toastStore.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await appointmentsApi.deleteAppointment(bookingId);
      toastStore.success('Booking cancelled successfully');
      await fetchCustomerBookings(); // Refresh bookings
    } catch (error: any) {
      console.error('Failed to cancel booking:', error);
      toastStore.error('Failed to cancel booking');
    }
  };

  const handleBookAppointment = () => {
    // Navigate to booking page with tenant slug
    navigate('/demo-clinic/book');
  };

  const handleViewProfile = () => {
    navigate('/customer/profile');
  };

  const handleReschedule = (bookingId: string) => {
    // Navigate to booking page with reschedule parameter and tenant slug
    navigate(`/demo-clinic/book?reschedule=${bookingId}`);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Customer Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
              <p className="text-gray-600">Manage your appointments and bookings</p>
              <div className="mt-2 text-sm text-gray-500">
                Welcome back, <span className="font-medium">{user?.email}</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={handleBookAppointment}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
              <Button 
                variant="outline"
                onClick={handleViewProfile}
              >
                <User className="w-4 h-4 mr-2" />
                My Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bookings.filter(b => b.status === 'CONFIRMED').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Account Type</p>
                <p className="text-2xl font-bold text-gray-900">Customer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Appointments</h2>
          </div>
          
          {bookings.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments yet</h3>
              <p className="text-gray-500 mb-4">You haven't booked any appointments yet.</p>
              <Button onClick={handleBookAppointment} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Book Your First Appointment
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {bookings.map((booking) => {
                const { date, time } = formatDateTime(booking.startTimeUtc);
                return (
                  <div key={booking.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-medium text-gray-900 mr-3">
                            {booking.service?.name || 'Service Appointment'}
                          </h3>
                          <Badge status={booking.status as AppointmentStatus} />
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
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            {booking.staff?.name || 'Staff Member'}
                          </div>
                        </div>

                        {booking.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Notes:</span> {booking.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {booking.status === 'CONFIRMED' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReschedule(booking.id)}
                            >
                              Reschedule
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelBooking(booking.id)}
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

        {/* Customer Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">Need Help?</h3>
              <p className="text-blue-700 text-sm mb-3">
                If you need to make changes to your appointments or have any questions, 
                please contact our support team.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 text-sm">
                <div className="flex items-center text-blue-700">
                  <Phone className="w-4 h-4 mr-2" />
                  +1 (555) 123-4567
                </div>
                <div className="flex items-center text-blue-700">
                  <Mail className="w-4 h-4 mr-2" />
                  support@bookease.com
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerBookingsPage;
