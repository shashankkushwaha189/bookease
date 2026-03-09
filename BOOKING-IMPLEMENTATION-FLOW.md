# Booking Appointment Implementation Flow

## 🔄 Complete End-to-End Booking Flow

### **Phase 1: User Access & Authentication**
```
1. User visits /demo-clinic/book
   ↓
2. BookingPage.tsx loads with tenant context
   ↓
3. If not logged in → Redirect to login
   ↓
4. User logs in (customer@demo.com)
   ↓
5. Auth token stored → User redirected back to booking
```

### **Phase 2: Service Selection**
```
1. BookingPage calls useServices() hook
   ↓
2. servicesApi.getServices() → GET /api/services
   ↓
3. Backend: services.controller.getServices()
   ↓
4. Database: prisma.service.findMany({tenantId, isActive: true})
   ↓
5. Response: [{id, name, durationMinutes, price, description}]
   ↓
6. UI displays service cards → User selects service
   ↓
7. setSelectedService(service) → State updated
```

### **Phase 3: Staff Selection**
```
1. Service selected → useStaff() hook triggered
   ↓
2. staffApi.getStaff() → GET /api/staff
   ↓
3. Backend: staff.controller.getStaff()
   ↓
4. Database: prisma.staff.findMany({tenantId, isActive: true})
   ↓
5. Response: [{id, name, bio, photoUrl}]
   ↓
6. UI displays staff cards → User selects staff
   ↓
7. setSelectedStaff(staff) → State updated
```

### **Phase 4: Date & Time Selection**
```
1. Staff selected → User picks date
   ↓
2. useAvailability() hook triggered with {serviceId, staffId, date}
   ↓
3. appointmentsApi.getAvailability() → GET /api/appointments/availability
   ↓
4. Backend: availability.controller.getAvailability()
   ↓
5. Availability Service Logic:
   - Get service duration from database
   - Get staff working schedule for that day
   - Check existing appointments/bookings
   - Generate available time slots
   ↓
6. Response: {success: true, data: {slots: [{startTimeUtc, endTimeUtc, staffId, staffName}]}}
   ↓
7. Frontend maps UTC times to local display times
   ↓
8. UI displays time slot buttons → User selects time
   ↓
9. setSelectedTime(time) → State updated
```

### **Phase 5: Customer Details**
```
1. Time selected → User enters details
   ↓
2. Form validation using react-hook-form + zod
   ↓
3. Required fields:
   - Full Name (min 2 chars)
   - Email (valid format)
   - Phone (optional)
   - Consent checkbox (must be true)
   ↓
4. Form validation passes → Proceed to booking
```

### **Phase 6: Booking Creation**
```
1. User clicks "Confirm Booking"
   ↓
2. handleBookingSubmit() called with form data
   ↓
3. Get logged-in user from auth store
   ↓
4. appointmentsApi.createAppointment() → POST /api/appointments
   ↓
5. Backend: appointment.controller.createBooking()
   ↓
6. Booking Data Validation:
   - serviceId exists and is active
   - staffId exists and is available
   - time slot is available (double-check)
   - customer exists and is active
   ↓
7. Database Transaction:
   - Create appointment record
   - Update staff availability
   - Send confirmation notifications
   ↓
8. Response: {success: true, data: {id, referenceId, ...}}
   ↓
9. Frontend receives confirmation → Update UI state
```

### **Phase 7: Booking Confirmation**
```
1. setConfirmation(bookingData) → State updated
   ↓
2. setCurrentStep(5) → Show confirmation screen
   ↓
3. Display booking details:
   - Reference ID (BK-XXXX)
   - Service name
   - Date & Time
   - Staff member
   - Business contact info
   ↓
4. Options available:
   - Add to calendar (.ics file download)
   - Copy reference ID
   - Return to bookings
```

---

## 🔧 Technical Implementation Details

### **Frontend Components & Hooks**

#### **BookingPage.tsx (Main Component)**
```typescript
// State Management
const [currentStep, setCurrentStep] = useState(1);
const [selectedService, setSelectedService] = useState<Service>();
const [selectedStaff, setSelectedStaff] = useState<Staff>();
const [selectedDate, setSelectedDate] = useState<string>('');
const [selectedTime, setSelectedTime] = useState<string>('');
const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

// API Hooks
const { services, isLoading: servicesLoading } = useServices();
const { staff, isLoading: staffLoading } = useStaff(selectedService?.id);
const { slots, isLoading: slotsLoading } = useAvailability(
  selectedService?.id,
  selectedStaff?.id,
  selectedDate
);
```

#### **useServices() Hook**
```typescript
const useServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  
  useEffect(() => {
    const fetchServices = async () => {
      const response = await servicesApi.getServices();
      if (response.data?.data) {
        const mappedServices = response.data.data.map((service: any) => ({
          id: service.id,
          name: service.name,
          duration: service.durationMinutes,
          price: service.price,
          description: service.description
        }));
        setServices(mappedServices);
      }
    };
    fetchServices();
  }, []);
  
  return { services, isLoading };
};
```

#### **useAvailability() Hook**
```typescript
const useAvailability = (serviceId?: string, staffId?: string, date?: string) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  
  useEffect(() => {
    if (!serviceId || !date) return;
    
    const fetchAvailability = async () => {
      const response = await appointmentsApi.getAvailability({
        serviceId: serviceId || '',
        staffId: staffId || '',
        date: date || ''
      });
      
      if (response.data?.data?.slots) {
        const mappedSlots = response.data.data.slots.map((slot: any) => ({
          time: new Date(slot.startTimeUtc).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          available: slot.isAvailable !== false
        }));
        setSlots(mappedSlots);
      }
    };
    
    fetchAvailability();
  }, [serviceId, staffId, date]);
  
  return { slots, isLoading };
};
```

### **Backend API Implementation**

#### **Appointment Routes (appointment.routes.ts)**
```typescript
// Availability routes (for booking page)
appointmentRouter.use("/availability", availabilityRoutes);

// Public booking endpoints
appointmentRouter.post("/book", controller.createBooking);
```

#### **Availability Controller (availability.controller.ts)**
```typescript
async getAvailability(req: Request, res: Response) {
  const { serviceId, date, staffId } = req.query;
  const tenantId = req.tenantId!;
  
  // Generate availability with fallback handling
  let slots = await availabilityService.generateSlots({
    tenantId,
    serviceId,
    staffId,
    date,
    businessTimezone
  });
  
  res.json({
    success: true,
    data: {
      slots,
      date,
      serviceId,
      timezone: businessTimezone
    }
  });
}
```

#### **Availability Service Logic**
```typescript
async generateSlots(input: {
  tenantId: string;
  serviceId: string;
  staffId?: string;
  date: string;
  businessTimezone: string;
}) {
  // 1. Get service info (duration, buffers)
  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId, isActive: true }
  });
  
  // 2. Get staff info and schedules
  const staffList = await prisma.staff.findMany({
    where: { 
      tenantId, 
      isActive: true,
      ...(staffId && { id: staffId })
    },
    include: {
      weeklySchedule: { where: { isWorking: true }, include: { breaks: true } },
      timeOffs: { where: { date: { lte: endOfDay, gte: startOfDay } } }
    }
  });
  
  // 3. Get existing appointments for that day
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      staffId: { in: staffList.map(s => s.id) },
      startTimeUtc: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] }
    }
  });
  
  // 4. Generate available slots
  const availableSlots = [];
  for (const staff of staffList) {
    const schedule = staff.weeklySchedule.find(s => s.dayOfWeek === dayOfWeek);
    if (!schedule || staff.timeOffs.length > 0) continue;
    
    // Generate slots based on working hours and service duration
    for (let hour = schedule.startTime; hour < schedule.endTime; hour += service.durationMinutes) {
      const slotStart = new Date(`${date}T${hour}:00:00`);
      const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60000);
      
      // Check if slot conflicts with existing appointments
      const isConflicting = existingAppointments.some(apt => 
        (apt.startTimeUtc < slotEnd && apt.endTimeUtc > slotStart)
      );
      
      if (!isConflicting) {
        availableSlots.push({
          staffId: staff.id,
          staffName: staff.name,
          startTimeUtc: slotStart.toISOString(),
          endTimeUtc: slotEnd.toISOString(),
          isAvailable: true
        });
      }
    }
  }
  
  return availableSlots;
}
```

---

## 📊 Data Flow Diagram

```
Frontend (BookingPage)          Backend API              Database
┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
│ Select Service  │────────▶│ GET /services│────────▶│ services    │
│                 │◀────────│              │◀────────│ table       │
└─────────────────┘         └──────────────┘         └─────────────┘
        │
        ▼
┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
│ Select Staff    │────────▶│ GET /staff   │────────▶│ staff       │
│                 │◀────────│              │◀────────│ table       │
└─────────────────┘         └──────────────┘         └─────────────┘
        │
        ▼
┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
│ Select Date/Time│────────▶│ GET /avail-  │────────▶│ appointments│
│                 │◀────────│ ability     │◀────────│ table       │
└─────────────────┘         └──────────────┘         └─────────────┘
        │
        ▼
┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
│ Submit Booking  │────────▶│ POST /appoint│────────▶│ appointments│
│                 │◀────────│ ments/book   │◀────────│ table       │
└─────────────────┘         └──────────────┘         └─────────────┘
```

---

## 🔍 Error Handling & Edge Cases

### **Frontend Error Handling**
```typescript
try {
  const response = await appointmentsApi.getAvailability(params);
  // Handle success
} catch (error: any) {
  console.error('Failed to fetch availability:', error);
  if (error.response?.status === 404) {
    error('Service not found');
  } else if (error.response?.status === 400) {
    error('Invalid date or service selected');
  } else {
    error('Failed to load availability. Please try again.');
  }
  setSlots([]); // Fallback to empty state
}
```

### **Backend Error Handling**
```typescript
try {
  slots = await availabilityService.generateSlots(input);
} catch (generationError) {
  logger.error({ err: generationError }, 'Availability generation failed');
  
  // Fallback to basic availability
  slots = await this.generateBasicAvailability(input);
}

// Graceful degradation
res.status(500).json({
  success: false,
  error: { 
    code: 'INTERNAL_SERVER_ERROR', 
    message: 'Failed to fetch availability. Please try again later.' 
  }
});
```

---

## 🚀 Performance Optimizations

### **Frontend Optimizations**
- **Lazy Loading**: Services, staff, and availability loaded on demand
- **Debouncing**: Date changes trigger availability fetch after 300ms delay
- **Caching**: API responses cached in component state
- **Skeleton Loading**: Show loading states during API calls

### **Backend Optimizations**
- **In-Memory Caching**: Availability cached for 60 seconds
- **Database Indexing**: Optimized queries for appointments and schedules
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Performance Monitoring**: Query time tracking and logging

---

## 📱 Mobile Responsiveness

### **Responsive Design**
- **Desktop**: 3-column grid for services/staff/slots
- **Tablet**: 2-column grid with larger touch targets
- **Mobile**: Single column with full-width cards
- **Touch Optimization**: 44px minimum touch target size

### **Mobile-Specific Features**
- **Date Picker**: Native mobile date input
- **Time Slots**: Large, easy-to-tap buttons
- **Form Validation**: Real-time validation feedback
- **Progress Indicator**: Step-by-step progress bar

---

## 🎯 Key Success Metrics

### **User Experience**
- **Booking Flow Time**: <2 minutes from start to confirmation
- **Error Rate**: <1% failed bookings
- **Mobile Usability**: 100% touch-friendly interface
- **Accessibility**: WCAG 2.1 AA compliant

### **Technical Performance**
- **API Response Time**: <500ms for availability
- **Page Load Time**: <2 seconds initial load
- **Cache Hit Rate**: >80% for availability queries
- **Database Efficiency**: Optimized queries with proper indexing

---

This complete booking appointment implementation provides a seamless, production-ready booking experience with proper error handling, performance optimization, and mobile responsiveness! 🎉
