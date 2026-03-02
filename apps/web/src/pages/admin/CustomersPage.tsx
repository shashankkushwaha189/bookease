import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, ArrowUpDown, User, Tag, Calendar, Clock, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToastStore } from '../../stores/toast.store';
import { useDebounce } from '../../hooks/useDebounce';

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

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

type SortField = 'name' | 'lastVisit';
type SortDirection = 'asc' | 'desc';

// API Hooks (mock implementations - replace with actual API calls)
const useCustomers = (searchQuery: string, selectedTags: string[]) => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const mockCustomers: Customer[] = [
          {
            id: '1',
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '+1 (555) 123-4567',
            tags: ['VIP', 'Regular'],
            totalAppointments: 24,
            completedAppointments: 22,
            noShows: 2,
            lastVisit: '2024-03-01T14:30:00',
            consentStatus: 'granted',
            createdAt: '2024-01-15T10:00:00',
            updatedAt: '2024-03-01T14:30:00'
          },
          {
            id: '2',
            name: 'Emma Davis',
            email: 'emma.davis@email.com',
            phone: '+1 (555) 987-6543',
            tags: ['New'],
            totalAppointments: 3,
            completedAppointments: 3,
            noShows: 0,
            lastVisit: '2024-02-28T10:00:00',
            consentStatus: 'granted',
            createdAt: '2024-02-01T09:00:00',
            updatedAt: '2024-02-28T10:00:00'
          },
          {
            id: '3',
            name: 'Robert Brown',
            email: 'robert.brown@email.com',
            phone: '+1 (555) 456-7890',
            tags: ['VIP', 'Recurring'],
            totalAppointments: 45,
            completedAppointments: 40,
            noShows: 5,
            lastVisit: '2024-02-25T15:00:00',
            consentStatus: 'granted',
            createdAt: '2023-12-01T11:00:00',
            updatedAt: '2024-02-25T15:00:00'
          },
          {
            id: '4',
            name: 'Lisa Anderson',
            email: 'lisa.anderson@email.com',
            tags: ['Regular'],
            totalAppointments: 12,
            completedAppointments: 11,
            noShows: 1,
            lastVisit: '2024-02-20T09:30:00',
            consentStatus: 'pending',
            createdAt: '2024-01-20T14:00:00',
            updatedAt: '2024-02-20T09:30:00'
          },
          {
            id: '5',
            name: 'James Taylor',
            email: 'james.taylor@email.com',
            tags: ['Recurring'],
            totalAppointments: 18,
            completedAppointments: 16,
            noShows: 2,
            lastVisit: '2024-02-18T16:00:00',
            consentStatus: 'granted',
            createdAt: '2023-11-15T10:30:00',
            updatedAt: '2024-02-18T16:00:00'
          }
        ];

        // Apply search filter
        let filtered = mockCustomers;
        if (searchQuery) {
          filtered = filtered.filter(customer =>
            customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.phone?.includes(searchQuery)
          );
        }

        // Apply tag filter
        if (selectedTags.length > 0) {
          filtered = filtered.filter(customer =>
            selectedTags.some(tag => customer.tags.includes(tag))
          );
        }

        setCustomers(filtered);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [searchQuery, selectedTags]);

  const deleteCustomer = async (customerId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
      return true;
    } catch (error) {
      console.error('Failed to delete customer:', error);
      return false;
    }
  };

  return { customers, isLoading, deleteCustomer };
};

const useCustomerTags = () => {
  const [tags, setTags] = React.useState<CustomerTag[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockTags: CustomerTag[] = [
          { id: '1', name: 'VIP', color: '#F59E0B' },
          { id: '2', name: 'Regular', color: '#10B981' },
          { id: '3', name: 'New', color: '#3B82F6' },
          { id: '4', name: 'Recurring', color: '#8B5CF6' },
          { id: '5', name: 'Inactive', color: '#6B7280' },
        ];
        
        setTags(mockTags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };

    fetchTags();
  }, []);

  return { tags };
};

// Components
const CustomerTag: React.FC<{ tag: string; color: string }> = ({ tag, color }) => {
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {tag}
    </span>
  );
};

const TagFilter: React.FC<{
  tags: CustomerTag[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}> = ({ tags, selectedTags, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleTag = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    onChange(newTags);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center"
      >
        <Tag className="w-4 h-4 mr-2" />
        Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-neutral-200 rounded-lg shadow-lg z-10">
          <div className="p-2">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center p-2 hover:bg-neutral-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.name)}
                  onChange={() => toggleTag(tag.name)}
                  className="mr-2"
                />
                <CustomerTag tag={tag.name} color={tag.color} />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
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
          <ArrowUpDown className="w-3 h-3 rotate-180" />
        ) : (
          <ArrowUpDown className="w-3 h-3" />
        )
      )}
    </button>
  );
};

const CustomerRow: React.FC<{
  customer: Customer;
  tags: CustomerTag[];
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ customer, tags, onView, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const getTagColor = (tagName: string) => {
    const tag = tags.find(t => t.name === tagName);
    return tag?.color || '#6B7280';
  };

  const getConsentBadge = (status: string) => {
    switch (status) {
      case 'granted':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-soft text-success">Consent Granted</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-soft text-warning">Pending</span>;
      case 'revoked':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-soft text-danger">Revoked</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const noShowRate = customer.totalAppointments > 0 
    ? Math.round((customer.noShows / customer.totalAppointments) * 100)
    : 0;

  return (
    <tr 
      className="border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer"
      onClick={() => navigate(`/admin/customers/${customer.id}`)}
    >
      <td className="px-6 py-4">
        <div className="font-medium text-neutral-900">{customer.name}</div>
        {getConsentBadge(customer.consentStatus)}
      </td>
      <td className="px-6 py-4 text-sm text-neutral-900">{customer.email}</td>
      <td className="px-6 py-4 text-sm text-neutral-900">{customer.phone || '—'}</td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {customer.tags.map((tag, index) => (
            <CustomerTag key={index} tag={tag} color={getTagColor(tag)} />
          ))}
        </div>
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="text-neutral-900">{customer.totalAppointments}</div>
        <div className="text-neutral-600 text-xs">{noShowRate}% no-show</div>
      </td>
      <td className="px-6 py-4 text-sm text-neutral-900">{formatDate(customer.lastVisit)}</td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
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
};

// Main Component
const CustomersPage: React.FC = () => {
  const { success, error } = useToastStore();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [sortField, setSortField] = React.useState<SortField>('name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
  const [deletingCustomer, setDeletingCustomer] = React.useState<Customer | null>(null);

  // Debounce search is now handled by useDebounce hook

  // API hooks
  const { customers, isLoading, deleteCustomer } = useCustomers(debouncedSearchQuery, selectedTags);
  const { tags } = useCustomerTags();

  // Sort customers
  const sortedCustomers = React.useMemo(() => {
    return [...customers].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'lastVisit') {
        const aDate = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const bDate = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        comparison = aDate - bDate;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [customers, sortField, sortDirection]);

  // Event handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleView = (customer: Customer) => {
    navigate(`/admin/customers/${customer.id}`);
  };

  const handleEdit = (customer: Customer) => {
    navigate(`/admin/customers/${customer.id}?edit=true`);
  };

  const handleDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;

    const success = await deleteCustomer(deletingCustomer.id);
    if (success) {
      success('Customer deleted successfully');
      setDeletingCustomer(null);
    } else {
      error('Failed to delete customer');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Customers</h1>
          <p className="text-neutral-600">Manage your customer database and relationships</p>
        </div>
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        
        <TagFilter
          tags={tags}
          selectedTags={selectedTags}
          onChange={setSelectedTags}
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
                    <div className="h-4 bg-neutral-200 rounded w-20 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-neutral-200 rounded w-24 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-neutral-200 rounded w-20 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-neutral-200 rounded w-16 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-neutral-200 rounded w-20 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-neutral-200 rounded w-16 animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 bg-neutral-200 rounded w-16 animate-pulse"></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : sortedCustomers.length > 0 ? (
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Appointments
                  </th>
                  <th className="px-6 py-3 text-left">
                    <SortableHeader
                      label="Last Visit"
                      field="lastVisit"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sortedCustomers.map((customer) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    tags={tags}
                    onView={() => handleView(customer)}
                    onEdit={() => handleEdit(customer)}
                    onDelete={() => handleDelete(customer)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-neutral-200 rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No customers yet</h3>
          <p className="text-neutral-600 mb-6">Start building your customer database</p>
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add your first customer
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deletingCustomer?.name}"? This action cannot be undone.`}
        confirmText="Delete Customer"
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  );
};

export default CustomersPage;
