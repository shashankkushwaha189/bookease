import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyTenantTheme } from '../utils/theme';
import { BusinessProfile } from '../types/tenant';
import api from '../api/client';
import { ApiSuccessResponse } from '../types/api';

interface TenantState {
    tenantId: string | null;
    businessProfile: BusinessProfile | null;
    currentTenant: Pick<BusinessProfile, 'businessName' | 'logoUrl'> | null;
    themeLoaded: boolean;
    isError: boolean;

    setTenantId: (id: string) => void;
    loadProfile: () => Promise<void>;
}

export const useTenantStore = create<TenantState>()(
    persist(
        (set, get) => ({
            tenantId: null, // Should be resolved from URL, subdomain, or preset config
            businessProfile: null,
            currentTenant: null,
            themeLoaded: false,
            isError: false,

            setTenantId: (id) => {
                set({
                    tenantId: id,
                    businessProfile: null,
                    currentTenant: null,
                    themeLoaded: false,
                    isError: false,
                });
                // Auto-load profile when tenant ID is set
                get().loadProfile();
            },
            // Auto-load profile when tenant ID is set
            loadProfile: async () => {
                const { tenantId } = get();
                if (!tenantId) return;

                try {
                    const response = await api.get<ApiSuccessResponse<BusinessProfile>>('/api/public/profile');
                    const profile = response.data.data;

                    applyTenantTheme(profile.brandColor, profile.accentColor);

                    set({
                        businessProfile: profile,
                        currentTenant: { businessName: profile.businessName, logoUrl: profile.logoUrl },
                        themeLoaded: true,
                        isError: false,
                    });
                } catch (e) {
                    console.error('Failed to load Tenant profile:', e);
                    set({ isError: true, themeLoaded: true });
                }
            }
        }),
        {
            name: 'tenant-storage',
        }
    )
);
