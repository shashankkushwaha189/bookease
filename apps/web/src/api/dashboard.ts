import api from './client';

// Dashboard API types
export interface DashboardSummary {
  totalAppointments: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  noShowRate: number;
  bookingsByService: Array<{ name: string; count: number }>;
  bookingsByStaff: Array<{ name: string; count: number }>;
}

export interface Appointment {
  id: string;
  referenceId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
  staff: {
    id: string;
    name: string;
    email: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface PeakTime {
  dayOfWeek: number;
  hour: number;
  count: number;
}

// Transform backend data to frontend format
const transformAppointment = (apt: any): Appointment => ({
  id: apt.id,
  referenceId: apt.referenceId,
  startTimeUtc: apt.startTimeUtc,
  endTimeUtc: apt.endTimeUtc,
  status: apt.status,
  notes: apt.notes,
  service: apt.service,
  staff: apt.staff,
  customer: apt.customer,
});

const transformSummary = (data: any): DashboardSummary => ({
  totalAppointments: data.totalAppointments || 0,
  completedCount: data.completedCount || 0,
  cancelledCount: data.cancelledCount || 0,
  noShowCount: data.noShowCount || 0,
  noShowRate: data.noShowRate || 0,
  bookingsByService: data.bookingsByService || [],
  bookingsByStaff: data.bookingsByStaff || [],
});

const transformPeakTimes = (data: any[]): PeakTime[] => data;

// Dashboard API functions
export const dashboardApi = {
  // Get dashboard summary
  getSummary: async (date?: string): Promise<DashboardSummary> => {
    const today = date || new Date().toISOString().split('T')[0];
    const response = await api.get('/api/reports/summary', {
      from: today,
      to: today
    });
    return (response.data as any).data as DashboardSummary;
  },

  // Get today's appointments
  getTodayAppointments: async (date?: string): Promise<Appointment[]> => {
    const today = date || new Date().toISOString().split('T')[0];
    const response = await api.get('/api/appointments', {
      date: today,
      limit: 50
    });
    const data = response.data as any;
    // Handle both response structures: { total, items } or { data: { total, items } }
    const appointments = data.data || data;
    return appointments?.items ? appointments.items.map(transformAppointment) : [];
  },

  // Get peak times
  getPeakTimes: async (date?: string): Promise<PeakTime[]> => {
    const today = date || new Date().toISOString().split('T')[0];
    const response = await api.get('/api/reports/peak-times', {
      from: today,
      to: today
    });
    return (response.data as any).data as PeakTime[];
  },

  // Get staff utilization
  getStaffUtilization: async (date?: string): Promise<{ percentage: number; activeStaff: number }> => {
    const today = date || new Date().toISOString().split('T')[0];
    const response = await api.get('/api/reports/staff-utilization', {
      from: today,
      to: today
    });
    
    // Transform staff utilization data to match frontend expectations
    if (response.data && Array.isArray(response.data)) {
      const totalStaff = response.data.length;
      const avgUtilization = totalStaff > 0 
        ? response.data.reduce((sum: number, staff: any) => sum + staff.utilizationPct, 0) / totalStaff
        : 0;
      
      return {
        percentage: Math.round(avgUtilization),
        activeStaff: totalStaff
      };
    }
    
    return { percentage: 0, activeStaff: 0 };
  }
};

export default dashboardApi;
