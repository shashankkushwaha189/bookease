import { useState, useEffect } from 'react';
import { appointmentsApi, type Appointment, type CreateAppointmentRequest } from '../api';
import { useToastStore } from '../stores/toast.store';

export interface UseAppointmentsOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  serviceId?: string;
  staffId?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}

export const useAppointments = (options: UseAppointmentsOptions = {}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const { success, error: showError } = useToastStore();

  const fetchAppointments = async (params?: UseAppointmentsOptions) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await appointmentsApi.getAppointments({ ...options, ...params });
      setAppointments(response.data.data.items);
      setPagination({
        page: response.data.data.page,
        limit: response.data.data.limit,
        total: response.data.data.total,
        totalPages: response.data.data.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch appointments');
      showError('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (data: CreateAppointmentRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await appointmentsApi.createAppointment(data);
      setAppointments(prev => [response.data.data, ...prev]);
      success('Appointment created successfully');
      return response.data.data;
    } catch (err: any) {
      setError(err.message || 'Failed to create appointment');
      showError('Failed to create appointment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAppointment = async (id: string, data: Partial<CreateAppointmentRequest>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await appointmentsApi.updateAppointment(id, data);
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? response.data.data : apt)
      );
      success('Appointment updated successfully');
      return response.data.data;
    } catch (err: any) {
      setError(err.message || 'Failed to update appointment');
      showError('Failed to update appointment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await appointmentsApi.deleteAppointment(id);
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      success('Appointment deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete appointment');
      showError('Failed to delete appointment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmAppointment = async (id: string) => {
    try {
      const response = await appointmentsApi.confirmAppointment(id);
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? response.data.data : apt)
      );
      success('Appointment confirmed successfully');
      return response.data.data;
    } catch (err: any) {
      showError('Failed to confirm appointment');
      throw err;
    }
  };

  const completeAppointment = async (id: string, notes?: string) => {
    try {
      const response = await appointmentsApi.completeAppointment(id, { notes });
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? response.data.data : apt)
      );
      success('Appointment completed successfully');
      return response.data.data;
    } catch (err: any) {
      showError('Failed to complete appointment');
      throw err;
    }
  };

  const markNoShow = async (id: string, reason?: string) => {
    try {
      const response = await appointmentsApi.markNoShow(id, { reason });
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? response.data.data : apt)
      );
      success('Appointment marked as no-show');
      return response.data.data;
    } catch (err: any) {
      showError('Failed to mark appointment as no-show');
      throw err;
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [options.page, options.limit, options.search, options.status, options.serviceId, options.staffId, options.customerId, options.fromDate, options.toDate]);

  return {
    appointments,
    loading,
    error,
    pagination,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    confirmAppointment,
    completeAppointment,
    markNoShow,
    refresh: () => fetchAppointments(),
  };
};
