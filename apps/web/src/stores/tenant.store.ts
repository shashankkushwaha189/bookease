import { create } from 'zustand';
import { applyTenantTheme } from '../utils/theme';
import { BusinessProfile } from '../types/tenant';
import api from '../api/client'; // Notice this will be built next

interface TenantState {
    tenantId: string | null;
    businessProfile: BusinessProfile | null;
    themeLoaded: boolean;
    isError: boolean;

    setTenantId: (id: string) => void;
    loadProfile: () => Promise<void>;
}

export const useTenantStore = create<TenantState>((set, get) => ({
    tenantId: null, // Should be resolved from URL, subdomain, or preset config
    businessProfile: null,
    themeLoaded: false,
    isError: false,

    setTenantId: (id) => set({ tenantId: id }),

    loadProfile: async () => {
        const { tenantId } = get();
        if (!tenantId) return;

        try {
            const response = await api.get<{ data: BusinessProfile }>('/api/public/profile');
            const profile = response.data.data;

            // Inject CSS variables directly into DOM root on load
            applyTenantTheme(profile.brandColor, profile.accentColor);

            set({ businessProfile: profile, themeLoaded: true, isError: false });
        } catch (e) {
            console.error('Failed to load Tenant profile:', e);
            set({ isError: true, themeLoaded: true }); // Still mark loaded to prevent infinite spinners
        }
    }
}));
