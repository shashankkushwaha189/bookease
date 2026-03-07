import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppointments, useServices, useImport } from '../api/hooks';
import { appointmentsApi, servicesApi, importApi } from '../api';
import type { Appointment, Service, ImportResult } from '../api';

// Mock API server
const server = setupServer(
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        token: 'mock-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'ADMIN',
          tenantId: 'tenant-1'
        }
      }
    }));
  }),

  // Appointments endpoints
  rest.get('/api/appointments', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        items: [
          {
            id: 'apt-1',
            referenceId: 'BK-001',
            customerId: 'cust-1',
            serviceId: 'svc-1',
            staffId: 'staff-1',
            startTimeUtc: '2024-01-01T10:00:00Z',
            endTimeUtc: '2024-01-01T10:30:00Z',
            status: 'BOOKED',
            notes: null,
            createdAt: '2024-01-01T09:00:00Z',
            updatedAt: '2024-01-01T09:00:00Z',
            customer: { id: 'cust-1', name: 'John Doe', email: 'john@example.com' },
            service: { id: 'svc-1', name: 'Consultation', durationMinutes: 30 },
            staff: { id: 'staff-1', name: 'Dr. Smith', email: 'smith@clinic.com' }
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    }));
  }),

  rest.post('/api/appointments', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        id: 'apt-new',
        referenceId: 'BK-002',
        customerId: 'cust-1',
        serviceId: 'svc-1',
        staffId: 'staff-1',
        startTimeUtc: '2024-01-01T11:00:00Z',
        endTimeUtc: '2024-01-01T11:30:00Z',
        status: 'BOOKED',
        notes: null,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      }
    }));
  }),

  rest.patch('/api/appointments/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json({
      success: true,
      data: {
        id,
        referenceId: 'BK-001',
        customerId: 'cust-1',
        serviceId: 'svc-1',
        staffId: 'staff-1',
        startTimeUtc: '2024-01-01T10:00:00Z',
        endTimeUtc: '2024-01-01T10:30:00Z',
        status: 'CONFIRMED',
        notes: 'Updated notes',
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z'
      }
    }));
  }),

  rest.delete('/api/appointments/:id', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: { success: true }
    }));
  }),

  rest.post('/api/appointments/:id/confirm', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        id: 'apt-1',
        status: 'CONFIRMED'
      }
    }));
  }),

  rest.post('/api/appointments/:id/complete', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        id: 'apt-1',
        status: 'COMPLETED'
      }
    }));
  }),

  rest.post('/api/appointments/:id/no-show', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        id: 'apt-1',
        status: 'NO_SHOW'
      }
    }));
  }),

  // Services endpoints
  rest.get('/api/services', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        items: [
          {
            id: 'svc-1',
            name: 'Consultation',
            durationMinutes: 30,
            bufferBefore: 5,
            bufferAfter: 5,
            price: 150,
            description: 'General consultation',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    }));
  }),

  rest.post('/api/services', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        id: 'svc-new',
        name: 'New Service',
        durationMinutes: 45,
        bufferBefore: 10,
        bufferAfter: 10,
        price: 200,
        description: 'New service description',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    }));
  }),

  rest.patch('/api/services/:id', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: {
        id: 'svc-1',
        name: 'Updated Service',
        durationMinutes: 30,
        bufferBefore: 5,
        bufferAfter: 5,
        price: 175,
        description: 'Updated description',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z'
      }
    }));
  }),

  rest.delete('/api/services/:id', (req: any, res: any, ctx: any) => {
    return res(ctx.json({
      success: true,
      data: { success: true }
    }));
  }),

  // Import endpoints
  rest.post('/api/import/customers/validate', (req: any, res: any, ctx: any) => {
    return res(ctx.json({
      success: true,
      data: {
        totalRows: 5,
        validRows: 4,
        invalidRows: 1,
        canPartialImport: true,
        estimatedImportTime: 2000,
        errors: [
          {
            row: 2,
            field: 'email',
            message: 'Invalid email format',
            severity: 'error' as const
          }
        ],
        warnings: []
      }
    }));
  }),

  rest.post('/api/import/customers', (req: any, res: any, ctx: any) => {
    return res(ctx.json({
      success: true,
      data: {
        imported: 4,
        failed: 1,
        skipped: 0,
        errors: [
          {
            row: 2,
            field: 'email',
            message: 'Invalid email format',
            severity: 'error' as const
          }
        ],
        warnings: [],
        summary: {
          totalRows: 5,
          validRows: 4,
          invalidRows: 1,
          processingTime: 1500
        }
      }
    }));
  }),

  rest.get('/api/import/templates', (req: any, res: any, ctx: any) => {
    return res(ctx.json({
      success: true,
      data: {
        customers: {
          headers: ['name', 'email', 'phone', 'tags'],
          example: [
            ['John Doe', 'john@example.com', '555-1234', 'vip'],
            ['Jane Smith', 'jane@example.com', '555-5678', 'regular']
          ],
          description: 'Customer data import template',
          requiredFields: ['name', 'email'],
          optionalFields: ['phone', 'tags']
        },
        services: {
          headers: ['name', 'durationMinutes', 'bufferBefore', 'bufferAfter', 'price'],
          example: [
            ['Consultation', '30', '5', '5', '150.00'],
            ['Checkup', '60', '10', '10', '200.00']
          ],
          description: 'Service data import template',
          requiredFields: ['name', 'durationMinutes'],
          optionalFields: ['bufferBefore', 'bufferAfter', 'price']
        },
        staff: {
          headers: ['name', 'email', 'phone', 'role'],
          example: [
            ['Dr. Smith', 'smith@clinic.com', '555-9999', 'Doctor'],
            ['Nurse Johnson', 'johnson@clinic.com', '555-8888', 'Nurse']
          ],
          description: 'Staff data import template',
          requiredFields: ['name', 'email'],
          optionalFields: ['phone', 'role']
        }
      }
    }));
  })
);

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('API Integration Tests', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('useAppointments Hook', () => {
    it('should fetch appointments successfully', async () => {
      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.appointments).toHaveLength(1);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      const appointment = result.current.appointments[0];
      expect(appointment.id).toBe('apt-1');
      expect(appointment.referenceId).toBe('BK-001');
      expect(appointment.status).toBe('BOOKED');
    });

    it('should create appointment successfully', async () => {
      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      });

      const newAppointment = {
        serviceId: 'svc-1',
        staffId: 'staff-1',
        customerId: 'cust-1',
        startTimeUtc: '2024-01-01T11:00:00Z',
        notes: 'Test appointment'
      };

      await waitFor(() => {
        expect(result.current.appointments).toHaveLength(1);
      });

      await result.current.createAppointment(newAppointment);

      await waitFor(() => {
        expect(result.current.appointments).toHaveLength(2);
      });
    });

    it('should update appointment successfully', async () => {
      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.appointments).toHaveLength(1);
      });

      await result.current.updateAppointment('apt-1', { notes: 'Updated notes' });

      await waitFor(() => {
        const appointment = result.current.appointments.find(apt => apt.id === 'apt-1');
        expect(appointment?.notes).toBe('Updated notes');
      });
    });

    it('should confirm appointment successfully', async () => {
      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.appointments).toHaveLength(1);
      });

      await result.current.confirmAppointment('apt-1');

      await waitFor(() => {
        const appointment = result.current.appointments.find(apt => apt.id === 'apt-1');
        expect(appointment?.status).toBe('CONFIRMED');
      });
    });

    it('should complete appointment successfully', async () => {
      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.appointments).toHaveLength(1);
      });

      await result.current.completeAppointment('apt-1');

      await waitFor(() => {
        const appointment = result.current.appointments.find(apt => apt.id === 'apt-1');
        expect(appointment?.status).toBe('COMPLETED');
      });
    });

    it('should mark appointment as no-show successfully', async () => {
      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.appointments).toHaveLength(1);
      });

      await result.current.markNoShow('apt-1');

      await waitFor(() => {
        const appointment = result.current.appointments.find(apt => apt.id === 'apt-1');
        expect(appointment?.status).toBe('NO_SHOW');
      });
    });

    it('should delete appointment successfully', async () => {
      const { result } = renderHook(() => useAppointments(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.appointments).toHaveLength(1);
      });

      await result.current.deleteAppointment('apt-1');

      await waitFor(() => {
        expect(result.current.appointments).toHaveLength(0);
      });
    });
  });

  describe('useServices Hook', () => {
    it('should fetch services successfully', async () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(1);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      const service = result.current.services[0];
      expect(service.id).toBe('svc-1');
      expect(service.name).toBe('Consultation');
      expect(service.durationMinutes).toBe(30);
      expect(service.price).toBe(150);
    });

    it('should create service successfully', async () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(1);
      });

      const newService = {
        name: 'New Service',
        durationMinutes: 45,
        bufferBefore: 10,
        bufferAfter: 10,
        price: 200,
        description: 'New service description'
      };

      await result.current.createService(newService);

      await waitFor(() => {
        expect(result.current.services).toHaveLength(2);
      });
    });

    it('should update service successfully', async () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(1);
      });

      await result.current.updateService('svc-1', { price: 175 });

      await waitFor(() => {
        const service = result.current.services.find(svc => svc.id === 'svc-1');
        expect(service?.price).toBe(175);
      });
    });

    it('should delete service successfully', async () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(1);
      });

      await result.current.deleteService('svc-1');

      await waitFor(() => {
        expect(result.current.services).toHaveLength(0);
      });
    });
  });

  describe('useImport Hook', () => {
    it('should validate CSV file successfully', async () => {
      const { result } = renderHook(() => useImport({ type: 'customers' }), {
        wrapper: createWrapper(),
      });

      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });

      await result.current.validateFile(mockFile);

      await waitFor(() => {
        expect(result.current.validationReport).not.toBeNull();
        expect(result.current.validationReport?.totalRows).toBe(5);
        expect(result.current.validationReport?.validRows).toBe(4);
        expect(result.current.validationReport?.invalidRows).toBe(1);
        expect(result.current.validationReport?.canPartialImport).toBe(true);
      });
    });

    it('should import CSV file successfully', async () => {
      const { result } = renderHook(() => useImport({ type: 'customers' }), {
        wrapper: createWrapper(),
      });

      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });

      await result.current.importFile(mockFile, { allowPartial: true, skipDuplicates: true });

      await waitFor(() => {
        expect(result.current.importResult).not.toBeNull();
        expect(result.current.importResult?.imported).toBe(4);
        expect(result.current.importResult?.failed).toBe(1);
        expect(result.current.importResult?.skipped).toBe(0);
      });
    });

    it('should clear results successfully', () => {
      const { result } = renderHook(() => useImport({ type: 'customers' }), {
        wrapper: createWrapper(),
      });

      // Set some mock results
      result.current.validationReport = {
        totalRows: 5,
        validRows: 4,
        invalidRows: 1,
        errors: [],
        warnings: [],
        canPartialImport: true,
        estimatedImportTime: 2000
      };

      result.current.clearResults();

      expect(result.current.validationReport).toBeNull();
      expect(result.current.importResult).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Direct API Calls', () => {
    it('should make direct API calls successfully', async () => {
      // Test appointments API
      const appointmentsResponse = await appointmentsApi.getAppointments();
      expect(appointmentsResponse.data.data.items).toHaveLength(1);

      const createResponse = await appointmentsApi.createAppointment({
        serviceId: 'svc-1',
        staffId: 'staff-1',
        customerId: 'cust-1',
        startTimeUtc: '2024-01-01T11:00:00Z'
      });
      expect(createResponse.data.data.id).toBe('apt-new');

      // Test services API
      const servicesResponse = await servicesApi.getServices();
      expect(servicesResponse.data.data.items).toHaveLength(1);

      const createServiceResponse = await servicesApi.createService({
        name: 'New Service',
        durationMinutes: 45,
        price: 200
      });
      expect(createServiceResponse.data.data.name).toBe('New Service');

      // Test import API
      const templatesResponse = await importApi.getTemplates();
      expect(templatesResponse.data.data.customers).toBeDefined();
      expect(templatesResponse.data.data.services).toBeDefined();
      expect(templatesResponse.data.data.staff).toBeDefined();
    });
  });
});
