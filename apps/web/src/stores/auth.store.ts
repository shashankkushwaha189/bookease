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

    setAuth: (user: User, token: string, rememberMe?: boolean) => void;
    logout: () => void;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    setRememberMe: (rememberMe: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            rememberMe: false,

            setAuth: (user, token, rememberMe = false) => {
                console.log('🔑 Setting auth state:', { user, token: token?.substring(0, 50) + '...', rememberMe });
                set({
                    user,
                    token,
                    isAuthenticated: true,
                    rememberMe,
                });
                console.log('✅ Auth state set successfully');
            },

            logout: () =>
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    rememberMe: false,
                }),

            setRememberMe: (rememberMe) => set({ rememberMe }),

            login: async (email: string, password: string, rememberMe = false) => {
                // Trim whitespace from password
                password = password.trim();
                
                // Get current tenant slug from store
                const { tenantSlug } = useTenantStore.getState();
                
                console.log('🔐 Login attempt:', { email, tenantSlug: tenantSlug || 'none' });
                console.log('🌐 API Base URL:', import.meta.env.VITE_API_URL);
                
                set({ isLoading: true });
                try {
                    console.log('📤 Making API request to:', '/api/auth/login');
                    console.log('📤 Request payload:', { email, password: password, length: password.length });
                    
                    const response = await api.post<AuthResponse>('/api/auth/login', {
                        email,
                        password,
                    });

                    console.log('✅ Login response:', response.data);
                    console.log('🔍 Response structure:', JSON.stringify(response.data, null, 2));
                    
                    // Expected structure: { success: true, data: { token, user } }
                    const authData = response.data?.data;
                    if (!authData?.token || !authData?.user) {
                        console.error('❌ Unexpected response structure:', response.data);
                        throw new Error('Invalid login response structure');
                    }

                    const token: string = authData.token;
                    const user: User = authData.user;
                    
                    console.log('🔑 Extracted auth:', { token: token?.substring(0, 50) + '...', user: user?.email });

                    // Persist tenant UUID from the authenticated user for future requests
                    const { setTenantUuid } = useTenantStore.getState();
                    setTenantUuid(user.tenantId);
                    
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
