import { useState, useEffect } from 'react';
import { servicesApi, type Service, type CreateServiceRequest } from '../api';
import { useToastStore } from '../stores/toast.store';

export interface UseServicesOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export const useServices = (options: UseServicesOptions = {}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const { success, error: showError } = useToastStore();

  const fetchServices = async (params?: UseServicesOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await servicesApi.getServices({ ...options, ...params });
      setServices(response.data.data.items);
      setPagination({
        page: response.data.data.page,
        limit: response.data.data.limit,
        total: response.data.data.total,
        totalPages: response.data.data.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch services');
      showError('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const createService = async (data: CreateServiceRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await servicesApi.createService(data);
      setServices(prev => [response.data.data, ...prev]);
      success('Service created successfully');
      return response.data.data;
    } catch (err: any) {
      setError(err.message || 'Failed to create service');
      showError('Failed to create service');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateService = async (id: string, data: Partial<CreateServiceRequest>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await servicesApi.updateService(id, data);
      setServices(prev => 
        prev.map(service => service.id === id ? response.data.data : service)
      );
      success('Service updated successfully');
      return response.data.data;
    } catch (err: any) {
      setError(err.message || 'Failed to update service');
      showError('Failed to update service');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteService = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await servicesApi.deleteService(id);
      setServices(prev => prev.filter(service => service.id !== id));
      success('Service deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete service');
      showError('Failed to delete service');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleService = async (id: string, isActive: boolean) => {
    try {
      const response = await servicesApi.toggleService(id, isActive);
      setServices(prev => 
        prev.map(service => service.id === id ? response.data.data : service)
      );
      success(`Service ${isActive ? 'activated' : 'deactivated'} successfully`);
      return response.data.data;
    } catch (err: any) {
      showError(`Failed to ${isActive ? 'activate' : 'deactivate'} service`);
      throw err;
    }
  };

  useEffect(() => {
    fetchServices();
  }, [options.page, options.limit, options.search, options.isActive]);

  return {
    services,
    loading,
    error,
    pagination,
    fetchServices,
    createService,
    updateService,
    deleteService,
    toggleService,
    refresh: () => fetchServices(),
  };
};
