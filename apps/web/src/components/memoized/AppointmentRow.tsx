import React from 'react';
import { Edit2, Trash2, User, Calendar, Clock } from 'lucide-react';
import Button from '../ui/Button';
import { useToastStore } from '../../stores/toast.store';

interface Appointment {
  id: string;
  referenceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  service: string;
  duration: number;
  staffName: string;
  dateTime: string;
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
}

interface AppointmentRowProps {
  appointment: Appointment;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const AppointmentRow: React.FC<AppointmentRowProps> = React.memo(({ 
  appointment, 
  onView, 
  onEdit, 
  onDelete 
}) => {
  const { success, error } = useToastStore();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-soft text-success">Completed</span>;
      case 'confirmed':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary">Confirmed</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-soft text-danger">Cancelled</span>;
      case 'no_show':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-soft text-warning">No-Show</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">Booked</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <tr className="border-b border-neutral-200 hover:bg-neutral-50">
      <td className="px-6 py-4">
        <div className="font-medium text-neutral-900">{appointment.referenceId}</div>
        <div className="text-sm text-neutral-600">{appointment.customerName}</div>
      </td>
      <td className="px-6 py-4 text-sm text-neutral-900">{appointment.service}</td>
      <td className="px-6 py-4 text-sm text-neutral-900">{appointment.staffName}</td>
      <td className="px-6 py-4 text-sm text-neutral-900">
        <div>{formatDate(appointment.dateTime)}</div>
        <div className="text-neutral-600">{formatTime(appointment.dateTime)}</div>
      </td>
      <td className="px-6 py-4">
        {getStatusBadge(appointment.status)}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onView}>
            View
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

AppointmentRow.displayName = 'AppointmentRow';

export default AppointmentRow;
