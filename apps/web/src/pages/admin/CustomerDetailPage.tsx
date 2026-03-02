import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Calendar, Clock, User, Tag, MessageSquare, Save, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppointmentDrawer from '../../components/AppointmentDrawer';
import { useToastStore } from '../../stores/toast.store';

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

interface Appointment {
  id: string;
  referenceId: string;
  service: string;
  staffName: string;
  dateTime: string;
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
}

interface CustomerNote {
  id: string;
  text: string;
  addedBy: string;
  timestamp: string;
}

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

// API Hooks (mock implementations - replace with actual API calls)
const useCustomer = (customerId: string) => {
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const mockCustomer: Customer = {
          id: customerId,
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
        };
        
        setCustomer(mockCustomer);
      } catch (error) {
        console.error('Failed to fetch customer:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId]);

  const updateCustomer = async (updates: Partial<Customer>) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCustomer(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null);
      return true;
    } catch (error) {
      console.error('Failed to update customer:', error);
      return false;
    }
  };

  return { customer, isLoading, updateCustomer };
};

const useCustomerAppointments = (customerId: string, page: number = 1) => {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [totalCount, setTotalCount] = React.useState(0);

  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const mockAppointments: Appointment[] = [
          {
            id: '1',
            referenceId: 'BK-2024-00042',
            service: 'Haircut',
            staffName: 'Sarah Johnson',
            dateTime: '2024-03-01T14:30:00',
            status: 'completed'
          },
          {
            id: '2',
            referenceId: 'BK-2024-00038',
            service: 'Beard Trim',
            staffName: 'Mike Wilson',
            dateTime: '2024-02-20T10:00:00',
            status: 'completed'
          },
          {
            id: '3',
            referenceId: 'BK-2024-00035',
            service: 'Haircut & Beard',
            staffName: 'Sarah Johnson',
            dateTime: '2024-02-15T15:00:00',
            status: 'completed'
          },
          {
            id: '4',
            referenceId: 'BK-2024-00030',
            service: 'Color & Style',
            staffName: 'Emma Davis',
            dateTime: '2024-02-01T11:00:00',
            status: 'no_show'
          },
        ];
        
        setAppointments(mockAppointments);
        setTotalCount(mockAppointments.length);
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [customerId, page]);

  return { appointments, isLoading, totalCount };
};

const useCustomerNotes = (customerId: string) => {
  const [notes, setNotes] = React.useState<CustomerNote[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const mockNotes: CustomerNote[] = [
          {
            id: '1',
            text: 'Customer prefers evening appointments. Always arrives 5 minutes early.',
            addedBy: 'Sarah Johnson',
            timestamp: '2024-03-01T14:45:00'
          },
          {
            id: '2',
            text: 'Mentioned they might be interested in color treatment next time.',
            addedBy: 'Mike Wilson',
            timestamp: '2024-02-20T10:15:00'
          },
          {
            id: '3',
            text: 'First-time customer. Referred by Jane Doe.',
            addedBy: 'Sarah Johnson',
            timestamp: '2024-01-15T10:05:00'
          }
        ];
        
        setNotes(mockNotes);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [customerId]);

  const addNote = async (text: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newNote: CustomerNote = {
        id: `note-${Date.now()}`,
        text,
        addedBy: 'Current User',
        timestamp: new Date().toISOString()
      };
      
      setNotes(prev => [newNote, ...prev]);
      return true;
    } catch (error) {
      console.error('Failed to add note:', error);
      return false;
    }
  };

  return { notes, isLoading, addNote };
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
          { id: '6', name: 'Problem', color: '#EF4444' },
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
const CustomerTag: React.FC<{ tag: string; color: string; onRemove?: () => void }> = ({ tag, color, onRemove }) => {
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

const EditableField: React.FC<{
  label: string;
  value: string;
  type?: 'text' | 'email' | 'tel';
  onSave: (value: string) => void;
  disabled?: boolean;
}> = ({ label, value, type = 'text', onSave, disabled = false }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-600 mb-1">{label}</label>
      {isEditing ? (
        <div className="flex items-center space-x-2">
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            autoFocus
          />
          <Button variant="primary" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`p-2 rounded-lg border ${disabled ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400 cursor-pointer'}`}
          onClick={() => !disabled && setIsEditing(true)}
        >
          <span className={value ? 'text-neutral-900' : 'text-neutral-400 italic'}>
            {value || `Add ${label.toLowerCase()}`}
          </span>
        </div>
      )}
    </div>
  );
};

const TagEditor: React.FC<{
  tags: string[];
  availableTags: CustomerTag[];
  onChange: (tags: string[]) => void;
}> = ({ tags, availableTags, onChange }) => {
  const [showAddTag, setShowAddTag] = React.useState(false);

  const getTagColor = (tagName: string) => {
    const tag = availableTags.find(t => t.name === tagName);
    return tag?.color || '#6B7280';
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const addTag = (tagName: string) => {
    if (!tags.includes(tagName)) {
      onChange([...tags, tagName]);
    }
    setShowAddTag(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-600 mb-2">Tags</label>
      
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <CustomerTag
            key={index}
            tag={tag}
            color={getTagColor(tag)}
            onRemove={() => removeTag(tag)}
          />
        ))}
        
        <button
          onClick={() => setShowAddTag(!showAddTag)}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-dashed border-neutral-300 text-neutral-600 hover:border-neutral-400"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Tag
        </button>
      </div>

      {showAddTag && (
        <div className="border border-neutral-200 rounded-lg p-2 bg-surface">
          <div className="space-y-1">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => addTag(tag.name)}
                disabled={tags.includes(tag.name)}
                className={`w-full text-left px-2 py-1 rounded text-sm hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <CustomerTag tag={tag.name} color={tag.color} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const NoteItem: React.FC<{ note: CustomerNote }> = ({ note }) => {
  return (
    <div className="border-b border-neutral-100 pb-4 last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-neutral-400" />
          <span className="font-medium text-neutral-900">{note.addedBy}</span>
        </div>
        <span className="text-xs text-neutral-500">
          {new Date(note.timestamp).toLocaleString()}
        </span>
      </div>
      <p className="text-sm text-neutral-700">{note.text}</p>
    </div>
  );
};

// Main Component
const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error } = useToastStore();
  
  const [activeTab, setActiveTab] = React.useState<'overview' | 'history' | 'notes'>('overview');
  const [isEditing, setIsEditing] = React.useState(searchParams.get('edit') === 'true');
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [newNote, setNewNote] = React.useState('');
  const [isAddingNote, setIsAddingNote] = React.useState(false);

  // API hooks
  const { customer, isLoading, updateCustomer } = useCustomer(customerId || '');
  const { appointments, isLoading: appointmentsLoading } = useCustomerAppointments(customerId || '');
  const { notes, addNote } = useCustomerNotes(customerId || '');
  const { tags } = useCustomerTags();

  // Event handlers
  const handleBack = () => {
    navigate('/admin/customers');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleFieldUpdate = async (field: keyof Customer, value: any) => {
    if (!customer) return;

    const success = await updateCustomer({ [field]: value });
    if (success) {
      success('Customer updated successfully');
    } else {
      error('Failed to update customer');
    }
  };

  const handleTagsUpdate = async (newTags: string[]) => {
    if (!customer) return;

    const success = await updateCustomer({ tags: newTags });
    if (success) {
      success('Tags updated successfully');
    } else {
      error('Failed to update tags');
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDrawerOpen(true);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      const success = await addNote(newNote.trim());
      if (success) {
        setNewNote('');
        success('Note added successfully');
      } else {
        error('Failed to add note');
      }
    } finally {
      setIsAddingNote(false);
    }
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

  if (isLoading || !customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const noShowRate = customer.totalAppointments > 0 
    ? Math.round((customer.noShows / customer.totalAppointments) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{customer.name}</h1>
            <p className="text-neutral-600">Customer Profile</p>
          </div>
        </div>
        
        <Button variant="primary" onClick={handleEdit}>
          <Edit2 className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Appointment History
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'notes'
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Notes
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Details Card */}
          <div className="bg-surface border border-neutral-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Contact Details</h2>
            
            <div className="space-y-4">
              <EditableField
                label="Name"
                value={customer.name}
                onSave={(value) => handleFieldUpdate('name', value)}
              />
              
              <EditableField
                label="Email"
                type="email"
                value={customer.email}
                onSave={(value) => handleFieldUpdate('email', value)}
              />
              
              <EditableField
                label="Phone"
                type="tel"
                value={customer.phone || ''}
                onSave={(value) => handleFieldUpdate('phone', value || undefined)}
              />
              
              <TagEditor
                tags={customer.tags}
                availableTags={tags}
                onChange={handleTagsUpdate}
              />
              
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-2">Consent Status</label>
                {getConsentBadge(customer.consentStatus)}
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-surface border border-neutral-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Statistics</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-neutral-900">{customer.totalAppointments}</div>
                <div className="text-sm text-neutral-600">Total Appointments</div>
              </div>
              
              <div className="bg-neutral-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-neutral-900">{customer.completedAppointments}</div>
                <div className="text-sm text-neutral-600">Completed</div>
              </div>
              
              <div className="bg-neutral-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-neutral-900">{customer.noShows}</div>
                <div className="text-sm text-neutral-600">No-Shows</div>
              </div>
              
              <div className="bg-neutral-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-neutral-900">{noShowRate}%</div>
                <div className="text-sm text-neutral-600">No-Show Rate</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <div className="text-sm text-neutral-600">Last Visit</div>
              <div className="text-lg font-medium text-neutral-900">{formatDate(customer.lastVisit)}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-surface border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Reference ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {appointmentsLoading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-neutral-200 rounded animate-pulse"></div></td>
                    </tr>
                  ))
                ) : appointments.length > 0 ? (
                  appointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={() => handleAppointmentClick(appointment)}
                    >
                      <td className="px-6 py-4 text-sm font-mono text-neutral-900">
                        {appointment.referenceId}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{appointment.service}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">{appointment.staffName}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900">
                        {new Date(appointment.dateTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'completed' ? 'bg-success-soft text-success' :
                          appointment.status === 'confirmed' ? 'bg-primary-soft text-primary' :
                          appointment.status === 'cancelled' ? 'bg-danger-soft text-danger' :
                          appointment.status === 'no_show' ? 'bg-warning-soft text-warning' :
                          'bg-neutral-100 text-neutral-600'
                        }`}>
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-600">
                      No appointments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Add Note */}
          <div className="bg-surface border border-neutral-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Add Note</h3>
            
            <div className="space-y-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this customer..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={3}
                maxLength={1000}
              />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">
                  {newNote.length}/1000 characters
                </span>
                
                <Button
                  variant="primary"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isAddingNote}
                >
                  {isAddingNote ? 'Adding...' : 'Save Note'}
                </Button>
              </div>
            </div>
          </div>

          {/* Notes Timeline */}
          <div className="bg-surface border border-neutral-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Notes Timeline</h3>
            
            <div className="space-y-4">
              {notes.length > 0 ? (
                notes.map((note) => <NoteItem key={note.id} note={note} />)
              ) : (
                <div className="text-center py-8 text-neutral-600">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
                  <p>No notes yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Appointment Drawer */}
      <AppointmentDrawer
        appointment={selectedAppointment}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppointment(null);
        }}
      />
    </div>
  );
};

export default CustomerDetailPage;
