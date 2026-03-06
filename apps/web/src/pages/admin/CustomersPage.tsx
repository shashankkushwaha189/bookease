import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, User, Tag } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToastStore } from '../../stores/toast.store';
import { useDebounce } from '../../hooks/useDebounce';
import { customersApi } from '../../api/customers';

// Types
interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tags: string[];
  totalAppointments: number;
  completedAppointments: number;
  noShows: number;
  lastVisit?: string;
  consentStatus: 'granted' | 'pending' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

const CustomersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerIdToDelete, setCustomerIdToDelete] = useState<string | null>(null);

  const navigate = useNavigate();
  const toastStore = useToastStore();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch customers
  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await customersApi.getCustomers({
        search: debouncedSearchQuery || undefined,
      });
      
      // Transform API data to frontend format
      const transformedCustomers = response.data.data.items.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        tags: customer.tags || [],
        totalAppointments: customer.totalAppointments || 0,
        completedAppointments: customer.completedAppointments || 0,
        noShows: customer.noShows || 0,
        lastVisit: customer.lastVisit,
        consentStatus: customer.consentStatus || 'pending',
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      }));
      
      setCustomers(transformedCustomers);
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
      setError(err.message || 'Failed to load customers');
      toastStore.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await customersApi.deleteCustomer(customerId);
      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      toastStore.success('Customer deleted successfully');
      setIsDeleteDialogOpen(false);
      setCustomerIdToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      toastStore.error('Failed to delete customer');
    }
  };

  // Load customers on mount and when search changes
  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearchQuery]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Customers</h1>
        <p className="text-gray-600">Manage your customer database</p>
      </div>

      {/* Search and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
        <Button onClick={() => navigate('/admin/customers/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
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
        /* Customers Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Visit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            <div className="flex gap-1 mt-1">
                              {customer.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.email}</div>
                        {customer.phone && (
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.totalAppointments} appointments
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.completedAppointments} completed
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/admin/customers/${customer.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCustomerIdToDelete(customer.id);
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
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        onConfirm={() => customerIdToDelete && handleDeleteCustomer(customerIdToDelete)}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setCustomerIdToDelete(null);
        }}
      />
    </div>
  );
};

export default CustomersPage;
