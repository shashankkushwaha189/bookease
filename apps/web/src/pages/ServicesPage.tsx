import React from 'react';
import { Package, DollarSign, Clock, Plus, Edit, Trash2 } from 'lucide-react';

const ServicesPage: React.FC = () => {
  const services = [
    {
      id: 1,
      name: 'General Consultation',
      description: 'Routine health check and consultation',
      duration: '30 min',
      price: '$50',
      status: 'active',
      bookings: 156
    },
    {
      id: 2,
      name: 'Health Checkup',
      description: 'Comprehensive full body screening',
      duration: '60 min',
      price: '$150',
      status: 'active',
      bookings: 89
    },
    {
      id: 3,
      name: 'Follow-up',
      description: 'Brief check-in post consultation',
      duration: '15 min',
      price: '$30',
      status: 'active',
      bookings: 234
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Services
        </h1>
        <p className="text-gray-600">Manage your service offerings and pricing</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Services</h3>
              <p className="text-gray-600">3 active</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Avg Price</h3>
              <p className="text-gray-600">$76.67</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mr-4">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Avg Duration</h3>
              <p className="text-gray-600">35 min</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Bookings</h3>
              <p className="text-gray-600">479</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex items-center justify-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </button>
        
        <button className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center">
          <Edit className="w-4 h-4 mr-2" />
          Edit Categories
        </button>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {service.duration}
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {service.price}
                  </div>
                  <div className="flex items-center">
                    <Package className="w-4 h-4 mr-1" />
                    {service.bookings} bookings
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  {service.status}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Categories</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <span className="text-sm text-gray-700">Medical Consultation</span>
              <span className="text-xs text-gray-500">2 services</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <span className="text-sm text-gray-700">Health Screening</span>
              <span className="text-xs text-gray-500">1 service</span>
            </div>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-blue-600 text-sm">
              + Add Category
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Popular Services</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Follow-up</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">234 bookings</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">General Consultation</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">156 bookings</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Health Checkup</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">89 bookings</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Settings</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Service templates
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Pricing rules
            </button>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              Availability settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
