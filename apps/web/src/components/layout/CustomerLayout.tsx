import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Calendar, User, LogOut } from 'lucide-react';

const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Customer Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BE</span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">BookEase</h1>
                <p className="text-xs text-gray-500">Customer Portal</p>
              </div>
            </div>
            
            {/* Customer Navigation */}
            <nav className="flex items-center space-x-6">
              <Link 
                to="/customer/bookings" 
                className="flex items-center text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                <Calendar className="w-4 h-4 mr-2" />
                My Bookings
              </Link>
              <Link 
                to="/customer/profile" 
                className="flex items-center text-gray-500 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Link>
              <Link 
                to="/book" 
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Appointment
              </Link>
              
              {/* User Menu */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500">Customer</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-500 hover:text-red-600 p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Customer Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center text-gray-500 text-sm mb-4 md:mb-0">
              <p>&copy; 2026 BookEase. All rights reserved.</p>
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-500 hover:text-gray-700">Privacy Policy</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">Terms of Service</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
