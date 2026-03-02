import React from 'react';
import { Outlet } from 'react-router-dom';

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Business Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-soft" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">BookEase</h1>
            <p className="text-neutral-600">Professional Appointment Booking</p>
          </div>

          {/* Page Content */}
          <div className="bg-surface rounded-lg shadow-sm border border-neutral-200 p-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Footer with Trust Signals */}
      <footer className="border-t border-neutral-200 bg-surface py-6">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-center space-x-2 text-sm text-neutral-600">
            <svg className="w-4 h-4 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure booking</span>
            <span className="text-neutral-400">•</span>
            <span>Your data is protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
