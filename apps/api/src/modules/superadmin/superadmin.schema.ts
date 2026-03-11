import { z } from 'zod';

export const createTenantSchema = z.object({
    name: z.string().min(2, "Tenant name is required"),
    slug: z.string().min(2, "Tenant slug is required"),
    domain: z.string().optional(),
    timezone: z.string().optional(),
    adminEmail: z.string().email("Valid admin email required"),
    adminPassword: z.string().min(8, "Admin password must be at least 8 characters"),
});

export const updateTenantSchema = z.object({
    name: z.string().optional(),
    domain: z.string().optional(),
    timezone: z.string().optional(),
    isActive: z.boolean().optional(),
});

export const addStaffSchema = z.object({
    name: z.string().min(2, "Staff name is required"),
    email: z.string().email("Valid staff email required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(['STAFF', 'ADMIN']).optional(),
    phone: z.string().optional(),
    department: z.string().optional(),
    title: z.string().optional(),
});

export const addCustomerSchema = z.object({
    name: z.string().min(2, "Customer name is required"),
    email: z.string().email("Valid customer email required"),
    phone: z.string().optional(),
    address: z.object().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type AddStaffInput = z.infer<typeof addStaffSchema>;
export type AddCustomerInput = z.infer<typeof addCustomerSchema>;
