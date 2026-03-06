import React from 'react';
import { Calendar, Clock, Users, Plus, Filter } from 'lucide-react';

const AppointmentsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Appointments
        </h1>
        <p className="text-gray-600">Manage and schedule all appointments</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Today</h3>
              <p className="text-gray-600">12 appointments</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
              <p className="text-gray-600">48 appointments</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mr-4">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Patients</h3>
              <p className="text-gray-600">156 active</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">New</h3>
              <p className="text-gray-600">8 requests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex items-center justify-center">
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </button>
        
        <button className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-blue-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Appointments Management</h3>
          <p className="text-gray-600 mb-6">
            Advanced appointment scheduling and management features are coming soon.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200">
              View Calendar
            </button>
            <button className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors duration-200">
              Manage Staff
            </button>
          </div>
        </div>
      </div>

      {/* Additional Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Schedule recurring appointment
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Block time slot
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Set availability
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">New appointment booked</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Appointment rescheduled</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Staff availability updated</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Settings</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Notification preferences
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Calendar integration
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Export appointments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsPage;
