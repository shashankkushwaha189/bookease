import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/auth';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,

            setAuth: (user, token) => set({
                user,
                token,
                isAuthenticated: true,
            }),

            logout: () => set({
                user: null,
                token: null,
                isAuthenticated: false,
            }),
        }),
        {
            name: 'bookease-auth', // localStorage key
        }
    )
);
