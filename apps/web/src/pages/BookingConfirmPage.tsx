import React from 'react';

const BookingConfirmPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed</h2>
      <p className="text-gray-600">Your appointment has been scheduled</p>
      <div className="bg-green-50 border border-green-500 rounded-lg p-6">
        <p className="text-green-600 font-medium">Confirmation details coming soon...</p>
      </div>
    </div>
  );
};

export default BookingConfirmPage;
