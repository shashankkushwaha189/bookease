# 🚀 Frontend-Backend API Integration Guide

## 📋 **OVERVIEW**

This guide provides comprehensive integration between all backend API endpoints and the frontend React application. All endpoints are fully typed, tested, and ready for production use.

---

## 🏗️ **ARCHITECTURE**

### **API Client Structure**
```
src/api/
├── client.ts              # Base Axios client with interceptors
├── auth.ts                 # Authentication endpoints
├── appointments.ts         # Appointment management
├── services.ts             # Service management
├── staff.ts                # Staff management
├── customers.ts            # Customer management
├── reports.ts              # Reporting endpoints
├── archive.ts              # Archival endpoints
├── import.ts               # Import/Export endpoints
├── tokens.ts               # API token management
├── audit.ts                # Audit logging
├── ai.ts                   # AI features
├── public.ts               # Public booking API
├── hooks/                  # React hooks
│   ├── useAppointments.ts
│   ├── useServices.ts
│   ├── useImport.ts
│   └── index.ts
└── index.ts                # Central exports
```

### **Type Safety**
All endpoints are fully typed with TypeScript interfaces located in `src/types/api.ts`.

---

## 🔐 **AUTHENTICATION INTEGRATION**

### **Login Flow**
```typescript
import { authApi } from '../api';

// Login
const login = async (credentials: LoginRequest) => {
  try {
    const response = await authApi.login(credentials);
    const { token, user } = response.data.data;
    
    // Token is automatically stored by auth store
    return { token, user };
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// Logout
const logout = async () => {
  await authApi.logout();
  // Token is automatically cleared by auth store
};
```

### **Automatic Token Handling**
The API client automatically includes:
- `Authorization: Bearer <token>` header
- `X-Tenant-ID: <tenantId>` header
- `X-Correlation-ID: <uuid>` for tracing

---

## 📅 **APPOINTMENTS INTEGRATION**

### **Using Custom Hook**
```typescript
import { useAppointments } from '../api/hooks';

const AppointmentManager = () => {
  const {
    appointments,
    loading,
    error,
    pagination,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    confirmAppointment,
    completeAppointment,
    markNoShow,
    refresh,
  } = useAppointments({
    page: 1,
    limit: 10,
    status: 'BOOKED',
  });

  const handleCreate = async (data: CreateAppointmentRequest) => {
    await createAppointment(data);
    refresh(); // Refresh list
  };

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      
      {appointments.map(apt => (
        <div key={apt.id}>
          <h3>{apt.referenceId}</h3>
          <p>{apt.customer?.name}</p>
          <button onClick={() => confirmAppointment(apt.id)}>
            Confirm
          </button>
        </div>
      ))}
    </div>
  );
};
```

### **Direct API Usage**
```typescript
import { appointmentsApi } from '../api';

// Get appointments with filtering
const getAppointments = async () => {
  const response = await appointmentsApi.getAppointments({
    page: 1,
    limit: 20,
    status: 'CONFIRMED',
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
  });
  
  return response.data.data;
};

// Create appointment
const createAppointment = async (data: CreateAppointmentRequest) => {
  const response = await appointmentsApi.createAppointment(data);
  return response.data.data;
};

// Get availability
const getAvailability = async (params: AvailabilityRequest) => {
  const response = await appointmentsApi.getAvailability(params);
  return response.data.data;
};
```

---

## 🛠️ **SERVICES INTEGRATION**

### **Service Management Hook**
```typescript
import { useServices } from '../api/hooks';

const ServiceManager = () => {
  const {
    services,
    loading,
    error,
    createService,
    updateService,
    deleteService,
    toggleService,
  } = useServices({ isActive: true });

  const handleCreate = async (data: CreateServiceRequest) => {
    await createService(data);
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await toggleService(id, isActive);
  };

  return (
    <div>
      {services.map(service => (
        <div key={service.id}>
          <h3>{service.name}</h3>
          <p>{service.durationMinutes} minutes</p>
          <button onClick={() => toggleService(service.id, !service.isActive)}>
            {service.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ))}
    </div>
  );
};
```

---

## 📊 **REPORTS INTEGRATION**

### **Report Generation**
```typescript
import { reportsApi } from '../api';

const ReportManager = () => {
  const generateReport = async () => {
    const query = {
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
      serviceId: 'service-123',
    };

    // Get summary report
    const summary = await reportsApi.getSummary(query);
    console.log('Summary:', summary.data.data);

    // Get peak times
    const peakTimes = await reportsApi.getPeakTimes(query);
    console.log('Peak times:', peakTimes.data.data);

    // Get staff utilization
    const utilization = await reportsApi.getStaffUtilization(query);
    console.log('Utilization:', utilization.data.data);

    // Export to CSV
    const csvBlob = await reportsApi.exportData({
      type: 'appointments',
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
    });

    // Download CSV
    const url = window.URL.createObjectURL(csvBlob.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointments.csv';
    a.click();
  };

  return <button onClick={generateReport}>Generate Report</button>;
};
```

---

## 📁 **IMPORT/EXPORT INTEGRATION**

### **CSV Import Hook**
```typescript
import { useImport, useImportTemplates } from '../api/hooks';

const ImportManager = () => {
  const [file, setFile] = useState<File | null>(null);
  
  const {
    validationReport,
    importResult,
    loading,
    validateFile,
    importFile,
  } = useImport({ type: 'customers' });

  const { templates, downloadTemplate } = useImportTemplates();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleValidate = async () => {
    if (file) {
      await validateFile(file);
    }
  };

  const handleImport = async () => {
    if (file) {
      await importFile(file, {
        allowPartial: true,
        skipDuplicates: true,
      });
    }
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileSelect} />
      
      <button onClick={handleValidate} disabled={!file || loading}>
        Validate
      </button>
      
      {validationReport && (
        <div>
          <p>Valid rows: {validationReport.validRows}</p>
          <p>Invalid rows: {validationReport.invalidRows}</p>
          <p>Can import: {validationReport.canPartialImport ? 'Yes' : 'No'}</p>
          
          <button onClick={handleImport} disabled={loading}>
            Import
          </button>
        </div>
      )}
      
      {importResult && (
        <div>
          <p>Imported: {importResult.imported}</p>
          <p>Failed: {importResult.failed}</p>
          <p>Skipped: {importResult.skipped}</p>
        </div>
      )}
    </div>
  );
};
```

---

## 🔐 **API TOKENS INTEGRATION**

### **Token Management**
```typescript
import { apiTokensApi } from '../api';

const TokenManager = () => {
  const [tokens, setTokens] = useState([]);

  const createToken = async (name: string) => {
    const response = await apiTokensApi.createToken({
      name,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    
    // Save token securely - only shown once!
    const newToken = response.data.data.token;
    console.log('New token:', newToken);
    
    // Refresh tokens list
    fetchTokens();
  };

  const revokeToken = async (tokenId: string) => {
    await apiTokensApi.revokeToken(tokenId);
    fetchTokens();
  };

  const fetchTokens = async () => {
    const response = await apiTokensApi.listTokens();
    setTokens(response.data.data);
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  return (
    <div>
      {tokens.map(token => (
        <div key={token.id}>
          <h3>{token.name}</h3>
          <p>Created: {new Date(token.createdAt).toLocaleDateString()}</p>
          <p>Last used: {token.lastUsed ? new Date(token.lastUsed).toLocaleDateString() : 'Never'}</p>
          <p>Status: {token.isActive ? 'Active' : 'Inactive'}</p>
          <button onClick={() => revokeToken(token.id)}>Revoke</button>
        </div>
      ))}
    </div>
  );
};
```

---

## 🤖 **AI FEATURES INTEGRATION**

### **AI Summary Generation**
```typescript
import { aiApi } from '../api';

const AISummaryManager = ({ appointmentId }: { appointmentId: string }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const response = await aiApi.generateSummary({
        appointmentId,
        includeKeyPoints: true,
        includeActionItems: true,
      });
      
      setSummary(response.data.data);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={generateSummary} disabled={loading}>
        {loading ? 'Generating...' : 'Generate AI Summary'}
      </button>
      
      {summary && (
        <div>
          <h3>Summary</h3>
          <p>{summary.summary}</p>
          
          {summary.keyPoints.length > 0 && (
            <div>
              <h4>Key Points</h4>
              <ul>
                {summary.keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}
          
          {summary.actionItems.length > 0 && (
            <div>
              <h4>Action Items</h4>
              <ul>
                {summary.actionItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 📊 **ARCHIVAL INTEGRATION**

### **Archive Management**
```typescript
import { archiveApi } from '../api';

const ArchiveManager = () => {
  const [archivedAppointments, setArchivedAppointments] = useState([]);
  const [stats, setStats] = useState(null);

  const archiveOldAppointments = async () => {
    const response = await archiveApi.archiveAppointments({ months: 6 });
    console.log('Archived:', response.data.data.archivedCount);
  };

  const searchArchived = async (searchTerm: string) => {
    const response = await archiveApi.searchArchived({
      search: searchTerm,
      page: 1,
      limit: 20,
    });
    
    setArchivedAppointments(response.data.data.appointments);
  };

  const getStats = async () => {
    const response = await archiveApi.getStats();
    setStats(response.data.data);
  };

  return (
    <div>
      <button onClick={archiveOldAppointments}>
        Archive Appointments (6+ months)
      </button>
      
      <input
        type="text"
        placeholder="Search archived appointments..."
        onChange={(e) => searchArchived(e.target.value)}
      />
      
      {archivedAppointments.map(apt => (
        <div key={apt.id}>
          <h3>{apt.referenceId}</h3>
          <p>{apt.customerName} - {apt.serviceName}</p>
          <p>Archived: {new Date(apt.archivedAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## 🌐 **PUBLIC API INTEGRATION**

### **External Booking Integration**
```typescript
import { publicApi } from '../api';

const PublicBookingWidget = () => {
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [availability, setAvailability] = useState([]);

  // Get public services
  useEffect(() => {
    publicApi.getServices().then(response => {
      setServices(response.data.data);
    });
  }, []);

  // Get availability
  const checkAvailability = async (serviceId: string, staffId: string, date: string) => {
    const response = await publicApi.getAvailability({
      serviceId,
      staffId,
      date,
    });
    
    setAvailability(response.data.data.availableSlots);
  };

  // Create booking
  const createBooking = async (bookingData: PublicBookingRequest) => {
    const response = await publicApi.createBooking(bookingData);
    return response.data.data;
  };

  return (
    <div>
      <h2>Book Appointment</h2>
      
      <select>
        {services.map(service => (
          <option key={service.id} value={service.id}>
            {service.name} - {service.durationMinutes}min
          </option>
        ))}
      </select>
      
      {/* Add date/time selection and booking form */}
    </div>
  );
};
```

---

## 🔄 **ERROR HANDLING**

### **Global Error Handling**
The API client includes comprehensive error handling:

```typescript
// Automatic error responses
401 -> Session expired, auto-logout
403 -> Access denied toast
400/422 -> Server message toast
500/502/503/504 -> Generic error toast
Network errors -> Network error toast
```

### **Custom Error Handling**
```typescript
try {
  await appointmentsApi.createAppointment(data);
} catch (error: any) {
  if (error.response?.status === 409) {
    // Handle conflict (time slot already booked)
    showError('This time slot is already booked');
  } else if (error.response?.status === 400) {
    // Handle validation error
    const fieldErrors = error.response.data.details;
    // Show field-specific errors
  }
}
```

---

## 📈 **PERFORMANCE OPTIMIZATIONS**

### **Pagination**
All list endpoints support pagination:
```typescript
const { appointments, pagination } = useAppointments({
  page: currentPage,
  limit: 20, // Limit records per page
});
```

### **Caching**
The API client automatically handles:
- Token caching
- Rate limiting headers
- ETag support (when implemented)

### **Debouncing**
For search inputs:
```typescript
import { useMemo } from 'react';

const debouncedSearch = useMemo(
  () => debounce((term: string) => {
    setSearchTerm(term);
  }, 300),
  []
);
```

---

## 🧪 **TESTING INTEGRATION**

### **Mock API for Testing**
```typescript
// __mocks__/api.ts
export const appointmentsApi = {
  getAppointments: jest.fn(),
  createAppointment: jest.fn(),
  // ... other methods
};

// Test component
import { render, screen } from '@testing-library/react';
import { AppointmentManager } from '../AppointmentManager';

test('renders appointments', async () => {
  appointmentsApi.getAppointments.mockResolvedValue({
    data: { data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 } }
  });

  render(<AppointmentManager />);
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

---

## 🚀 **DEPLOYMENT CONSIDERATIONS**

### **Environment Variables**
```bash
VITE_API_URL=http://localhost:3000
VITE_ENABLE_MOCK_API=false
```

### **API Base URL Configuration**
The API client automatically uses:
- `VITE_API_URL` environment variable
- Falls back to `http://localhost:3000` for development

### **CORS Configuration**
Ensure backend allows frontend origin:
```typescript
// Backend CORS setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
```

---

## 📚 **COMPLETE INTEGRATION EXAMPLE**

See `src/examples/BookingManagementExample.tsx` for a complete working example that demonstrates:
- Custom hooks usage
- Direct API calls
- Error handling
- Loading states
- Form handling
- Pagination
- Real-time updates

---

## ✅ **INTEGRATION CHECKLIST**

- [x] All endpoints typed with TypeScript
- [x] Custom hooks for common operations
- [x] Automatic authentication handling
- [x] Error handling and user feedback
- [x] Pagination support
- [x] File upload support (CSV import)
- [x] Blob download support (CSV export)
- [x] Rate limiting awareness
- [x] Multi-tenant support
- [x] Correlation ID tracking
- [x] Comprehensive examples
- [x] Testing support

**🎯 READY FOR PRODUCTION!**

All backend endpoints are fully integrated with the frontend and ready for use. The integration provides type safety, error handling, performance optimizations, and comprehensive examples for easy implementation.
