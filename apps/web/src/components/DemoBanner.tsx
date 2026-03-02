import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';
import { useToastStore } from '../stores/toast.store';

// API Hook (mock implementation - replace with actual API call)
const useDemoReset = () => {
  const [isResetting, setIsResetting] = React.useState(false);
  const { success, error } = useToastStore();

  const resetDemoData = async () => {
    setIsResetting(true);
    try {
      // Mock API call - replace with actual API
      // POST /api/demo/reset
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      success('Demo data reset successfully');
      
      // Reload the page to show fresh data
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset demo data:', err);
      error('Failed to reset demo data');
    } finally {
      setIsResetting(false);
    }
  };

  return { resetDemoData, isResetting };
};

// Main Component
const DemoBanner: React.FC = () => {
  const { resetDemoData, isResetting } = useDemoReset();
  const [isAdmin, setIsAdmin] = React.useState(false);

  // Check if user is admin (mock implementation - replace with actual auth check)
  useEffect(() => {
    // In a real implementation, this would check the user's role
    // For demo purposes, we'll simulate admin check
    const checkAdminStatus = () => {
      // Mock admin check - replace with actual auth logic
      const userRole = localStorage.getItem('userRole');
      setIsAdmin(userRole === 'admin');
    };

    checkAdminStatus();
    
    // Listen for auth changes
    const handleStorageChange = () => {
      checkAdminStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Only show in demo mode
  if (!import.meta.env.VITE_DEMO_MODE) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 border-b-2 border-amber-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-4 h-4 text-amber-900" />
            <span className="text-sm font-medium text-amber-900">
              Demo Mode — Data resets daily at midnight
            </span>
          </div>
          
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={resetDemoData}
              disabled={isResetting}
              loading={isResetting}
              className="bg-amber-600 hover:bg-amber-700 text-amber-900 border-amber-700"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset Demo Data
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
