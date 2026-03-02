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

            setAuth: (user, token) =>
                set({
                    user,
                    token,
                    isAuthenticated: true,
                }),

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

                set({ isLoading: true });
                try {
                    const response = await api.post<AuthResponse>('/api/auth/login', {
                        email,
                        password,
                    });

                    const { token, user } = response.data;
                    get().setAuth(user, token);
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
