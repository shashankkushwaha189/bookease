import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Calendar, Users, Clock, X, Camera, User, Mail, FileText, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StaffModal from '../../components/StaffModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToastStore } from '../../stores/toast.store';

// Types
interface Staff {
  id: string;
  name: string;
  email: string;
  bio?: string;
  photoUrl?: string;
  assignedServices: string[];
  hasAccount: boolean;
  accountEmail?: string;
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: string;
  name: string;
}

interface ScheduleBlock {
  day: number; // 0-6 (Mon-Sun)
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  type: 'working' | 'break' | 'timeoff';
  date?: string; // For timeoff blocks
}

interface TimeOffBlock extends ScheduleBlock {
  id: string;
  reason?: string;
}

// API Hooks (mock implementations - replace with actual API calls)
const useStaff = () => {
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const mockStaff: Staff[] = [
          {
            id: '1',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@salon.com',
            bio: 'Senior stylist with 10+ years experience in modern cuts and coloring',
            assignedServices: ['1', '3', '4'],
            hasAccount: true,
            accountEmail: 'sarah.j@personal.com',
            createdAt: '2024-03-01T10:00:00',
            updatedAt: '2024-03-01T10:00:00'
          },
          {
            id: '2',
            name: 'Mike Wilson',
            email: 'mike.wilson@salon.com',
            bio: 'Specialist in men\'s grooming and beard styling',
            assignedServices: ['1', '2', '3'],
            hasAccount: false,
            createdAt: '2024-03-01T10:30:00',
            updatedAt: '2024-03-01T10:30:00'
          },
          {
            id: '3',
            name: 'Emma Davis',
            email: 'emma.davis@salon.com',
            bio: 'Expert in color treatments, highlights, and styling',
            assignedServices: ['4', '5'],
            hasAccount: true,
            accountEmail: 'emma.d@personal.com',
            createdAt: '2024-03-01T11:00:00',
            updatedAt: '2024-03-01T11:00:00'
          }
        ];
        
        setStaff(mockStaff);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, []);

  const updateStaff = async (staffId: string, updates: Partial<Staff>) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStaff(prev => prev.map(member => 
        member.id === staffId 
          ? { ...member, ...updates, updatedAt: new Date().toISOString() }
          : member
      ));
      
      return true;
    } catch (error) {
      console.error('Failed to update staff:', error);
      return false;
    }
  };

  const deleteStaff = async (staffId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStaff(prev => prev.filter(member => member.id !== staffId));
      return true;
    } catch (error) {
      console.error('Failed to delete staff:', error);
      return false;
    }
  };

  const createStaff = async (staffData: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newStaff: Staff = {
        ...staffData,
        id: `staff-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setStaff(prev => [...prev, newStaff]);
      return newStaff;
    } catch (error) {
      console.error('Failed to create staff:', error);
      return null;
    }
  };

  return { staff, isLoading, updateStaff, deleteStaff, createStaff };
};

const useServices = () => {
  const [services, setServices] = React.useState<Service[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const mockServices: Service[] = [
          { id: '1', name: 'Haircut' },
          { id: '2', name: 'Beard Trim' },
          { id: '3', name: 'Haircut & Beard' },
          { id: '4', name: 'Color & Style' },
          { id: '5', name: 'Full Service' },
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

  return { services, isLoading };
};

const useStaffSchedule = (staffId: string) => {
  const [schedule, setSchedule] = React.useState<ScheduleBlock[]>([]);
  const [timeOff, setTimeOff] = React.useState<TimeOffBlock[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchSchedule = useCallback(async () => {
    if (!staffId) return;

    setIsLoading(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockSchedule: ScheduleBlock[] = [
        // Working hours
        { day: 1, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, type: 'working' }, // Monday
        { day: 2, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, type: 'working' }, // Tuesday
        { day: 3, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, type: 'working' }, // Wednesday
        { day: 4, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, type: 'working' }, // Thursday
        { day: 5, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, type: 'working' }, // Friday
        { day: 6, startHour: 10, startMinute: 0, endHour: 16, endMinute: 0, type: 'working' }, // Saturday
        // Breaks
        { day: 1, startHour: 13, startMinute: 0, endHour: 14, endMinute: 0, type: 'break' }, // Monday lunch
        { day: 2, startHour: 13, startMinute: 0, endHour: 14, endMinute: 0, type: 'break' }, // Tuesday lunch
      ];
      
      const mockTimeOff: TimeOffBlock[] = [
        {
          id: 'to-1',
          day: 0,
          startHour: 0,
          startMinute: 0,
          endHour: 0,
          endMinute: 0,
          type: 'timeoff',
          date: '2024-03-15',
          reason: 'Personal day'
        },
        {
          id: 'to-2',
          day: 0,
          startHour: 0,
          startMinute: 0,
          endHour: 0,
          endMinute: 0,
          type: 'timeoff',
          date: '2024-03-20',
          reason: 'Medical appointment'
        }
      ];
      
      setSchedule(mockSchedule);
      setTimeOff(mockTimeOff);
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    } finally {
      setIsLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const saveSchedule = async (newSchedule: ScheduleBlock[]) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      setSchedule(newSchedule);
      return true;
    } catch (error) {
      console.error('Failed to save schedule:', error);
      return false;
    }
  };

  const addTimeOff = async (timeOffBlock: Omit<TimeOffBlock, 'id'>) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newTimeOff: TimeOffBlock = {
        ...timeOffBlock,
        id: `to-${Date.now()}`
      };
      
      setTimeOff(prev => [...prev, newTimeOff]);
      return newTimeOff;
    } catch (error) {
      console.error('Failed to add time off:', error);
      return null;
    }
  };

  const removeTimeOff = async (timeOffId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTimeOff(prev => prev.filter(block => block.id !== timeOffId));
      return true;
    } catch (error) {
      console.error('Failed to remove time off:', error);
      return false;
    }
  };

  return { schedule, timeOff, isLoading, saveSchedule, addTimeOff, removeTimeOff };
};

// Components
const StaffCard: React.FC<{
  staff: Staff;
  services: Service[];
  onEdit: () => void;
}> = ({ staff, services, onEdit }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getServiceNames = () => {
    return staff.assignedServices
      .map(serviceId => services.find(s => s.id === serviceId)?.name)
      .filter(Boolean);
  };

  return (
    <div className="bg-surface border border-neutral-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
          {staff.photoUrl ? (
            <img 
              src={staff.photoUrl} 
              alt={staff.name} 
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <span className="text-xl font-medium text-primary-soft">
              {getInitials(staff.name)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-neutral-900 mb-1">{staff.name}</h3>
          <p className="text-sm text-neutral-600 mb-2">{staff.email}</p>
          
          {staff.bio && (
            <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{staff.bio}</p>
          )}

          {/* Service Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {getServiceNames().map((serviceName, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary"
              >
                {serviceName}
              </span>
            ))}
          </div>

          {/* Account Status */}
          {staff.hasAccount && (
            <div className="flex items-center text-xs text-neutral-500 mb-3">
              <Users className="w-3 h-3 mr-1" />
              Account linked: {staff.accountEmail}
            </div>
          )}

          {/* Edit Button */}
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
};

const ScheduleGrid: React.FC<{
  staffId: string;
  schedule: ScheduleBlock[];
  timeOff: TimeOffBlock[];
  onScheduleChange: (schedule: ScheduleBlock[]) => void;
  onAddTimeOff: () => void;
  onRemoveTimeOff: (id: string) => void;
}> = ({ staffId, schedule, timeOff, onScheduleChange, onAddTimeOff, onRemoveTimeOff }) => {
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [selectionStart, setSelectionStart] = React.useState<{day: number, hour: number, minute: number} | null>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<{day: number, hour: number, minute: number} | null>(null);

  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getBlockType = (day: number, hour: number, minute: number) => {
    // Check time off first
    const timeOffBlock = timeOff.find(block => {
      if (block.date) {
        const blockDate = new Date(block.date);
        const currentDate = new Date();
        const dayOfWeek = currentDate.getDay();
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0 format
        
        return blockDate.toDateString() === currentDate.toDateString() && adjustedDay === day;
      }
      return false;
    });

    if (timeOffBlock) return 'timeoff';

    // Check working hours
    const workingBlock = schedule.find(block => 
      block.day === day && 
      block.type === 'working' &&
      (hour > block.startHour || (hour === block.startHour && minute >= block.startMinute)) &&
      (hour < block.endHour || (hour === block.endHour && minute <= block.endMinute))
    );

    if (workingBlock) {
      // Check if it's a break
      const breakBlock = schedule.find(block =>
        block.day === day &&
        block.type === 'break' &&
        (hour > block.startHour || (hour === block.startHour && minute >= block.startMinute)) &&
        (hour < block.endHour || (hour === block.endHour && minute <= block.endMinute))
      );

      return breakBlock ? 'break' : 'working';
    }

    return 'empty';
  };

  const getCellClasses = (type: string) => {
    switch (type) {
      case 'working':
        return 'bg-primary-soft hover:bg-primary-100 cursor-pointer';
      case 'break':
        return 'bg-warning-soft hover:bg-warning-100 cursor-pointer diagonal-stripe';
      case 'timeoff':
        return 'bg-danger-soft cursor-not-allowed';
      default:
        return 'hover:bg-neutral-100 cursor-pointer';
    }
  };

  const handleCellMouseDown = (day: number, hour: number, minute: number) => {
    const type = getBlockType(day, hour, minute);
    if (type === 'timeoff') return;

    setIsSelecting(true);
    setSelectionStart({ day, hour, minute });
    setSelectionEnd({ day, hour, minute });
  };

  const handleCellMouseEnter = (day: number, hour: number, minute: number) => {
    if (!isSelecting) return;

    const type = getBlockType(day, hour, minute);
    if (type === 'timeoff') return;

    setSelectionEnd({ day, hour, minute });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) return;

    setIsSelecting(false);

    // Create or remove working hours based on selection
    const newSchedule = [...schedule];
    
    // For simplicity, we'll just toggle working hours for the selected day
    const day = selectionStart.day;
    const existingWorkingIndex = newSchedule.findIndex(block => 
      block.day === day && block.type === 'working'
    );

    if (existingWorkingIndex >= 0) {
      // Remove working hours for this day
      newSchedule.splice(existingWorkingIndex, 1);
    } else {
      // Add working hours (9am-5pm default)
      newSchedule.push({
        day,
        startHour: 9,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
        type: 'working'
      });
    }

    onScheduleChange(newSchedule);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, selectionStart, selectionEnd]);

  return (
    <div className="space-y-6">
      {/* Schedule Grid */}
      <div className="bg-surface border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid grid-cols-8 bg-neutral-50 border-b border-neutral-200">
              <div className="p-3 text-sm font-medium text-neutral-600">Time</div>
              {days.map((day, index) => (
                <div key={index} className="p-3 text-sm font-medium text-neutral-600 text-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-neutral-100">
                  <div className="p-3 text-sm text-neutral-600 font-medium">
                    {hour}:00
                  </div>
                  {days.map((_, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`h-12 border-r border-neutral-100 ${getCellClasses(getBlockType(dayIndex, hour, 0))}`}
                      onMouseDown={() => handleCellMouseDown(dayIndex, hour, 0)}
                      onMouseEnter={() => handleCellMouseEnter(dayIndex, hour, 0)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time Off List */}
      <div className="bg-surface border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-neutral-900">Holidays & Time Off</h3>
          <Button variant="secondary" onClick={onAddTimeOff}>
            <Plus className="w-4 h-4 mr-1" />
            Add Time Off
          </Button>
        </div>

        {timeOff.length > 0 ? (
          <div className="space-y-3">
            {timeOff.map((block) => (
              <div key={block.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div>
                  <div className="font-medium text-neutral-900">{block.date}</div>
                  {block.reason && (
                    <div className="text-sm text-neutral-600">{block.reason}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveTimeOff(block.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-600">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
            <p>No time off scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component
const StaffPage: React.FC = () => {
  const { success, error } = useToastStore();
  const [activeTab, setActiveTab] = React.useState<'list' | 'schedule'>('list');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<Staff | null>(null);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>('');
  const [deletingStaff, setDeletingStaff] = React.useState<Staff | null>(null);
  const [showTimeOffModal, setShowTimeOffModal] = React.useState(false);

  const { staff, isLoading, updateStaff, deleteStaff, createStaff } = useStaff();
  const { services } = useServices();
  const { schedule, timeOff, saveSchedule, addTimeOff, removeTimeOff } = useStaffSchedule(selectedStaffId);

  // Filter staff
  const filteredStaff = React.useMemo(() => {
    if (!searchQuery) return staff;
    
    return staff.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staff, searchQuery]);

  // Event handlers
  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleDelete = (staffMember: Staff) => {
    setDeletingStaff(staffMember);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;

    const success = await deleteStaff(deletingStaff.id);
    if (success) {
      success('Staff member deleted successfully');
      setDeletingStaff(null);
    } else {
      error('Failed to delete staff member');
    }
  };

  const handleAddStaff = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleModalSave = async (staffData: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingStaff) {
      // Update existing staff
      const success = await updateStaff(editingStaff.id, staffData);
      if (success) {
        success('Staff member updated successfully');
        setIsModalOpen(false);
        setEditingStaff(null);
      } else {
        error('Failed to update staff member');
      }
    } else {
      // Create new staff
      const newStaff = await createStaff(staffData);
      if (newStaff) {
        success('Staff member created successfully');
        setIsModalOpen(false);
      } else {
        error('Failed to create staff member');
      }
    }
  };

  const handleScheduleSave = async () => {
    const success = await saveSchedule(schedule);
    if (success) {
      success('Schedule saved successfully');
    } else {
      error('Failed to save schedule');
    }
  };

  const handleAddTimeOff = () => {
    setShowTimeOffModal(true);
  };

  const handleRemoveTimeOff = async (timeOffId: string) => {
    const success = await removeTimeOff(timeOffId);
    if (success) {
      success('Time off removed successfully');
    } else {
      error('Failed to remove time off');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Staff</h1>
          <p className="text-neutral-600">Manage your team members and their schedules</p>
        </div>
        {activeTab === 'list' && (
          <Button variant="primary" onClick={handleAddStaff}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'list'
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Staff List
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'schedule'
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Schedules
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' ? (
        <div className="space-y-6">
          {/* Search */}
          <div className="w-full md:w-96">
            <Input
              placeholder="Search staff members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Staff Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="bg-surface border border-neutral-200 rounded-lg p-6">
                  <div className="animate-pulse">
                    <div className="w-16 h-16 bg-neutral-200 rounded-full mb-4"></div>
                    <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredStaff.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map((staffMember) => (
                <StaffCard
                  key={staffMember.id}
                  staff={staffMember}
                  services={services}
                  onEdit={() => handleEdit(staffMember)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-neutral-200 rounded-lg p-12 text-center">
              <div className="w-16 h-16 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No staff members yet</h3>
              <p className="text-neutral-600 mb-6">Get started by adding your first team member</p>
              <Button variant="primary" onClick={handleAddStaff}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first staff member
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Staff Selector */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-neutral-900">Select Staff:</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Choose a staff member</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            {selectedStaffId && (
              <Button variant="primary" onClick={handleScheduleSave}>
                Save Schedule
              </Button>
            )}
          </div>

          {/* Schedule Grid */}
          {selectedStaffId ? (
            <ScheduleGrid
              staffId={selectedStaffId}
              schedule={schedule}
              timeOff={timeOff}
              onScheduleChange={saveSchedule}
              onAddTimeOff={handleAddTimeOff}
              onRemoveTimeOff={handleRemoveTimeOff}
            />
          ) : (
            <div className="bg-surface border border-neutral-200 rounded-lg p-12 text-center">
              <Calendar className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">Select a staff member</h3>
              <p className="text-neutral-600">Choose a staff member to view and edit their schedule</p>
            </div>
          )}
        </div>
      )}

      {/* Staff Modal */}
      <StaffModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStaff(null);
        }}
        staff={editingStaff}
        services={services}
        onSave={handleModalSave}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingStaff}
        onClose={() => setDeletingStaff(null)}
        title="Delete Staff Member"
        message={`Are you sure you want to delete "${deletingStaff?.name}"? This action cannot be undone.`}
        confirmText="Delete Staff Member"
        onConfirm={handleConfirmDelete}
        variant="danger"
      />

      <style jsx>{`
        .diagonal-stripe {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.1) 2px,
            rgba(0, 0, 0, 0.1) 4px
          );
        }
      `}</style>
    </div>
  );
};

export default StaffPage;
