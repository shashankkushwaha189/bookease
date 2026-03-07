import React from 'react';
import { Edit2, Mail, Phone, Calendar, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  photoUrl?: string;
  assignedServices: string[];
  active: boolean;
}

interface StaffCardProps {
  staff: Staff;
  onEdit: () => void;
  onDelete: () => void;
  onViewSchedule: () => void;
  services: { id: string; name: string }[];
}

const StaffCard: React.FC<StaffCardProps> = React.memo(({ 
  staff, 
  onEdit, 
  onDelete,
  onViewSchedule,
  services 
}) => {
  const getAssignedServiceNames = () => {
    return staff.assignedServices
      .map(serviceId => {
        const service = services.find(s => s.id === serviceId);
        return service?.name || serviceId;
      })
      .slice(0, 3); // Show max 3 services
  };

  const hasMoreServices = staff.assignedServices.length > 3;

  return (
    <div className={`bg-surface border rounded-lg p-6 transition-all ${
      staff.active 
        ? 'border-neutral-200 hover:border-neutral-300' 
        : 'border-neutral-200 opacity-60'
    }`}>
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {staff.photoUrl ? (
            <img
              src={staff.photoUrl}
              alt={staff.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-primary-soft rounded-full flex items-center justify-center">
              <span className="text-xl font-medium text-primary">
                {staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 truncate">
                {staff.name}
              </h3>
              
              <div className="flex items-center space-x-4 text-sm text-neutral-600 mt-1">
                {staff.email && (
                  <div className="flex items-center space-x-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                )}
                
                {staff.phone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{staff.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>

          {staff.bio && (
            <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
              {staff.bio}
            </p>
          )}

          {/* Assigned Services */}
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {getAssignedServiceNames().map((serviceName, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary"
                >
                  {serviceName}
                </span>
              ))}
              
              {hasMoreServices && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                  +{staff.assignedServices.length - 3} more
                </span>
              )}
              
              {staff.assignedServices.length === 0 && (
                <span className="text-xs text-neutral-500 italic">No services assigned</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewSchedule}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              className="flex-1"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onDelete}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

StaffCard.displayName = 'StaffCard';

export default StaffCard;
