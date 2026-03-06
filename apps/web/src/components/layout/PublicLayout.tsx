import React from 'react';

type PublicLayoutProps = {
  children: React.ReactNode;
};

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {children}
      </div>

      <footer className="mt-6 text-xs text-gray-600">
        <span>Secure booking</span>
        <span className="text-gray-400"> • </span>
        <span>Your data is protected</span>
      </footer>
    </div>
  );
};

export default PublicLayout;
