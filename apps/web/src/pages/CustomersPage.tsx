import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Upload, 
  Mail, 
  Phone, 
  Calendar, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { appointmentsApi } from '../api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

// Types
interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isActive: boolean;
  totalAppointments: number;
  lastAppointment?: string;
  nextAppointment?: string;
  totalSpent: number;
  averageRating?: number;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerStats {
  total: number;
  active: number;
  newThisMonth: number;
  totalAppointments: number;
  revenue: number;
  averageRating: number;
}

const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const toastStore = useToastStore();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockCustomers: Customer[] = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '+1 (555) 123-4567',
        dateOfBirth: '1985-06-15',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        isActive: true,
        totalAppointments: 12,
        lastAppointment: '2024-01-15',
        nextAppointment: '2024-02-01',
        totalSpent: 1200,
        averageRating: 4.8,
        tags: ['VIP', 'Regular'],
        notes: 'Prefers morning appointments',
        createdAt: '2023-01-15',
        updatedAt: '2024-01-15',
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@email.com',
        phone: '+1 (555) 987-6543',
        dateOfBirth: '1990-03-22',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        isActive: true,
        totalAppointments: 8,
        lastAppointment: '2024-01-10',
        nextAppointment: '2024-01-25',
        totalSpent: 800,
        averageRating: 4.5,
        tags: ['New'],
        notes: 'Interested in premium services',
        createdAt: '2023-06-10',
        updatedAt: '2024-01-10',
      },
      {
        id: '3',
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert.j@email.com',
        phone: '+1 (555) 456-7890',
        isActive: false,
        totalAppointments: 3,
        lastAppointment: '2023-12-01',
        totalSpent: 300,
        tags: ['Inactive'],
        notes: 'Hasn\'t booked in 2 months',
        createdAt: '2023-09-01',
        updatedAt: '2023-12-01',
      },
    ];

    const mockStats: CustomerStats = {
      total: 156,
      active: 142,
      newThisMonth: 12,
      totalAppointments: 1248,
      revenue: 125000,
      averageRating: 4.6,
    };

    // Simulate API call
    setTimeout(() => {
      setCustomers(mockCustomers);
      setStats(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  // Computed values
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = searchTerm === '' || 
        customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.includes(searchTerm));

      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'active' && customer.isActive) ||
        (selectedStatus === 'inactive' && !customer.isActive);

      const matchesTag = selectedTag === '' || customer.tags.includes(selectedTag);

      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [customers, searchTerm, selectedStatus, selectedTag]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    customers.forEach(customer => {
      customer.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [customers]);

  // Actions
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    navigate(`/admin/customers/${customer.id}`);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      // await customersApi.deleteCustomer(customerToDelete.id);
      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      toastStore.success('Customer deleted successfully');
      setShowDeleteModal(false);
      setCustomerToDelete(null);
    } catch (error) {
      toastStore.error('Failed to delete customer');
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    try {
      // await customersApi.updateCustomer(customer.id, { isActive: !customer.isActive });
      setCustomers(customers.map(c => 
        c.id === customer.id ? { ...c, isActive: !c.isActive } : c
      ));
      toastStore.success(`Customer ${customer.isActive ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toastStore.error('Failed to update customer status');
    }
  };

  const handleExportCustomers = () => {
    // Export functionality
    const csv = customers.map(customer => ({
      'First Name': customer.firstName,
      'Last Name': customer.lastName,
      'Email': customer.email,
      'Phone': customer.phone || '',
      'Status': customer.isActive ? 'Active' : 'Inactive',
      'Total Appointments': customer.totalAppointments,
      'Total Spent': customer.totalSpent,
      'Average Rating': customer.averageRating || '',
      'Tags': customer.tags.join(', '),
    }));

    const csvContent = [
      Object.keys(csv[0]).join(','),
      ...csv.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toastStore.success('Customers exported successfully');
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'success' : 'secondary'}>
        {isActive ? (
          <>
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </>
        )}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Customers</h2>
            <p className="text-neutral-600">Manage your customer database</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-neutral-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-neutral-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Customers</h2>
          <p className="text-neutral-600">Manage your customer database and relationships</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleExportCustomers}
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCustomerModal(true)} size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Total Customers</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Active Customers</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">New This Month</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.newThisMonth}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Total Appointments</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalAppointments}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-lg">
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              size="sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Last Visit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center mr-3">
                        <Users className="w-5 h-5 text-neutral-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-neutral-500">
                          ID: {customer.id}
                        </div>
                        {customer.tags.length > 0 && (
                          <div className="flex items-center space-x-1 mt-1">
                            {customer.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                            {customer.tags.length > 2 && (
                              <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">
                                +{customer.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-neutral-400 mr-1" />
                        {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center mt-1">
                          <Phone className="w-4 h-4 text-neutral-400 mr-1" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(customer.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    <div>{customer.totalAppointments} total</div>
                    {customer.nextAppointment && (
                      <div className="text-neutral-500">
                        Next: {formatDate(customer.nextAppointment)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {customer.averageRating ? (
                      <div className="flex items-center">
                        <span className="mr-1">⭐</span>
                        {customer.averageRating.toFixed(1)}
                      </div>
                    ) : (
                      <span className="text-neutral-400">No rating</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {customer.lastAppointment ? (
                      formatDate(customer.lastAppointment)
                    ) : (
                      <span className="text-neutral-400">No visits</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleViewCustomer(customer)}
                        size="sm"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleEditCustomer(customer)}
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleToggleStatus(customer)}
                        size="sm"
                      >
                        {customer.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteCustomer(customer)}
                        size="sm"
                        className="text-red-600 hover:text-red-700"
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

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No customers found</h3>
            <p className="text-neutral-600 mb-4">
              {searchTerm || selectedStatus !== 'all' || selectedTag
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first customer'
              }
            </p>
            {!searchTerm && selectedStatus === 'all' && !selectedTag && (
              <Button onClick={() => setShowCustomerModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-neutral-900">Delete Customer</h3>
            </div>
            <p className="text-neutral-600 mb-6">
              Are you sure you want to delete {customerToDelete.firstName} {customerToDelete.lastName}? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
              >
                Delete Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Customer Modal - Placeholder */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <p className="text-neutral-600 mb-6">
              Customer form will be implemented with full CRUD functionality.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomerModal(false);
                  setSelectedCustomer(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowCustomerModal(false);
                  setSelectedCustomer(null);
                  toastStore.success('Customer saved successfully');
                }}
              >
                Save Customer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
