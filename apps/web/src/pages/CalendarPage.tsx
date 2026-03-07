import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Users, Plus, Filter } from 'lucide-react';
import CalendarSimple from '../components/CalendarSimpleFinal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { useToastStore } from '../stores/toast.store';
import { appointmentsApi } from '../api/appointments';
import { customersApi } from '../api/customers';
import { servicesApi } from '../api/services';
import { staffApi } from '../api/staff';

const CalendarPage: React.FC = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    staffId: '',
    serviceId: '',
    customerId: '',
    status: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    upcoming: 0,
  });

  const toastStore = useToastStore();

  // Load statistics
  const loadStats = async () => {
    try {
      const [appointmentsResponse, customersResponse] = await Promise.all([
        appointmentsApi.getAppointments(),
        customersApi.getCustomers({ limit: 1 }),
      ]);

      const appointments = appointmentsResponse.data.data.items;
      const customers = customersResponse.data.data.items;

      const completed = appointments.filter((apt: any) => apt.status === 'COMPLETED').length;
      const cancelled = appointments.filter((apt: any) => apt.status === 'CANCELLED').length;
      const upcoming = appointments.filter((apt: any) => apt.status === 'SCHEDULED').length;

      setStats({
        total: appointments.length,
        completed,
        cancelled,
        upcoming,
      });
    } catch (error: any) {
      toastStore.error('Failed to load statistics');
    }
  };

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      const [staffResponse, servicesResponse, customersResponse] = await Promise.all([
        staffApi.getStaff(),
        servicesApi.getServices(),
        customersApi.getCustomers({ limit: 100 }),
      ]);

      return {
        staff: staffResponse.data.data.items,
        services: servicesResponse.data.data.items,
        customers: customersResponse.data.data.items,
      };
    } catch (error: any) {
      toastStore.error('Failed to load filter options');
      return { staff: [], services: [], customers: [] };
    }
  };

  React.useEffect(() => {
    loadStats();
  }, []);

  const staffOptions = [
    { value: 'staff-1', label: 'John Doe' },
    { value: 'staff-2', label: 'Jane Smith' },
    { value: 'staff-3', label: 'Mike Johnson' },
  ];

  const serviceOptions = [
    { value: 'service-1', label: 'Haircut - $30' },
    { value: 'service-2', label: 'Beard Trim - $15' },
    { value: 'service-3', label: 'Shave - $20' },
  ];

  const customerOptions = [
    { value: 'customer-1', label: 'Alice Johnson' },
    { value: 'customer-2', label: 'Bob Smith' },
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      staffId: '',
      serviceId: '',
      customerId: '',
      status: '',
    });
  };

  const getStatCard = (title: string, value: number, color: string) => (
    <Card className="p-4">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
        </div>
        <div className="ml-4">
          <div className="text-sm text-gray-600">{title}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Calendar</h1>
        <p className="text-gray-600">Manage appointments and schedule</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {getStatCard('Total Appointments', stats.total, 'bg-blue-500')}
        {getStatCard('Completed', stats.completed, 'bg-green-500')}
        {getStatCard('Cancelled', stats.cancelled, 'bg-red-500')}
        {getStatCard('Upcoming', stats.upcoming, 'bg-yellow-500')}
      </div>

      {/* Filters and Controls */}
      <Card className="mb-6">
        <Card.Header>
          <Card.Title>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                <h3 className="text-lg font-semibold">Calendar</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
                <Button variant="primary" size="sm">
                  <Plus className="w-4 h-4" />
                  New Appointment
                </Button>
              </div>
            </div>
          </Card.Title>
        </Card.Header>
        {showFilters && (
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Staff</label>
                <Select
                  value={filters.staffId}
                  onChange={(e) => handleFilterChange('staffId', e.target.value)}
                  options={staffOptions}
                  placeholder="All Staff"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                <Select
                  value={filters.serviceId}
                  onChange={(e) => handleFilterChange('serviceId', e.target.value)}
                  options={serviceOptions}
                  placeholder="All Services"
                />
              </div>
            </div>
          </Card.Content>
        )}
      </Card>

      {/* CalendarSimple Component */}
      <CalendarSimple />
    </div>
  );
};

export default CalendarPage;
