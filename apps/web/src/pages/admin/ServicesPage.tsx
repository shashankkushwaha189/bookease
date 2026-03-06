import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Scissors } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ServiceModal from '../../components/ServiceModal';
import { useToastStore } from '../../stores/toast.store';
import { servicesApi } from '../../api/services';

// Types
interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  price?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ServicesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serviceIdToDelete, setServiceIdToDelete] = useState<string | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const toastStore = useToastStore();

  // Fetch services
  const fetchServices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await servicesApi.getServices();
      
      // Transform API data to frontend format
      const transformedServices = response.data.data.map((service: any) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.category || 'General',
        duration: service.durationMinutes,
        bufferBefore: service.bufferBefore || 0,
        bufferAfter: service.bufferAfter || 0,
        price: service.price ? (typeof service.price === 'string' ? parseFloat(service.price) : service.price) : undefined,
        isActive: service.isActive !== false,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt
      }));
      
      setServices(transformedServices);
    } catch (err: any) {
      console.error('Failed to fetch services:', err);
      setError(err.message || 'Failed to load services');
      toastStore.error('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId: string) => {
    try {
      await servicesApi.deleteService(serviceId);
      setServices(prev => prev.filter(service => service.id !== serviceId));
      toastStore.success('Service deleted successfully');
      setIsDeleteDialogOpen(false);
      setServiceIdToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete service:', err);
      toastStore.error('Failed to delete service');
    }
  };

  // Save service (create or update)
  const handleSaveService = async (serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingService) {
        // Update existing service
        const response = await servicesApi.updateService(editingService.id, {
          name: serviceData.name,
          description: serviceData.description,
          category: serviceData.category,
          durationMinutes: serviceData.duration,
          bufferBefore: serviceData.bufferBefore,
          bufferAfter: serviceData.bufferAfter,
          price: serviceData.price,
          isActive: serviceData.isActive,
        });
        
        setServices(prev => prev.map(service => 
          service.id === editingService.id 
            ? {
                ...service,
                name: response.data.data.name,
                description: response.data.data.description,
                category: response.data.data.category,
                duration: response.data.data.durationMinutes,
                bufferBefore: response.data.data.bufferBefore,
                bufferAfter: response.data.data.bufferAfter,
                price: response.data.data.price ? (typeof response.data.data.price === 'string' ? parseFloat(response.data.data.price) : response.data.data.price) : undefined,
                isActive: response.data.data.isActive,
                updatedAt: response.data.data.updatedAt,
              }
            : service
        ));
        
        toastStore.success('Service updated successfully');
      } else {
        // Create new service
        const response = await servicesApi.createService({
          name: serviceData.name,
          description: serviceData.description,
          category: serviceData.category,
          durationMinutes: serviceData.duration,
          bufferBefore: serviceData.bufferBefore,
          bufferAfter: serviceData.bufferAfter,
          price: serviceData.price,
          isActive: serviceData.isActive,
        });
        
        const newService = {
          id: response.data.data.id,
          name: response.data.data.name,
          description: response.data.data.description,
          category: response.data.data.category,
          duration: response.data.data.durationMinutes,
          bufferBefore: response.data.data.bufferBefore,
          bufferAfter: response.data.data.bufferAfter,
          price: response.data.data.price ? (typeof response.data.data.price === 'string' ? parseFloat(response.data.data.price) : response.data.data.price) : undefined,
          isActive: response.data.data.isActive,
          createdAt: response.data.data.createdAt,
          updatedAt: response.data.data.updatedAt,
        };
        
        setServices(prev => [newService, ...prev]);
        toastStore.success('Service created successfully');
      }
      
      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch (err: any) {
      console.error('Failed to save service:', err);
      toastStore.error('Failed to save service');
      throw err;
    }
  };

  // Filter services based on search
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Load services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Services</h1>
        <p className="text-gray-600">Manage your service offerings</p>
      </div>

      {/* Search and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
        <Button onClick={() => {
          setEditingService(null);
          setIsServiceModalOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        /* Services Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No services found
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <Scissors className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{service.name}</div>
                            {service.description && (
                              <div className="text-sm text-gray-500">{service.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {service.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.duration} min
                        {(service.bufferBefore > 0 || service.bufferAfter > 0) && (
                          <div className="text-xs text-gray-500">
                            +{service.bufferBefore}min / +{service.bufferAfter}min buffer
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.price ? `$${service.price}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          service.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingService(service);
                            setIsServiceModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setServiceIdToDelete(service.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        onConfirm={() => serviceIdToDelete && handleDeleteService(serviceIdToDelete)}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setServiceIdToDelete(null);
        }}
      />

      {/* Service Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
        service={editingService}
        onSave={handleSaveService}
      />
    </div>
  );
};

export default ServicesPage;
