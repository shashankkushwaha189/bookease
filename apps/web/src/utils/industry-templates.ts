/**
 * Industry-Specific Templates for BookEase
 * Provides pre-configured workflows, forms, and settings for different industries
 */

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  category: 'healthcare' | 'salon' | 'consulting' | 'education' | 'fitness' | 'other';
  icon: string;
  color: string;
  
  // Service templates
  services: ServiceTemplate[];
  
  // Form templates
  customerForm: FormTemplate;
  appointmentForm: FormTemplate;
  
  // Workflow configurations
  workflows: WorkflowTemplate[];
  
  // Email templates
  emailTemplates: EmailTemplate[];
  
  // Settings
  defaultSettings: IndustrySettings;
  
  // Features specific to industry
  features: string[];
  
  // Compliance requirements
  compliance?: ComplianceRequirements;
}

export interface ServiceTemplate {
  name: string;
  description: string;
  duration: number;
  price?: number;
  category: string;
  color: string;
  requiresDeposit: boolean;
  depositAmount?: number;
  bufferBefore?: number;
  bufferAfter?: number;
  maxAdvanceBooking?: number;
  cancellationPolicy?: string;
  customFields?: Record<string, any>;
}

export interface FormTemplate {
  fields: FormField[];
  layout: 'single-column' | 'two-column' | 'tabs';
  validation: ValidationRule[];
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: ValidationRule[];
  defaultValue?: any;
  conditional?: ConditionalRule;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'require' | 'optional';
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: 'appointment.created' | 'appointment.confirmed' | 'appointment.completed' | 'appointment.cancelled' | 'customer.created';
  actions: WorkflowAction[];
  isActive: boolean;
}

export interface WorkflowAction {
  type: 'send_email' | 'send_sms' | 'create_task' | 'update_field' | 'webhook' | 'delay';
  config: Record<string, any>;
  delay?: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  type: 'confirmation' | 'reminder' | 'cancellation' | 'followup' | 'marketing';
}

export interface IndustrySettings {
  timezone: string;
  workingHours: WorkingHours;
  appointmentSettings: AppointmentSettings;
  notificationSettings: NotificationSettings;
  paymentSettings: PaymentSettings;
}

export interface WorkingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface AppointmentSettings {
  defaultDuration: number;
  minAdvanceBooking: number;
  maxAdvanceBooking: number;
  cancellationWindow: number;
  allowRescheduling: boolean;
  requireDeposit: boolean;
  defaultDepositAmount?: number;
}

export interface NotificationSettings {
  emailReminders: boolean;
  smsReminders: boolean;
  reminderTiming: number[]; // hours before appointment
  confirmations: boolean;
  cancellations: boolean;
}

export interface PaymentSettings {
  acceptPayments: boolean;
  requirePayment: boolean;
  paymentMethods: string[];
  currency: string;
}

export interface ComplianceRequirements {
  hipaa?: boolean;
  gdpr?: boolean;
  pciDss?: boolean;
  dataRetention?: number; // days
  consentRequired?: boolean;
  auditLogging?: boolean;
}

// Industry Templates
export const industryTemplates: IndustryTemplate[] = [
  {
    id: 'healthcare-clinic',
    name: 'Healthcare Clinic',
    description: 'Complete setup for medical clinics, hospitals, and healthcare practices',
    category: 'healthcare',
    icon: '🏥',
    color: '#0ea5e9',
    
    services: [
      {
        name: 'General Consultation',
        description: 'Standard medical consultation with doctor',
        duration: 30,
        price: 150,
        category: 'Consultation',
        color: '#3b82f6',
        requiresDeposit: false,
        bufferBefore: 15,
        bufferAfter: 15,
        maxAdvanceBooking: 90,
        customFields: {
          requiresReferral: false,
          consultationType: 'general',
        },
      },
      {
        name: 'Specialist Consultation',
        description: 'Specialist medical consultation',
        duration: 45,
        price: 250,
        category: 'Specialist',
        color: '#8b5cf6',
        requiresDeposit: true,
        depositAmount: 50,
        bufferBefore: 15,
        bufferAfter: 15,
        maxAdvanceBooking: 90,
        customFields: {
          specialistType: 'cardiologist',
          requiresReferral: true,
        },
      },
      {
        name: 'Annual Checkup',
        description: 'Comprehensive annual health examination',
        duration: 60,
        price: 300,
        category: 'Preventive',
        color: '#10b981',
        requiresDeposit: false,
        bufferBefore: 30,
        bufferAfter: 30,
        maxAdvanceBooking: 365,
        customFields: {
          includeLabs: true,
          includeImaging: false,
        },
      },
    ],
    
    customerForm: {
      fields: [
        {
          id: 'firstName',
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          required: true,
          validation: [{ type: 'required', message: 'First name is required' }],
        },
        {
          id: 'lastName',
          name: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: true,
          validation: [{ type: 'required', message: 'Last name is required' }],
        },
        {
          id: 'email',
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          validation: [
            { type: 'required', message: 'Email is required' },
            { type: 'email', message: 'Please enter a valid email' },
          ],
        },
        {
          id: 'phone',
          name: 'phone',
          label: 'Phone Number',
          type: 'phone',
          required: true,
          validation: [
            { type: 'required', message: 'Phone number is required' },
            { type: 'phone', message: 'Please enter a valid phone number' },
          ],
        },
        {
          id: 'dateOfBirth',
          name: 'dateOfBirth',
          label: 'Date of Birth',
          type: 'date',
          required: true,
          validation: [{ type: 'required', message: 'Date of birth is required' }],
        },
        {
          id: 'insuranceProvider',
          name: 'insuranceProvider',
          label: 'Insurance Provider',
          type: 'text',
          required: false,
        },
        {
          id: 'insuranceNumber',
          name: 'insuranceNumber',
          label: 'Insurance Number',
          type: 'text',
          required: false,
          conditional: {
            field: 'insuranceProvider',
            operator: 'not_equals',
            value: '',
            action: 'require',
          },
        },
        {
          id: 'medicalHistory',
          name: 'medicalHistory',
          label: 'Medical History / Allergies',
          type: 'textarea',
          required: false,
        },
        {
          id: 'consent',
          name: 'consent',
          label: 'I consent to treatment and acknowledge privacy policy',
          type: 'checkbox',
          required: true,
          validation: [{ type: 'required', message: 'Consent is required' }],
        },
      ],
      layout: 'two-column',
      validation: [],
    },
    
    appointmentForm: {
      fields: [
        {
          id: 'service',
          name: 'service',
          label: 'Service Type',
          type: 'select',
          required: true,
          options: ['General Consultation', 'Specialist Consultation', 'Annual Checkup'],
          validation: [{ type: 'required', message: 'Please select a service' }],
        },
        {
          id: 'preferredDoctor',
          name: 'preferredDoctor',
          label: 'Preferred Doctor',
          type: 'select',
          required: false,
          options: ['Dr. Smith', 'Dr. Johnson', 'Dr. Williams'],
        },
        {
          id: 'symptoms',
          name: 'symptoms',
          label: 'Reason for Visit / Symptoms',
          type: 'textarea',
          required: true,
          validation: [{ type: 'required', message: 'Please describe your symptoms' }],
        },
        {
          id: 'urgency',
          name: 'urgency',
          label: 'Urgency Level',
          type: 'radio',
          required: true,
          options: ['Routine', 'Urgent', 'Emergency'],
          validation: [{ type: 'required', message: 'Please select urgency level' }],
        },
      ],
      layout: 'single-column',
      validation: [],
    },
    
    workflows: [
      {
        id: 'appointment-confirmation',
        name: 'Appointment Confirmation',
        description: 'Send confirmation email and SMS when appointment is booked',
        trigger: 'appointment.created',
        actions: [
          {
            type: 'send_email',
            config: {
              template: 'appointment-confirmation',
              recipient: 'customer',
            },
          },
          {
            type: 'send_sms',
            config: {
              template: 'appointment-reminder',
              recipient: 'customer',
              timing: 24, // hours before
            },
          },
        ],
        isActive: true,
      },
      {
        id: 'medical-record-update',
        name: 'Medical Record Update',
        description: 'Update medical records after appointment completion',
        trigger: 'appointment.completed',
        actions: [
          {
            type: 'create_task',
            config: {
              assignee: 'doctor',
              task: 'Update patient medical records',
              priority: 'high',
            },
          },
        ],
        isActive: true,
      },
    ],
    
    emailTemplates: [
      {
        id: 'appointment-confirmation',
        name: 'Appointment Confirmation',
        subject: 'Appointment Confirmation - {{businessName}}',
        body: 'Dear {{customer.firstName}},\n\nYour appointment is confirmed for {{appointment.date}} at {{appointment.time}} with {{appointment.doctor}}.\n\nPlease arrive 15 minutes early.\n\nIf you need to cancel or reschedule, please call us at {{business.phone}}.\n\nBest regards,\n{{businessName}}',
        variables: ['customer.firstName', 'appointment.date', 'appointment.time', 'appointment.doctor', 'businessName', 'business.phone'],
        type: 'confirmation',
      },
      {
        id: 'appointment-reminder',
        name: 'Appointment Reminder',
        subject: 'Reminder: Your appointment tomorrow',
        body: 'Dear {{customer.firstName}},\n\nThis is a reminder about your appointment tomorrow at {{appointment.time}}.\n\nPlease remember to bring your insurance card and any relevant medical documents.\n\nSee you tomorrow!\n{{businessName}}',
        variables: ['customer.firstName', 'appointment.time', 'businessName'],
        type: 'reminder',
      },
    ],
    
    defaultSettings: {
      timezone: 'America/New_York',
      workingHours: {
        monday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        friday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '14:00' },
        sunday: { isOpen: false },
      },
      appointmentSettings: {
        defaultDuration: 30,
        minAdvanceBooking: 24,
        maxAdvanceBooking: 90,
        cancellationWindow: 24,
        allowRescheduling: true,
        requireDeposit: false,
      },
      notificationSettings: {
        emailReminders: true,
        smsReminders: true,
        reminderTiming: [24, 2], // 24 hours and 2 hours before
        confirmations: true,
        cancellations: true,
      },
      paymentSettings: {
        acceptPayments: true,
        requirePayment: false,
        paymentMethods: ['credit_card', 'debit_card', 'insurance'],
        currency: 'USD',
      },
    },
    
    features: [
      'HIPAA Compliance',
      'Medical Records Management',
      'Insurance Integration',
      'Doctor Scheduling',
      'Patient Portal',
      'Prescription Management',
      'Lab Results Integration',
      'Telemedicine Support',
    ],
    
    compliance: {
      hipaa: true,
      gdpr: true,
      pciDss: true,
      dataRetention: 2555, // 7 years
      consentRequired: true,
      auditLogging: true,
    },
  },
  
  {
    id: 'salon-spa',
    name: 'Salon & Spa',
    description: 'Complete setup for hair salons, spas, and beauty services',
    category: 'salon',
    icon: '💇',
    color: '#d946ef',
    
    services: [
      {
        name: 'Haircut',
        description: 'Professional haircut and styling',
        duration: 45,
        price: 60,
        category: 'Hair',
        color: '#ec4899',
        requiresDeposit: false,
        bufferBefore: 15,
        bufferAfter: 15,
      },
      {
        name: 'Hair Color',
        description: 'Full hair color service',
        duration: 120,
        price: 120,
        category: 'Hair',
        color: '#f97316',
        requiresDeposit: true,
        depositAmount: 30,
        bufferBefore: 30,
        bufferAfter: 30,
      },
      {
        name: 'Massage',
        description: 'Relaxing full body massage',
        duration: 60,
        price: 90,
        category: 'Massage',
        color: '#06b6d4',
        requiresDeposit: true,
        depositAmount: 25,
        bufferBefore: 15,
        bufferAfter: 30,
      },
      {
        name: 'Facial',
        description: 'Rejuvenating facial treatment',
        duration: 75,
        price: 110,
        category: 'Skincare',
        color: '#10b981',
        requiresDeposit: true,
        depositAmount: 30,
        bufferBefore: 15,
        bufferAfter: 15,
      },
    ],
    
    customerForm: {
      fields: [
        {
          id: 'firstName',
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          required: true,
          validation: [{ type: 'required', message: 'First name is required' }],
        },
        {
          id: 'lastName',
          name: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: true,
          validation: [{ type: 'required', message: 'Last name is required' }],
        },
        {
          id: 'email',
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          validation: [
            { type: 'required', message: 'Email is required' },
            { type: 'email', message: 'Please enter a valid email' },
          ],
        },
        {
          id: 'phone',
          name: 'phone',
          label: 'Phone Number',
          type: 'phone',
          required: true,
          validation: [
            { type: 'required', message: 'Phone number is required' },
            { type: 'phone', message: 'Please enter a valid phone number' },
          ],
        },
        {
          id: 'skinType',
          name: 'skinType',
          label: 'Skin Type',
          type: 'select',
          required: false,
          options: ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'],
        },
        {
          id: 'hairType',
          name: 'hairType',
          label: 'Hair Type',
          type: 'select',
          required: false,
          options: ['Straight', 'Wavy', 'Curly', 'Coily'],
        },
        {
          id: 'allergies',
          name: 'allergies',
          label: 'Product Allergies',
          type: 'textarea',
          required: false,
        },
        {
          id: 'preferences',
          name: 'preferences',
          label: 'Service Preferences',
          type: 'textarea',
          required: false,
        },
      ],
      layout: 'two-column',
      validation: [],
    },
    
    appointmentForm: {
      fields: [
        {
          id: 'service',
          name: 'service',
          label: 'Service',
          type: 'select',
          required: true,
          options: ['Haircut', 'Hair Color', 'Massage', 'Facial'],
          validation: [{ type: 'required', message: 'Please select a service' }],
        },
        {
          id: 'stylist',
          name: 'stylist',
          label: 'Preferred Stylist/Therapist',
          type: 'select',
          required: false,
          options: ['Sarah', 'Jessica', 'Michael', 'Emma'],
        },
        {
          id: 'specialRequests',
          name: 'specialRequests',
          label: 'Special Requests',
          type: 'textarea',
          required: false,
        },
      ],
      layout: 'single-column',
      validation: [],
    },
    
    workflows: [
      {
        id: 'booking-confirmation',
        name: 'Booking Confirmation',
        description: 'Send confirmation and preparation instructions',
        trigger: 'appointment.created',
        actions: [
          {
            type: 'send_email',
            config: {
              template: 'booking-confirmation',
              recipient: 'customer',
            },
          },
        ],
        isActive: true,
      },
      {
        id: 'reminder-24h',
        name: '24-Hour Reminder',
        description: 'Send reminder 24 hours before appointment',
        trigger: 'appointment.confirmed',
        actions: [
          {
            type: 'delay',
            config: { hours: 24 },
          },
          {
            type: 'send_sms',
            config: {
              template: 'appointment-reminder',
              recipient: 'customer',
            },
          },
        ],
        isActive: true,
      },
    ],
    
    emailTemplates: [
      {
        id: 'booking-confirmation',
        name: 'Booking Confirmation',
        subject: 'Your appointment at {{businessName}} is confirmed!',
        body: 'Hi {{customer.firstName}},\n\nYour {{appointment.service}} appointment is confirmed for {{appointment.date}} at {{appointment.time}} with {{appointment.stylist}}.\n\nPlease arrive 10 minutes early. If you need to cancel, please give us at least 24 hours notice.\n\nCan\'t wait to see you!\n{{businessName}}',
        variables: ['customer.firstName', 'appointment.service', 'appointment.date', 'appointment.time', 'appointment.stylist', 'businessName'],
        type: 'confirmation',
      },
    ],
    
    defaultSettings: {
      timezone: 'America/New_York',
      workingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
        saturday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
        sunday: { isOpen: false },
      },
      appointmentSettings: {
        defaultDuration: 60,
        minAdvanceBooking: 12,
        maxAdvanceBooking: 30,
        cancellationWindow: 24,
        allowRescheduling: true,
        requireDeposit: true,
        defaultDepositAmount: 25,
      },
      notificationSettings: {
        emailReminders: true,
        smsReminders: true,
        reminderTiming: [24, 2],
        confirmations: true,
        cancellations: true,
      },
      paymentSettings: {
        acceptPayments: true,
        requirePayment: true,
        paymentMethods: ['credit_card', 'debit_card', 'cash'],
        currency: 'USD',
      },
    },
    
    features: [
      'Online Booking',
      'Staff Scheduling',
      'Inventory Management',
      'Loyalty Program',
      'Gift Cards',
      'Photo Gallery',
      'Reviews & Ratings',
      'Package Deals',
    ],
  },
  
  {
    id: 'consulting-professional',
    name: 'Consulting Services',
    description: 'Setup for consultants, coaches, and professional services',
    category: 'consulting',
    icon: '💼',
    color: '#64748b',
    
    services: [
      {
        name: 'Initial Consultation',
        description: 'First meeting to discuss needs and goals',
        duration: 60,
        price: 200,
        category: 'Consultation',
        color: '#3b82f6',
        requiresDeposit: false,
        bufferBefore: 15,
        bufferAfter: 15,
      },
      {
        name: 'Strategy Session',
        description: 'In-depth strategic planning session',
        duration: 120,
        price: 500,
        category: 'Strategy',
        color: '#8b5cf6',
        requiresDeposit: true,
        depositAmount: 100,
        bufferBefore: 30,
        bufferAfter: 30,
      },
      {
        name: 'Follow-up Meeting',
        description: 'Regular progress review and adjustments',
        duration: 45,
        price: 150,
        category: 'Follow-up',
        color: '#10b981',
        requiresDeposit: false,
        bufferBefore: 15,
        bufferAfter: 15,
      },
    ],
    
    customerForm: {
      fields: [
        {
          id: 'firstName',
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          required: true,
          validation: [{ type: 'required', message: 'First name is required' }],
        },
        {
          id: 'lastName',
          name: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: true,
          validation: [{ type: 'required', message: 'Last name is required' }],
        },
        {
          id: 'email',
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          validation: [
            { type: 'required', message: 'Email is required' },
            { type: 'email', message: 'Please enter a valid email' },
          ],
        },
        {
          id: 'phone',
          name: 'phone',
          label: 'Phone',
          type: 'phone',
          required: true,
          validation: [{ type: 'phone', message: 'Please enter a valid phone number' }],
        },
        {
          id: 'company',
          name: 'company',
          label: 'Company/Organization',
          type: 'text',
          required: false,
        },
        {
          id: 'position',
          name: 'position',
          label: 'Position/Role',
          type: 'text',
          required: false,
        },
        {
          id: 'goals',
          name: 'goals',
          label: 'Goals & Objectives',
          type: 'textarea',
          required: true,
          validation: [{ type: 'required', message: 'Please describe your goals' }],
        },
        {
          id: 'budget',
          name: 'budget',
          label: 'Budget Range',
          type: 'select',
          required: false,
          options: ['<$1,000', '$1,000-$5,000', '$5,000-$10,000', '$10,000+'],
        },
      ],
      layout: 'two-column',
      validation: [],
    },
    
    appointmentForm: {
      fields: [
        {
          id: 'service',
          name: 'service',
          label: 'Service Type',
          type: 'select',
          required: true,
          options: ['Initial Consultation', 'Strategy Session', 'Follow-up Meeting'],
          validation: [{ type: 'required', message: 'Please select a service' }],
        },
        {
          id: 'meetingType',
          name: 'meetingType',
          label: 'Meeting Type',
          type: 'radio',
          required: true,
          options: ['In-person', 'Video Call', 'Phone'],
          validation: [{ type: 'required', message: 'Please select meeting type' }],
        },
        {
          id: 'agenda',
          name: 'agenda',
          label: 'Agenda Items',
          type: 'textarea',
          required: false,
        },
        {
          id: 'materials',
          name: 'materials',
          label: 'Materials to Review',
          type: 'textarea',
          required: false,
        },
      ],
      layout: 'single-column',
      validation: [],
    },
    
    workflows: [
      {
        id: 'consultation-prep',
        name: 'Consultation Preparation',
        description: 'Send preparation materials and agenda',
        trigger: 'appointment.created',
        actions: [
          {
            type: 'send_email',
            config: {
              template: 'consultation-prep',
              recipient: 'customer',
            },
          },
          {
            type: 'create_task',
            config: {
              assignee: 'consultant',
              task: 'Prepare consultation materials',
              priority: 'high',
            },
          },
        ],
        isActive: true,
      },
    ],
    
    emailTemplates: [
      {
        id: 'consultation-prep',
        name: 'Consultation Preparation',
        subject: 'Preparation for your consultation with {{businessName}}',
        body: 'Dear {{customer.firstName}},\n\nI\'m looking forward to our consultation on {{appointment.date}} at {{appointment.time}}.\n\nTo make the most of our time, please:\n1. Review any materials I\'ve sent\n2. Think about your key objectives\n3. Prepare any questions you have\n\nSee you soon!\n{{consultant.name}}',
        variables: ['customer.firstName', 'appointment.date', 'appointment.time', 'businessName', 'consultant.name'],
        type: 'confirmation',
      },
    ],
    
    defaultSettings: {
      timezone: 'America/New_York',
      workingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        saturday: { isOpen: false },
        sunday: { isOpen: false },
      },
      appointmentSettings: {
        defaultDuration: 60,
        minAdvanceBooking: 48,
        maxAdvanceBooking: 30,
        cancellationWindow: 48,
        allowRescheduling: true,
        requireDeposit: false,
      },
      notificationSettings: {
        emailReminders: true,
        smsReminders: false,
        reminderTiming: [24],
        confirmations: true,
        cancellations: true,
      },
      paymentSettings: {
        acceptPayments: true,
        requirePayment: false,
        paymentMethods: ['credit_card', 'bank_transfer', 'invoice'],
        currency: 'USD',
      },
    },
    
    features: [
      'Video Conferencing',
      'Document Sharing',
      'Progress Tracking',
      'Invoice Generation',
      'Time Tracking',
      'Resource Library',
      'Client Portal',
      'Analytics Dashboard',
    ],
  },
];

// Template utilities
export const templateUtils = {
  getTemplateById: (id: string): IndustryTemplate | undefined => {
    return industryTemplates.find(template => template.id === id);
  },

  getTemplatesByCategory: (category: IndustryTemplate['category']): IndustryTemplate[] => {
    return industryTemplates.filter(template => template.category === category);
  },

  applyTemplate: async (template: IndustryTemplate, tenantId: string): Promise<boolean> => {
    try {
      // This would make API calls to apply the template
      console.log(`Applying template ${template.name} to tenant ${tenantId}`);
      
      // 1. Create services
      // 2. Setup forms
      // 3. Configure workflows
      // 4. Apply settings
      // 5. Create email templates
      
      return true;
    } catch (error) {
      console.error('Failed to apply template:', error);
      return false;
    }
  },

  customizeTemplate: (template: IndustryTemplate, customizations: Partial<IndustryTemplate>): IndustryTemplate => {
    return {
      ...template,
      ...customizations,
      id: `${template.id}-custom`,
      name: `${template.name} (Custom)`,
      services: customizations.services || template.services,
      defaultSettings: {
        ...template.defaultSettings,
        ...customizations.defaultSettings,
      },
    };
  },

  validateTemplate: (template: IndustryTemplate): boolean => {
    // Validate template structure
    return !!(template.id && template.name && template.services && template.customerForm);
  },
};
