import React from 'react';
import { Users, Calendar, Clock, Mail, Phone, Plus, Edit, Trash2 } from 'lucide-react';

const StaffPage: React.FC = () => {
  const staff = [
    {
      id: 1,
      name: 'Dr. Priya Sharma',
      email: 'priya@healthfirst.demo',
      phone: '+91-98765-43210',
      role: 'Senior Physician',
      status: 'active',
      appointments: 45,
      nextAvailable: 'Today, 2:00 PM'
    },
    {
      id: 2,
      name: 'Dr. Rohan Mehta',
      email: 'rohan@healthfirst.demo',
      phone: '+91-98765-43211',
      role: 'Diagnostics Specialist',
      status: 'active',
      appointments: 32,
      nextAvailable: 'Tomorrow, 10:00 AM'
    },
    {
      id: 3,
      name: 'Dr. Sarah Johnson',
      email: 'sarah@healthfirst.demo',
      phone: '+91-98765-43212',
      role: 'General Practitioner',
      status: 'on_leave',
      appointments: 28,
      nextAvailable: 'Next Monday'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Staff Management
        </h1>
        <p className="text-gray-600">Manage your team and their schedules</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Staff</h3>
              <p className="text-gray-600">3 members</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Today</h3>
              <p className="text-gray-600">2 available</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mr-4">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">On Leave</h3>
              <p className="text-gray-600">1 member</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
              <p className="text-gray-600">105 appointments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex items-center justify-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </button>
        
        <button className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center">
          <Calendar className="w-4 h-4 mr-2" />
          View Schedule
        </button>
      </div>

      {/* Staff List */}
      <div className="space-y-4">
        {staff.map((member) => (
          <div key={member.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-600">{member.role}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {member.email}
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {member.phone}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {member.appointments} appointments
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {member.nextAvailable}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                  member.status === 'active' 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}>
                  {member.status.replace('_', ' ')}
                </span>
                <button className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Departments</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <span className="text-sm text-gray-700">Medical Consultation</span>
              <span className="text-xs text-gray-500">2 staff</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <span className="text-sm text-gray-700">Diagnostics</span>
              <span className="text-xs text-gray-500">1 staff</span>
            </div>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-blue-600 text-sm">
              + Add Department
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Schedule Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Today</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">2 available</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Tomorrow</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">3 available</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">This Week</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">1 on leave</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Set availability
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Manage permissions
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Export schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPage;
