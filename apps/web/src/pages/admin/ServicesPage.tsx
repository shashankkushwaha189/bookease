import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Scissors, ChevronUp, ChevronDown } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import ServiceModal from '../../components/ServiceModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToastStore } from '../../stores/toast.store';

// Types
interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  price?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type SortField = 'name' | 'duration';
type SortDirection = 'asc' | 'desc';

// API Hook (mock implementation - replace with actual API)
const useServices = () => {
  const [services, setServices] = React.useState<Service[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const mockServices: Service[] = [
          {
            id: '1',
            name: 'Haircut',
            description: 'Professional haircut with styling',
            duration: 30,
            bufferBefore: 5,
            bufferAfter: 10,
            price: 45,
            isActive: true,
            createdAt: '2024-03-01T10:00:00',
            updatedAt: '2024-03-01T10:00:00'
          },
          {
            id: '2',
            name: 'Beard Trim',
            description: 'Precision beard trimming and shaping',
            duration: 15,
            bufferBefore: 0,
            bufferAfter: 5,
            price: 25,
            isActive: true,
            createdAt: '2024-03-01T10:30:00',
            updatedAt: '2024-03-01T10:30:00'
          },
          {
            id: '3',
            name: 'Haircut & Beard',
            description: 'Complete haircut and beard service',
            duration: 45,
            bufferBefore: 5,
            bufferAfter: 15,
            price: 65,
            isActive: true,
            createdAt: '2024-03-01T11:00:00',
            updatedAt: '2024-03-01T11:00:00'
          },
          {
            id: '4',
            name: 'Color & Style',
            description: 'Full hair coloring and styling service',
            duration: 120,
            bufferBefore: 15,
            bufferAfter: 20,
            price: 120,
            isActive: true,
            createdAt: '2024-03-01T11:30:00',
            updatedAt: '2024-03-01T11:30:00'
          },
          {
            id: '5',
            name: 'Full Service',
            description: 'Premium haircut, beard, and treatment',
            duration: 90,
            bufferBefore: 10,
            bufferAfter: 15,
            price: 95,
            isActive: false,
            createdAt: '2024-03-01T12:00:00',
            updatedAt: '2024-03-01T12:00:00'
          }
        ];
        
        setServices(mockServices);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  const updateService = async (serviceId: string, updates: Partial<Service>) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { ...service, ...updates, updatedAt: new Date().toISOString() }
          : service
      ));
      
      return true;
    } catch (error) {
      console.error('Failed to update service:', error);
      return false;
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setServices(prev => prev.filter(service => service.id !== serviceId));
      return true;
    } catch (error) {
      console.error('Failed to delete service:', error);
      return false;
    }
  };

  const createService = async (serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newService: Service = {
        ...serviceData,
        id: `service-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setServices(prev => [...prev, newService]);
      return newService;
    } catch (error) {
      console.error('Failed to create service:', error);
      return null;
    }
  };

  return { services, isLoading, updateService, deleteService, createService };
};

// Components
const StatusToggle: React.FC<{
  isActive: boolean;
  serviceId: string;
  onUpdate: (serviceId: string, isActive: boolean) => void;
}> = ({ isActive, serviceId, onUpdate }) => {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(serviceId, !isActive);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isActive ? 'bg-success' : 'bg-neutral-300'
      } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isActive ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

const SortableHeader: React.FC<{
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}> = ({ label, field, currentSort, currentDirection, onSort }) => {
  const isActive = currentSort === field;
  const direction = isActive ? currentDirection : null;

  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center space-x-1 text-xs font-medium text-neutral-600 uppercase tracking-wider hover:text-neutral-900"
    >
      <span>{label}</span>
      {direction && (
        direction === 'asc' ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )
      )}
    </button>
  );
};

// Main Component
const ServicesPage: React.FC = () => {
  const { success, error } = useToastStore();
  const { services, isLoading, updateService, deleteService, createService } = useServices();
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortField, setSortField] = React.useState<SortField>('name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<Service | null>(null);
  const [deletingService, setDeletingService] = React.useState<Service | null>(null);

  // Filter and sort services
  const filteredServices = React.useMemo(() => {
    let filtered = services;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'duration') {
        comparison = a.duration - b.duration;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [services, searchQuery, sortField, sortDirection]);

  // Event handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStatusToggle = async (serviceId: string, isActive: boolean) => {
    const success = await updateService(serviceId, { isActive });
    if (success) {
      success(`Service ${isActive ? 'activated' : 'deactivated'} successfully`);
    } else {
      error('Failed to update service status');
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleDelete = (service: Service) => {
    setDeletingService(service);
  };

  const handleConfirmDelete = async () => {
    if (!deletingService) return;

    const success = await deleteService(deletingService.id);
    if (success) {
      success('Service deleted successfully');
      setDeletingService(null);
    } else {
      error('Failed to delete service');
    }
  };

  const handleAddService = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleModalSave = async (serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingService) {
      // Update existing service
      const success = await updateService(editingService.id, serviceData);
      if (success) {
        success('Service updated successfully');
        setIsModalOpen(false);
        setEditingService(null);
      } else {
        error('Failed to update service');
      }
    } else {
      // Create new service
      const newService = await createService(serviceData);
      if (newService) {
        success('Service created successfully');
        setIsModalOpen(false);
      } else {
        error('Failed to create service');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Services</h1>
          <p className="text-neutral-600">Manage your service offerings and pricing</p>
        </div>
        <Button variant="primary" onClick={handleAddService}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Search */}
      <div className="w-full md:w-96">
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-surface border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <Skeleton variant="text" height="16px" width="80px" />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <Skeleton variant="text" height="16px" width="80px" />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <Skeleton variant="text" height="16px" width="80px" />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <Skeleton variant="text" height="16px" width="80px" />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <Skeleton variant="text" height="16px" width="80px" />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <Skeleton variant="text" height="16px" width="80px" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4"><Skeleton variant="text" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton variant="text" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton variant="text" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton variant="text" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton variant="text" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton variant="text" height="20px" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="bg-surface border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <SortableHeader
                      label="Name"
                      field="name"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <SortableHeader
                      label="Duration"
                      field="duration"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Buffer Before
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Buffer After
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-neutral-900">{service.name}</div>
                        {service.description && (
                          <div className="text-sm text-neutral-600 mt-1">{service.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-neutral-900">{service.duration} min</div>
                      {service.price && (
                        <div className="text-sm text-neutral-600">${service.price}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900">
                      {service.bufferBefore} min
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900">
                      {service.bufferAfter} min
                    </td>
                    <td className="px-6 py-4">
                      <StatusToggle
                        isActive={service.isActive}
                        serviceId={service.id}
                        onUpdate={handleStatusToggle}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-neutral-200 rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No services yet</h3>
          <p className="text-neutral-600 mb-6">Get started by adding your first service</p>
          <Button variant="primary" onClick={handleAddService}>
            <Plus className="w-4 h-4 mr-2" />
            Add your first service
          </Button>
        </div>
      )}

      {/* Service Modal */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingService(null);
        }}
        service={editingService}
        onSave={handleModalSave}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingService}
        onClose={() => setDeletingService(null)}
        title="Delete Service"
        message={`Are you sure you want to delete "${deletingService?.name}"? This action cannot be undone.`}
        confirmText="Delete Service"
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  );
};

export default ServicesPage;
