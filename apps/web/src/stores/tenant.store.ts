import { create } from 'zustand';
import { applyTenantTheme } from '../utils/theme';
import { BusinessProfile } from '../types/tenant';
import api from '../api/client';

interface TenantState {
    tenantId: string | null;
    tenantSlug: string | null;
    businessProfile: BusinessProfile | null;
    currentTenant: { businessName?: string; logoUrl?: string } | null;
    themeLoaded: boolean;
    isError: boolean;

    setTenantId: (id: string) => void;
    setTenantSlug: (slug: string) => void;
    setTenantUuid: (tenantId: string | null) => void;
    loadProfile: () => Promise<void>;
}

export const useTenantStore = create<TenantState>((set, get) => ({
    tenantId: null, // Should be resolved from URL, subdomain, or preset config
    tenantSlug: null,
    businessProfile: null,
    currentTenant: null,
    themeLoaded: false,
    isError: false,

    setTenantId: (id) =>
        set({
            tenantSlug: id,
            tenantId: null,
            currentTenant: { businessName: 'HealthFirst Clinic' },
        }),

    setTenantSlug: (slug) =>
        set({
            tenantSlug: slug,
            tenantId: null,
            currentTenant: { businessName: slug === 'wellness-spa-v2' ? 'Wellness Spa Center' : 'Demo Clinic' },
        }),

    setTenantUuid: (tenantId) => set({ tenantId }),

    loadProfile: async () => {
        const { tenantId, tenantSlug } = get();
        if (!tenantId && !tenantSlug) return;

        try {
            const response = await api.get<BusinessProfile>('/api/public/profile');
            const profile = response.data;

            applyTenantTheme(profile.brandColor, profile.accentColor);

            set({ businessProfile: profile, themeLoaded: true, isError: false });
        } catch (e) {
            console.error('Failed to load Tenant profile:', e);
            set({ isError: true, themeLoaded: true });
        }
    }
}));
