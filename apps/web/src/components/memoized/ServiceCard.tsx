import React from 'react';
import { Clock, DollarSign, Edit2, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

interface Service {
  id: string;
  name: string;
  duration: number;
  price?: number;
  description?: string;
  active: boolean;
}

interface ServiceCardProps {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = React.memo(({ 
  service, 
  onEdit, 
  onDelete, 
  onToggleStatus 
}) => {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Price varies';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className={`bg-surface border rounded-lg p-6 transition-all ${
      service.active 
        ? 'border-neutral-200 hover:border-neutral-300' 
        : 'border-neutral-200 opacity-60'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            {service.name}
          </h3>
          {service.description && (
            <p className="text-sm text-neutral-600 line-clamp-2">
              {service.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-neutral-600">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(service.duration)}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <DollarSign className="w-4 h-4" />
            <span>{formatPrice(service.price)}</span>
          </div>
        </div>

        <button
          onClick={onToggleStatus}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            service.active ? 'bg-success' : 'bg-neutral-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              service.active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
});

ServiceCard.displayName = 'ServiceCard';

export default ServiceCard;
