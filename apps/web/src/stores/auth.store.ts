import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthResponse, User } from '../types/auth';
import api from '../api/client';
import { useTenantStore } from './tenant.store';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    rememberMe: boolean;
    isLocked: boolean;
    lockoutUntil: Date | null;
    failedAttempts: number;

    setAuth: (user: User, token: string, rememberMe?: boolean) => void;
    logout: () => void;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    setRememberMe: (rememberMe: boolean) => void;
    incrementFailedAttempts: () => void;
    resetFailedAttempts: () => void;
    checkLockoutStatus: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            rememberMe: false,
            isLocked: false,
            lockoutUntil: null,
            failedAttempts: 0,

            setAuth: (user, token, rememberMe = false) => {
                console.log('🔑 Setting auth state:', { user, token: token?.substring(0, 50) + '...', rememberMe });
                set({
                    user,
                    token,
                    isAuthenticated: true,
                    rememberMe,
                    isLocked: false,
                    lockoutUntil: null,
                    failedAttempts: 0,
                });
                console.log('✅ Auth state set successfully');
            },

            logout: () =>
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    rememberMe: false,
                    isLocked: false,
                    lockoutUntil: null,
                    failedAttempts: 0,
                }),

            setRememberMe: (rememberMe) => set({ rememberMe }),

            incrementFailedAttempts: () => {
                const state = get();
                const newFailedAttempts = state.failedAttempts + 1;
                const maxAttempts = 5;
                
                if (newFailedAttempts >= maxAttempts) {
                    // Lock account for 15 minutes
                    const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
                    set({
                        failedAttempts: newFailedAttempts,
                        isLocked: true,
                        lockoutUntil,
                    });
                } else {
                    set({ failedAttempts: newFailedAttempts });
                }
            },

            resetFailedAttempts: () => set({ failedAttempts: 0, isLocked: false, lockoutUntil: null }),

            checkLockoutStatus: () => {
                const state = get();
                if (state.isLocked && state.lockoutUntil) {
                    const now = new Date();
                    if (now >= state.lockoutUntil) {
                        // Lockout period has expired
                        set({ isLocked: false, lockoutUntil: null, failedAttempts: 0 });
                        return false;
                    }
                    return true; // Still locked
                }
                return false; // Not locked
            },

            login: async (email: string, password: string, rememberMe = false) => {
                // Ensure demo tenant id is set (from seeded demo tenant)
                const DEMO_TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';
                const { tenantId, setTenantId } = useTenantStore.getState();
                if (!tenantId) {
                    setTenantId(DEMO_TENANT_ID);
                }

                console.log('🔐 Login attempt:', { email, tenantId: useTenantStore.getState().tenantId });
                console.log('🌐 API Base URL:', import.meta.env.VITE_API_URL);
                
                set({ isLoading: true });
                try {
                    console.log('📤 Making API request to:', '/api/auth/login');
                    console.log('📤 Request payload:', { email, password: '***' });
                    
                    const response = await api.post<AuthResponse>('/api/auth/login', {
                        email,
                        password,
                    });

                    console.log('✅ Login response:', response.data);
                    console.log('🔍 Response structure:', JSON.stringify(response.data, null, 2));
                    
                    // Handle different response structures
                    let token: string;
                    let user: User;
                    
                    if (response.data?.data) {
                        // Nested structure: { success: true, data: { token, user } }
                        const { data: authData } = response.data;
                        token = authData.token;
                        user = authData.user;
                    } else if (response.data?.token && response.data?.user) {
                        // Flat structure: { success: true, token, user }
                        token = (response.data as any).token;
                        user = (response.data as any).user;
                    } else {
                        console.error('❌ Unexpected response structure:', response.data);
                        throw new Error('Invalid login response structure');
                    }
                    
                    console.log('🔑 Extracted auth:', { token: token?.substring(0, 50) + '...', user: user?.email });
                    
                    // Set auth state immediately
                    get().setAuth(user, token, rememberMe);
                    
                    // Small delay to ensure state is set
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    console.log('📊 Final auth state:', {
                        isAuthenticated: get().isAuthenticated,
                        user: get().user,
                        token: get().token?.substring(0, 50) + '...'
                    });
                } catch (error: any) {
                    console.error('❌ Login error:', error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: 'bookease-auth',
        }
    )
);
