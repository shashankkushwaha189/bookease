import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Clock, 
  Calendar, 
  CreditCard, 
  Bell, 
  Mail, 
  Smartphone, 
  Shield, 
  FileText, 
  Save, 
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { useTenantStore } from '../stores/tenant.store';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

// Types
interface BookingPolicy {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  settings: {
    cancellationWindow: number; // hours before appointment
    rescheduleWindow: number; // hours before appointment
    noShowPolicy: 'warning' | 'block' | 'charge';
    noShowFee?: number;
    requireDeposit: boolean;
    depositAmount?: number;
    depositType: 'fixed' | 'percentage';
    maxAdvanceBooking: number; // days
    minAdvanceBooking: number; // hours
    allowWaitlist: boolean;
    autoConfirm: boolean;
  };
}

interface NotificationSettings {
  emailReminders: {
    enabled: boolean;
    timing: number[]; // hours before appointment
    includeCalendarInvite: boolean;
  };
  smsReminders: {
    enabled: boolean;
    timing: number[]; // hours before appointment
  };
  confirmations: {
    email: boolean;
    sms: boolean;
  };
  cancellations: {
    email: boolean;
    sms: boolean;
  };
  rescheduling: {
    email: boolean;
    sms: boolean;
  };
}

interface WorkingHours {
  monday: { isOpen: boolean; openTime: string; closeTime: string; breakStart?: string; breakEnd?: string };
  tuesday: { isOpen: boolean; openTime: string; closeTime: string; breakStart?: string; breakEnd?: string };
  wednesday: { isOpen: boolean; openTime: string; closeTime: string; breakStart?: string; breakEnd?: string };
  thursday: { isOpen: boolean; openTime: string; closeTime: string; breakStart?: string; breakEnd?: string };
  friday: { isOpen: boolean; openTime: string; closeTime: string; breakStart?: string; breakEnd?: string };
  saturday: { isOpen: boolean; openTime: string; closeTime: string; breakStart?: string; breakEnd?: string };
  sunday: { isOpen: boolean; openTime: string; closeTime: string; breakStart?: string; breakEnd?: string };
}

interface PaymentSettings {
  acceptPayments: boolean;
  requirePayment: boolean;
  paymentMethods: string[];
  currency: string;
  refundPolicy: {
    enabled: boolean;
    window: number; // days
    automaticRefund: boolean;
  };
}

const ConfigPage: React.FC = () => {
  const toastStore = useToastStore();
  const { businessProfile } = useTenantStore();
  
  // State
  const [activeTab, setActiveTab] = useState<'policies' | 'notifications' | 'hours' | 'payments'>('policies');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Policies state
  const [bookingPolicies, setBookingPolicies] = useState<BookingPolicy[]>([
    {
      id: 'cancellation',
      name: 'Cancellation Policy',
      description: 'Rules for appointment cancellations and rescheduling',
      isEnabled: true,
      settings: {
        cancellationWindow: 24,
        rescheduleWindow: 12,
        noShowPolicy: 'warning',
        noShowFee: 25,
        requireDeposit: false,
        depositAmount: 50,
        depositType: 'fixed',
        maxAdvanceBooking: 90,
        minAdvanceBooking: 2,
        allowWaitlist: true,
        autoConfirm: false,
      },
    },
    {
      id: 'deposit',
      name: 'Deposit Policy',
      description: 'Requirements for booking deposits',
      isEnabled: false,
      settings: {
        cancellationWindow: 24,
        rescheduleWindow: 12,
        noShowPolicy: 'warning',
        requireDeposit: true,
        depositAmount: 25,
        depositType: 'percentage',
        maxAdvanceBooking: 90,
        minAdvanceBooking: 2,
        allowWaitlist: true,
        autoConfirm: true,
      },
    },
    {
      id: 'no-show',
      name: 'No-Show Policy',
      description: 'Handling of missed appointments',
      isEnabled: true,
      settings: {
        cancellationWindow: 24,
        rescheduleWindow: 12,
        noShowPolicy: 'charge',
        noShowFee: 50,
        requireDeposit: false,
        depositAmount: 0,
        depositType: 'fixed',
        maxAdvanceBooking: 90,
        minAdvanceBooking: 2,
        allowWaitlist: false,
        autoConfirm: false,
      },
    },
  ]);

  // Notifications state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailReminders: {
      enabled: true,
      timing: [24, 2],
      includeCalendarInvite: true,
    },
    smsReminders: {
      enabled: false,
      timing: [2],
    },
    confirmations: {
      email: true,
      sms: false,
    },
    cancellations: {
      email: true,
      sms: true,
    },
    rescheduling: {
      email: true,
      sms: false,
    },
  });

  // Working hours state
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { isOpen: true, openTime: '09:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '15:00' },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
  });

  // Payment settings state
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    acceptPayments: true,
    requirePayment: false,
    paymentMethods: ['credit_card', 'debit_card'],
    currency: 'USD',
    refundPolicy: {
      enabled: true,
      window: 7,
      automaticRefund: false,
    },
  });

  // Actions
  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setHasChanges(false);
      toastStore.success('Settings saved successfully');
    } catch (error) {
      toastStore.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSettings = () => {
    // Reset to default values
    setHasChanges(false);
    toastStore.info('Settings reset to defaults');
  };

  const updatePolicy = (policyId: string, updates: Partial<BookingPolicy>) => {
    setBookingPolicies(policies =>
      policies.map(policy =>
        policy.id === policyId ? { ...policy, ...updates } : policy
      )
    );
    setHasChanges(true);
  };

  const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
    setNotificationSettings({ ...notificationSettings, ...updates });
    setHasChanges(true);
  };

  const updateWorkingHours = (day: keyof WorkingHours, updates: Partial<WorkingHours[keyof WorkingHours]>) => {
    setWorkingHours({ ...workingHours, [day]: { ...workingHours[day], ...updates } });
    setHasChanges(true);
  };

  const updatePaymentSettings = (updates: Partial<PaymentSettings>) => {
    setPaymentSettings({ ...paymentSettings, ...updates });
    setHasChanges(true);
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  const renderPoliciesTab = () => (
    <div className="space-y-6">
      {bookingPolicies.map((policy) => (
        <div key={policy.id} className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">{policy.name}</h3>
              <p className="text-sm text-neutral-600">{policy.description}</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={policy.isEnabled}
                onChange={(e) => updatePolicy(policy.id, { isEnabled: e.target.checked })}
                className="sr-only"
              />
              <div className={`relative w-11 h-6 transition-colors rounded-full ${
                policy.isEnabled ? 'bg-brand-500' : 'bg-neutral-200'
              }`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  policy.isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </label>
          </div>

          {policy.isEnabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Cancellation Window (hours)
                  </label>
                  <Input
                    type="number"
                    value={policy.settings.cancellationWindow}
                    onChange={(e) => updatePolicy(policy.id, {
                      settings: { ...policy.settings, cancellationWindow: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Reschedule Window (hours)
                  </label>
                  <Input
                    type="number"
                    value={policy.settings.rescheduleWindow}
                    onChange={(e) => updatePolicy(policy.id, {
                      settings: { ...policy.settings, rescheduleWindow: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    No-Show Policy
                  </label>
                  <select
                    value={policy.settings.noShowPolicy}
                    onChange={(e) => updatePolicy(policy.id, {
                      settings: { ...policy.settings, noShowPolicy: e.target.value as any }
                    })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="warning">Warning Only</option>
                    <option value="block">Block Future Bookings</option>
                    <option value="charge">Charge Fee</option>
                  </select>
                </div>

                {policy.settings.noShowPolicy === 'charge' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      No-Show Fee ($)
                    </label>
                    <Input
                      type="number"
                      value={policy.settings.noShowFee || 0}
                      onChange={(e) => updatePolicy(policy.id, {
                        settings: { ...policy.settings, noShowFee: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Max Advance Booking (days)
                  </label>
                  <Input
                    type="number"
                    value={policy.settings.maxAdvanceBooking}
                    onChange={(e) => updatePolicy(policy.id, {
                      settings: { ...policy.settings, maxAdvanceBooking: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Min Advance Booking (hours)
                  </label>
                  <Input
                    type="number"
                    value={policy.settings.minAdvanceBooking}
                    onChange={(e) => updatePolicy(policy.id, {
                      settings: { ...policy.settings, minAdvanceBooking: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Reminder Settings</h3>
        
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-neutral-600 mr-2" />
                <span className="font-medium text-neutral-900">Email Reminders</span>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.emailReminders.enabled}
                  onChange={(e) => updateNotificationSettings({
                    emailReminders: { ...notificationSettings.emailReminders, enabled: e.target.checked }
                  })}
                  className="sr-only"
                />
                <div className={`relative w-11 h-6 transition-colors rounded-full ${
                  notificationSettings.emailReminders.enabled ? 'bg-brand-500' : 'bg-neutral-200'
                }`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notificationSettings.emailReminders.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>

            {notificationSettings.emailReminders.enabled && (
              <div className="ml-7 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Send reminders (hours before appointment)
                  </label>
                  <div className="flex space-x-2">
                    {[24, 2, 1].map(hours => (
                      <label key={hours} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailReminders.timing.includes(hours)}
                          onChange={(e) => {
                            const timing = e.target.checked
                              ? [...notificationSettings.emailReminders.timing, hours]
                              : notificationSettings.emailReminders.timing.filter(h => h !== hours);
                            updateNotificationSettings({
                              emailReminders: { ...notificationSettings.emailReminders, timing }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-neutral-700">{hours}h before</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailReminders.includeCalendarInvite}
                    onChange={(e) => updateNotificationSettings({
                      emailReminders: { ...notificationSettings.emailReminders, includeCalendarInvite: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-neutral-700">Include calendar invite</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Smartphone className="w-5 h-5 text-neutral-600 mr-2" />
                <span className="font-medium text-neutral-900">SMS Reminders</span>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.smsReminders.enabled}
                  onChange={(e) => updateNotificationSettings({
                    smsReminders: { ...notificationSettings.smsReminders, enabled: e.target.checked }
                  })}
                  className="sr-only"
                />
                <div className={`relative w-11 h-6 transition-colors rounded-full ${
                  notificationSettings.smsReminders.enabled ? 'bg-brand-500' : 'bg-neutral-200'
                }`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notificationSettings.smsReminders.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>

            {notificationSettings.smsReminders.enabled && (
              <div className="ml-7">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Send reminders (hours before appointment)
                  </label>
                  <div className="flex space-x-2">
                    {[2, 1].map(hours => (
                      <label key={hours} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={notificationSettings.smsReminders.timing.includes(hours)}
                          onChange={(e) => {
                            const timing = e.target.checked
                              ? [...notificationSettings.smsReminders.timing, hours]
                              : notificationSettings.smsReminders.timing.filter(h => h !== hours);
                            updateNotificationSettings({
                              smsReminders: { ...notificationSettings.smsReminders, timing }
                            });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-neutral-700">{hours}h before</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Notification Types</h3>
        
        <div className="space-y-4">
          {[
            { key: 'confirmations', label: 'Booking Confirmations' },
            { key: 'cancellations', label: 'Cancellation Notices' },
            { key: 'rescheduling', label: 'Rescheduling Notices' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-neutral-900">{label}</span>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <Mail className="w-4 h-4 text-neutral-400 mr-1" />
                  <input
                    type="checkbox"
                    checked={notificationSettings[key as keyof NotificationSettings].email}
                    onChange={(e) => updateNotificationSettings({
                      [key]: { ...notificationSettings[key as keyof NotificationSettings], email: e.target.checked }
                    })}
                    className="mr-1"
                  />
                  <span className="text-sm text-neutral-700">Email</span>
                </label>
                <label className="flex items-center">
                  <Smartphone className="w-4 h-4 text-neutral-400 mr-1" />
                  <input
                    type="checkbox"
                    checked={notificationSettings[key as keyof NotificationSettings].sms}
                    onChange={(e) => updateNotificationSettings({
                      [key]: { ...notificationSettings[key as keyof NotificationSettings], sms: e.target.checked }
                    })}
                    className="mr-1"
                  />
                  <span className="text-sm text-neutral-700">SMS</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHoursTab = () => (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Business Hours</h3>
      
      <div className="space-y-4">
        {daysOfWeek.map((day) => (
          <div key={day} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
            <div className="flex items-center space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={workingHours[day].isOpen}
                  onChange={(e) => updateWorkingHours(day, { isOpen: e.target.checked })}
                  className="mr-3"
                />
                <span className="font-medium text-neutral-900 capitalize">{day}</span>
              </label>
            </div>
            
            {workingHours[day].isOpen && (
              <div className="flex items-center space-x-3">
                <Input
                  type="time"
                  value={workingHours[day].openTime}
                  onChange={(e) => updateWorkingHours(day, { openTime: e.target.value })}
                  className="w-32"
                />
                <span className="text-neutral-500">to</span>
                <Input
                  type="time"
                  value={workingHours[day].closeTime}
                  onChange={(e) => updateWorkingHours(day, { closeTime: e.target.value })}
                  className="w-32"
                />
                
                {workingHours[day].breakStart && (
                  <>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="text-sm text-neutral-500">Break:</span>
                      <Input
                        type="time"
                        value={workingHours[day].breakStart}
                        onChange={(e) => updateWorkingHours(day, { breakStart: e.target.value })}
                        className="w-28"
                      />
                      <span className="text-neutral-500">to</span>
                      <Input
                        type="time"
                        value={workingHours[day].breakEnd}
                        onChange={(e) => updateWorkingHours(day, { breakEnd: e.target.value })}
                        className="w-28"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPaymentsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Payment Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-neutral-900">Accept Payments</span>
              <p className="text-sm text-neutral-600">Enable online payment processing</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={paymentSettings.acceptPayments}
                onChange={(e) => updatePaymentSettings({ acceptPayments: e.target.checked })}
                className="sr-only"
              />
              <div className={`relative w-11 h-6 transition-colors rounded-full ${
                paymentSettings.acceptPayments ? 'bg-brand-500' : 'bg-neutral-200'
              }`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  paymentSettings.acceptPayments ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-neutral-900">Require Payment at Booking</span>
              <p className="text-sm text-neutral-600">Require payment to confirm appointments</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={paymentSettings.requirePayment}
                onChange={(e) => updatePaymentSettings({ requirePayment: e.target.checked })}
                className="sr-only"
              />
              <div className={`relative w-11 h-6 transition-colors rounded-full ${
                paymentSettings.requirePayment ? 'bg-brand-500' : 'bg-neutral-200'
              }`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  paymentSettings.requirePayment ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Currency</label>
            <select
              value={paymentSettings.currency}
              onChange={(e) => updatePaymentSettings({ currency: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Refund Policy</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-neutral-900">Enable Refunds</span>
              <p className="text-sm text-neutral-600">Allow customers to request refunds</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={paymentSettings.refundPolicy.enabled}
                onChange={(e) => updatePaymentSettings({
                  refundPolicy: { ...paymentSettings.refundPolicy, enabled: e.target.checked }
                })}
                className="sr-only"
              />
              <div className={`relative w-11 h-6 transition-colors rounded-full ${
                paymentSettings.refundPolicy.enabled ? 'bg-brand-500' : 'bg-neutral-200'
              }`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  paymentSettings.refundPolicy.enabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </label>
          </div>

          {paymentSettings.refundPolicy.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Refund Window (days)
                </label>
                <Input
                  type="number"
                  value={paymentSettings.refundPolicy.window}
                  onChange={(e) => updatePaymentSettings({
                    refundPolicy: { ...paymentSettings.refundPolicy, window: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={paymentSettings.refundPolicy.automaticRefund}
                  onChange={(e) => updatePaymentSettings({
                    refundPolicy: { ...paymentSettings.refundPolicy, automaticRefund: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-neutral-700">Automatic refunds</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Configuration</h2>
          <p className="text-neutral-600">Manage business policies and settings</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Badge variant="warning">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={handleResetSettings}
            disabled={isLoading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSaveSettings}
            loading={isLoading}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-neutral-200">
        <div className="flex space-x-1 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'policies'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <FileText className="w-4 h-4 mr-2 inline" />
            Booking Policies
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Bell className="w-4 h-4 mr-2 inline" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('hours')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'hours'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Clock className="w-4 h-4 mr-2 inline" />
            Working Hours
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <CreditCard className="w-4 h-4 mr-2 inline" />
            Payments
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'policies' && renderPoliciesTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'hours' && renderHoursTab()}
          {activeTab === 'payments' && renderPaymentsTab()}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-800 mb-1">Policy Configuration Tips</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Set clear cancellation windows to protect your schedule</li>
              <li>• Enable deposits for high-value services to reduce no-shows</li>
              <li>• Configure reminders to improve appointment attendance</li>
              <li>• Keep working hours consistent with your availability</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;
