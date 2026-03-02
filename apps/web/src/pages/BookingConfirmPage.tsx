import React from 'react';

const BookingConfirmPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900">Booking Confirmed</h2>
      <p className="text-neutral-600">Your appointment has been scheduled</p>
      <div className="bg-success-soft border border-success rounded-lg p-6">
        <p className="text-success font-medium">Confirmation details coming soon...</p>
      </div>
    </div>
  );
};

export default BookingConfirmPage;
