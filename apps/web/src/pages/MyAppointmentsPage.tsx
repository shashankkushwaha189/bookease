import React from 'react';

const MyAppointmentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900">My Appointments</h2>
      <p className="text-neutral-600">View your appointments</p>
      <div className="bg-neutral-100 rounded-lg p-8 text-center">
        <p className="text-neutral-600">Staff appointments coming soon...</p>
      </div>
    </div>
  );
};

export default MyAppointmentsPage;
