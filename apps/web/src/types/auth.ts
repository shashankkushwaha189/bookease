// Mirrored from the Backend User mappings

export type UserRole = 'ADMIN' | 'STAFF' | 'USER';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string;
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    timezone?: string;
    language?: string;
    notifications?: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    createdAt?: string;
    updatedAt?: string;
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
