import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Tenant, BusinessProfile, getTenant, getBusinessProfile, applyTheme, ThemeManager } from '../lib/tenant';

interface TenantContextType {
  tenant: Tenant | null;
  profile: BusinessProfile | null;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tenant and profile
  const loadTenantAndProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Detect tenant
      const detectedTenant = await getTenant();
      setTenant(detectedTenant);

      // Load business profile
      if (detectedTenant) {
        const businessProfile = await getBusinessProfile(detectedTenant.slug);
        setProfile(businessProfile);
        
        // Apply theme
        applyTheme(businessProfile);
      }
    } catch (err) {
      console.error('Error loading tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  };

  // Refresh tenant
  const refreshTenant = async () => {
    try {
      setError(null);
      const detectedTenant = await getTenant();
      setTenant(detectedTenant);
      
      if (detectedTenant) {
        const businessProfile = await getBusinessProfile(detectedTenant.slug);
        setProfile(businessProfile);
        applyTheme(businessProfile);
      }
    } catch (err) {
      console.error('Error refreshing tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh tenant');
    }
  };

  // Refresh profile only
  const refreshProfile = async () => {
    if (!tenant) return;
    
    try {
      setError(null);
      const businessProfile = await getBusinessProfile(tenant.slug);
      setProfile(businessProfile);
      applyTheme(businessProfile);
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    }
  };

  // Initial load
  useEffect(() => {
    loadTenantAndProfile();
  }, []);

  // Listen for URL changes (for SPA routing)
  useEffect(() => {
    const handlePopState = () => {
      loadTenantAndProfile();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const value: TenantContextType = {
    tenant,
    profile,
    loading,
    error,
    refreshTenant,
    refreshProfile,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Higher-order component for tenant-specific pages
export const withTenant = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const { loading, error, tenant, profile } = useTenant();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-2">Error</div>
            <div className="text-gray-600">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} ref={ref} tenant={tenant} profile={profile} />;
  });
};
