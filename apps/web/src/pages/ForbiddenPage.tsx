import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-danger mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Access Denied</h2>
        <p className="text-neutral-600 mb-8">You don't have permission to access this page.</p>
        <Link to="/admin/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};

export default ForbiddenPage;
