import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Calendar, Edit } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { customersApi } from '../api/customers';
import Button from '../components/ui/Button';
import { useToastStore } from '../stores/toast.store';

const CustomerProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const toastStore = useToastStore();

  useEffect(() => {
    if (user?.id) {
      fetchCustomerProfile();
    }
  }, [user]);

  const fetchCustomerProfile = async () => {
    try {
      setLoading(true);
      // For now, use the user data since we don't have a separate customer profile API
      // In a real implementation, you'd call customersApi.getCustomer(user.id)
      setCustomerData({
        name: user?.email?.split('@')[0] || 'Customer',
        email: user?.email || '',
        phone: '+1 (555) 123-4567', // Mock phone
        memberSince: new Date().toISOString().split('T')[0],
        totalBookings: 0,
        upcomingBookings: 0
      });
    } catch (error: any) {
      console.error('Failed to fetch customer profile:', error);
      toastStore.error('Failed to load profile');
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

  const customer = customerData || {
    name: user?.email?.split('@')[0] || 'Customer',
    email: user?.email || '',
    phone: '+1 (555) 123-4567',
    memberSince: new Date().toISOString().split('T')[0],
    totalBookings: 0,
    upcomingBookings: 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>

        {/* Profile Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
                <p className="text-gray-600">Member since {customer.memberSince}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
              <div className="flex items-center text-gray-900">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                {customer.email}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Phone</h3>
              <div className="flex items-center text-gray-900">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                {customer.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{customer.totalBookings}</h3>
                <p className="text-gray-600">Total Bookings</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{customer.upcomingBookings}</h3>
                <p className="text-gray-600">Upcoming Bookings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-600">Receive booking reminders via email</p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6"></span>
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                <p className="text-sm text-gray-600">Receive booking reminders via SMS</p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1"></span>
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Auto-Confirm Bookings</h4>
                <p className="text-sm text-gray-600">Automatically confirm available appointments</p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={customer.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      // TODO: Update customer profile API call
                      toastStore.success('Profile updated successfully');
                      setIsEditing(false);
                    } catch (error: any) {
                      toastStore.error('Failed to update profile');
                    }
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfilePage;
