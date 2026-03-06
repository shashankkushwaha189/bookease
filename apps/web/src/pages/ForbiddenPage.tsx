import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/auth.store';

const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const getHomeRoute = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'STAFF':
        return '/staff/schedule';
      case 'USER':
        return '/customer/bookings';
      default:
        return '/login';
    }
  };

  const getHomeText = () => {
    if (!user) return 'Go to Login';
    switch (user.role) {
      case 'ADMIN':
        return 'Go to Admin Dashboard';
      case 'STAFF':
        return 'Go to Staff Dashboard';
      case 'USER':
        return 'Go to Customer Dashboard';
      default:
        return 'Go to Login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-8">
          You don't have permission to access this page.
          {user && <span> Your role: <strong>{user.role}</strong></span>}
        </p>
        
        <div className="space-y-3">
          <Link to={getHomeRoute()}>
            <Button className="w-full">
              {getHomeText()}
            </Button>
          </Link>
          
          {user && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Switch Account
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
