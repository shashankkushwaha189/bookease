import React, { useState } from 'react';
import { X, Check, Clock, Calendar, User, Phone, Mail, MessageSquare, Brain, Copy } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';
import ConfirmDialog from './ui/ConfirmDialog';
import Modal from './ui/Modal';
import { useToastStore } from '../stores/toast.store';

// Types
interface Appointment {
  id: string;
  referenceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  service: string;
  duration: number;
  staffId: string;
  staffName: string;
  staffColor: string;
  dateTime: string;
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  seriesId?: string; // For recurring appointments
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show';
  performedBy: string;
  timestamp: string;
  details?: string;
}

interface AppointmentDrawerProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
}

// Mock API hooks
const useAppointmentTimeline = (appointmentId: string) => {
  const [events, setEvents] = React.useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!appointmentId) return;

    const fetchTimeline = async () => {
      setIsLoading(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const mockEvents: TimelineEvent[] = [
          {
            id: '1',
            type: 'created',
            performedBy: 'John Smith',
            timestamp: '2024-03-01T14:30:00',
            details: 'Appointment created online'
          },
          {
            id: '2',
            type: 'confirmed',
            performedBy: 'Sarah Johnson',
            timestamp: '2024-03-01T15:45:00',
            details: 'Appointment confirmed by staff'
          },
          {
            id: '3',
            type: 'rescheduled',
            performedBy: 'Sarah Johnson',
            timestamp: '2024-03-01T16:20:00',
            details: 'Rescheduled from 10:00 AM to 9:00 AM'
          },
        ];
        
        setEvents(mockEvents);
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, [appointmentId]);

  return { events, isLoading };
};

// Components
const EventIcon: React.FC<{ type: TimelineEvent['type'] }> = ({ type }) => {
  const iconMap = {
    created: <Calendar className="w-4 h-4" />,
    confirmed: <Check className="w-4 h-4" />,
    rescheduled: <Clock className="w-4 h-4" />,
    cancelled: <X className="w-4 h-4" />,
    completed: <Check className="w-4 h-4" />,
    no_show: <User className="w-4 h-4" />,
  };

  return iconMap[type] || <Clock className="w-4 h-4" />;
};

const TimelineEventItem: React.FC<{ event: TimelineEvent }> = ({ event }) => {
  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created': return 'text-neutral-500';
      case 'confirmed': return 'text-success';
      case 'rescheduled': return 'text-warning';
      case 'cancelled': return 'text-danger';
      case 'completed': return 'text-success';
      case 'no_show': return 'text-danger';
      default: return 'text-neutral-500';
    }
  };

  return (
    <div className="flex items-start space-x-3 pb-4">
      <div className={`p-2 rounded-full bg-neutral-100 ${getEventColor(event.type)}`}>
        <EventIcon type={event.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-900 capitalize">
            {event.type.replace('_', ' ')}
          </p>
          <p className="text-xs text-neutral-500">
            {new Date(event.timestamp).toLocaleString()}
          </p>
        </div>
        <p className="text-sm text-neutral-600 mt-1">by {event.performedBy}</p>
        {event.details && (
          <p className="text-xs text-neutral-500 mt-1">{event.details}</p>
        )}
      </div>
    </div>
  );
};

const AppointmentDrawer: React.FC<AppointmentDrawerProps> = ({
  appointment,
  isOpen,
  onClose,
}) => {
  const { success, error } = useToastStore();
  const [notes, setNotes] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  const { events, isLoading: timelineLoading } = useAppointmentTimeline(
    appointment?.id || ''
  );

  const copyReferenceId = () => {
    if (appointment?.referenceId) {
      navigator.clipboard.writeText(appointment.referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveNote = async () => {
    if (!appointment) return;

    setIsSavingNote(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Note saved successfully');
    } catch (error) {
      error('Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleConfirm = async () => {
    if (!appointment) return;

    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Appointment confirmed');
      onClose(); // Close drawer to refresh data
    } catch (error) {
      error('Failed to confirm appointment');
    }
  };

  const handleComplete = async () => {
    if (!appointment) return;

    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Appointment marked as completed');
      onClose();
    } catch (error) {
      error('Failed to complete appointment');
    }
  };

  const handleCancel = async () => {
    if (!appointment || !cancelReason.trim()) return;

    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Appointment cancelled');
      setShowCancelDialog(false);
      onClose();
    } catch (error) {
      error('Failed to cancel appointment');
    }
  };

  const handleNoShow = async () => {
    if (!appointment) return;

    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Appointment marked as no-show');
      setShowNoShowDialog(false);
      onClose();
    } catch (error) {
      error('Failed to mark as no-show');
    }
  };

  const generateAISummary = async () => {
    if (!appointment) return;

    setIsGeneratingSummary(true);
    try {
      // Mock AI API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockSummary = `Customer ${appointment.customerName} had a ${appointment.service} appointment with ${appointment.staffName}. The appointment was completed successfully. Customer seemed satisfied with the service and mentioned they would book again. No special notes or concerns were raised during the appointment.`;
      
      setAiSummary(mockSummary);
      success('AI summary generated');
    } catch (error) {
      error('Failed to generate AI summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (!appointment) return null;

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDateTime(appointment.dateTime);

  return (
    <>
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-surface border-l border-neutral-200 shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Appointment Details</h2>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Appointment Summary Card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-neutral-900">Summary</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={copyReferenceId}
                    className="p-1 hover:bg-neutral-200 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-neutral-600" />
                  </button>
                  {copied && (
                    <span className="text-xs text-success">Copied!</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Reference ID</span>
                  <span className="font-mono text-sm text-neutral-900">{appointment.referenceId}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Status</span>
                  <Badge status={appointment.status} />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Service</span>
                  <span className="text-sm text-neutral-900">{appointment.service}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Duration</span>
                  <span className="text-sm text-neutral-900">{appointment.duration} min</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Date</span>
                  <span className="text-sm text-neutral-900">{date}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Time</span>
                  <span className="text-sm text-neutral-900">{time}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Staff</span>
                  <span className="text-sm text-neutral-900">{appointment.staffName}</span>
                </div>
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <h3 className="font-medium text-neutral-900 mb-3">Customer Information</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-neutral-400" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{appointment.customerName}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <div>
                    <p className="text-sm text-neutral-900">{appointment.customerEmail}</p>
                  </div>
                </div>
                
                {appointment.customerPhone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-900">{appointment.customerPhone}</p>
                    </div>
                  </div>
                )}
                
                <Button variant="ghost" size="sm" className="w-full">
                  View Customer Profile
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {appointment.status === 'booked' && (
                <Button variant="primary" onClick={handleConfirm} className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Appointment
                </Button>
              )}
              
              {appointment.status === 'confirmed' && (
                <Button variant="primary" onClick={handleComplete} className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Completed
                </Button>
              )}
              
              {(appointment.status === 'booked' || appointment.status === 'confirmed') && (
                <>
                  {appointment.seriesId ? (
                    // Recurring appointment options
                    <div className="space-y-2">
                      <Button variant="secondary" onClick={() => setShowRescheduleModal(true)} className="w-full">
                        <Clock className="w-4 h-4 mr-2" />
                        Reschedule
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="danger" onClick={() => setShowCancelDialog(true)} className="text-sm">
                          <X className="w-4 h-4 mr-1" />
                          This Only
                        </Button>
                        
                        <Button variant="danger" onClick={() => setShowCancelDialog(true)} className="text-sm">
                          <X className="w-4 h-4 mr-1" />
                          All Future
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Single appointment options
                    <>
                      <Button variant="secondary" onClick={() => setShowRescheduleModal(true)} className="w-full">
                        <Clock className="w-4 h-4 mr-2" />
                        Reschedule
                      </Button>
                      
                      <Button variant="danger" onClick={() => setShowCancelDialog(true)} className="w-full">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              )}
              
              {appointment.status === 'confirmed' && (
                <Button variant="ghost" onClick={() => setShowNoShowDialog(true)} className="w-full">
                  Mark as No-Show
                </Button>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h3 className="font-medium text-neutral-900 mb-4">Timeline</h3>
              
              {timelineLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-neutral-200 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse mb-2"></div>
                        <div className="h-3 bg-neutral-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-0">
                  {events.map((event) => (
                    <TimelineEventItem key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="font-medium text-neutral-900 mb-4">Notes</h3>
              
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this appointment..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={4}
              />
              
              <Button
                variant="secondary"
                onClick={handleSaveNote}
                disabled={!notes.trim() || isSavingNote}
                className="mt-3 w-full"
              >
                {isSavingNote ? 'Saving...' : 'Save Note'}
              </Button>
            </div>

            {/* AI Summary Section */}
            {appointment.status === 'completed' && (
              <div>
                <h3 className="font-medium text-neutral-900 mb-4">AI Summary</h3>
                
                {!aiSummary ? (
                  <Button
                    variant="secondary"
                    onClick={generateAISummary}
                    disabled={isGeneratingSummary}
                    className="w-full"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    {isGeneratingSummary ? 'Generating...' : 'Generate AI Summary'}
                  </Button>
                ) : (
                  <div className="bg-success-soft border border-success rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Brain className="w-4 h-4 text-success mr-2" />
                        <span className="text-sm font-medium text-success">AI Generated Summary</span>
                      </div>
                      <Badge status="confirmed" className="text-xs">95% Confidence</Badge>
                    </div>
                    <p className="text-sm text-neutral-700">{aiSummary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Reschedule Modal */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Appointment"
      >
        <div className="space-y-4">
          <p className="text-neutral-600">
            Select a new date and time for {appointment.customerName}'s {appointment.service} appointment.
          </p>
          
          {/* Reschedule form would go here */}
          <div className="bg-neutral-100 rounded-lg p-4 text-center">
            <p className="text-neutral-600">Reschedule form coming soon...</p>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={() => setShowRescheduleModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" disabled>
              Reschedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment?"
        confirmText="Cancel Appointment"
        onConfirm={handleCancel}
        variant="danger"
      >
        <div className="mt-4">
          <Input
            label="Reason for cancellation"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Please provide a reason..."
            required
          />
        </div>
      </ConfirmDialog>

      {/* No-Show Dialog */}
      <ConfirmDialog
        isOpen={showNoShowDialog}
        onClose={() => setShowNoShowDialog(false)}
        title="Mark as No-Show"
        message="Are you sure you want to mark this appointment as a no-show?"
        confirmText="Mark as No-Show"
        onConfirm={handleNoShow}
        variant="danger"
      />
    </>
  );
};

export default AppointmentDrawer;
