import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useToastStore } from '../stores/toast.store';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface TimeOffRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

const StaffAvailabilityPage: React.FC = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const { user } = useAuthStore();
  const toastStore = useToastStore();

  const [newTimeOff, setNewTimeOff] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [newTimeSlot, setNewTimeSlot] = useState({
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '17:00'
  });

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchStaffAvailability();
    fetchTimeOffRequests();
  }, []);

  const fetchStaffAvailability = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with real API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockTimeSlots: TimeSlot[] = [
        { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { id: '2', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { id: '3', dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { id: '4', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { id: '5', dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isAvailable: true },
      ];
      
      setTimeSlots(mockTimeSlots);
    } catch (error: any) {
      console.error('Failed to fetch availability:', error);
      toastStore.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeOffRequests = async () => {
    try {
      // Mock API call - replace with real API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockRequests: TimeOffRequest[] = [
        {
          id: '1',
          startDate: '2024-12-25',
          endDate: '2024-12-25',
          reason: 'Christmas Holiday',
          status: 'APPROVED',
          createdAt: '2024-12-01T10:00:00Z'
        }
      ];
      
      setTimeOffRequests(mockRequests);
    } catch (error: any) {
      console.error('Failed to fetch time off requests:', error);
      toastStore.error('Failed to load time off requests');
    }
  };

  const handleSaveTimeSlot = async () => {
    try {
      if (editingSlot) {
        // Update existing time slot
        setTimeSlots(prev => prev.map(slot => 
          slot.id === editingSlot.id 
            ? { ...slot, ...newTimeSlot }
            : slot
        ));
        toastStore.success('Availability updated successfully');
      } else {
        // Add new time slot
        const newSlot: TimeSlot = {
          id: Date.now().toString(),
          ...newTimeSlot,
          isAvailable: true
        };
        setTimeSlots(prev => [...prev, newSlot]);
        toastStore.success('Availability added successfully');
      }
      
      setShowAvailabilityModal(false);
      setEditingSlot(null);
      setNewTimeSlot({ dayOfWeek: 0, startTime: '09:00', endTime: '17:00' });
    } catch (error: any) {
      toastStore.error('Failed to save availability');
    }
  };

  const handleDeleteTimeSlot = async (slotId: string) => {
    try {
      setTimeSlots(prev => prev.filter(slot => slot.id !== slotId));
      toastStore.success('Availability removed successfully');
    } catch (error: any) {
      toastStore.error('Failed to remove availability');
    }
  };

  const handleRequestTimeOff = async () => {
    try {
      const newRequest: TimeOffRequest = {
        id: Date.now().toString(),
        ...newTimeOff,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      
      setTimeOffRequests(prev => [...prev, newRequest]);
      toastStore.success('Time off request submitted successfully');
      
      setShowTimeOffModal(false);
      setNewTimeOff({ startDate: '', endDate: '', reason: '' });
    } catch (error: any) {
      toastStore.error('Failed to submit time off request');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Availability</h2>
          <p className="text-gray-600">Manage your work schedule and time off requests</p>
        </div>
      </div>

      {/* Weekly Availability */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Weekly Availability</h3>
          <Button onClick={() => setShowAvailabilityModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Time Slot
          </Button>
        </div>
        
        <div className="p-6">
          {timeSlots.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No availability set</h3>
              <p className="text-gray-500 mb-4">Add your weekly work schedule here.</p>
              <Button onClick={() => setShowAvailabilityModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Availability
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {timeSlots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-24">
                      <span className="font-medium text-gray-900">
                        {daysOfWeek[slot.dayOfWeek]}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{slot.startTime} - {slot.endTime}</span>
                    </div>
                    <Badge status={slot.isAvailable ? 'CONFIRMED' : 'CANCELLED'}>
                      {slot.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSlot(slot);
                        setNewTimeSlot({
                          dayOfWeek: slot.dayOfWeek,
                          startTime: slot.startTime,
                          endTime: slot.endTime
                        });
                        setShowAvailabilityModal(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTimeSlot(slot.id)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time Off Requests */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Time Off Requests</h3>
          <Button onClick={() => setShowTimeOffModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Request Time Off
          </Button>
        </div>
        
        <div className="p-6">
          {timeOffRequests.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No time off requests</h3>
              <p className="text-gray-500 mb-4">Request time off for vacations or personal days.</p>
              <Button onClick={() => setShowTimeOffModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Request Time Off
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {timeOffRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="font-medium text-gray-900">
                        {request.startDate} - {request.endDate}
                      </span>
                      <Badge status={request.status.toLowerCase() as any}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600">{request.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested on {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Availability Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSlot ? 'Edit Availability' : 'Add Availability'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select
                  value={newTimeSlot.dayOfWeek}
                  onChange={(e) => setNewTimeSlot({...newTimeSlot, dayOfWeek: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {daysOfWeek.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newTimeSlot.startTime}
                    onChange={(e) => setNewTimeSlot({...newTimeSlot, startTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newTimeSlot.endTime}
                    onChange={(e) => setNewTimeSlot({...newTimeSlot, endTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAvailabilityModal(false);
                  setEditingSlot(null);
                  setNewTimeSlot({ dayOfWeek: 0, startTime: '09:00', endTime: '17:00' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTimeSlot}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Time Off</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newTimeOff.startDate}
                    onChange={(e) => setNewTimeOff({...newTimeOff, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newTimeOff.endDate}
                    onChange={(e) => setNewTimeOff({...newTimeOff, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={newTimeOff.reason}
                  onChange={(e) => setNewTimeOff({...newTimeOff, reason: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Reason for time off request..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTimeOffModal(false);
                  setNewTimeOff({ startDate: '', endDate: '', reason: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleRequestTimeOff}>
                <Save className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAvailabilityPage;
