// Mirrored from the Backend User mappings

export type UserRole = 'ADMIN' | 'STAFF' | 'USER';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string;
    isActive: boolean;
}

export interface AuthResponse {
    success: boolean;
    data: {
        token: string;
        user: User;
    };
}

export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Array<{ field: string; message: string }>;
    }
}
