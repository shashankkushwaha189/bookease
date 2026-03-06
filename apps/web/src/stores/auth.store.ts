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

    setAuth: (user: User, token: string) => void;
    logout: () => void;
    login: (email: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,

            setAuth: (user, token) => {
                console.log('🔑 Setting auth state:', { user, token: token?.substring(0, 50) + '...' });
                set({
                    user,
                    token,
                    isAuthenticated: true,
                });
                console.log('✅ Auth state set successfully');
            },

            logout: () =>
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                }),

            login: async (email: string, password: string) => {
                // Ensure demo tenant id is set (from seeded demo tenant)
                const DEMO_TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';
                const { tenantId, setTenantId } = useTenantStore.getState();
                if (!tenantId) {
                    setTenantId(DEMO_TENANT_ID);
                }

                console.log('🔐 Login attempt:', { email, tenantId: useTenantStore.getState().tenantId });
                
                set({ isLoading: true });
                try {
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
                    get().setAuth(user, token);
                    
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
