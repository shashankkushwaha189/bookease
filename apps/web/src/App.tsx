import { useEffect } from 'react'
import { TenantProvider, useTenant } from './components/TenantProvider'
import { apiClient } from './lib/api-client'
import AppRouter from './router'
import ToastContainer from './components/ui/ToastContainer'
import DemoBanner from './components/DemoBanner'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  useEffect(() => {
    console.log('App component mounted')
  }, [])

  return (
    <ErrorBoundary>
      <TenantProvider>
        <TenantAwareApp />
      </TenantProvider>
    </ErrorBoundary>
  )
}

// Inner component that uses tenant context
function TenantAwareApp() {
  const { tenant, profile } = useTenant();

  useEffect(() => {
    // Update API client with current tenant
    if (tenant) {
      apiClient.setTenant(tenant, profile);
    }
  }, [tenant, profile]);

  return (
    <>
      <DemoBanner />
      <div className={import.meta.env.VITE_DEMO_MODE ? 'pt-10' : ''}>
        <AppRouter />
      </div>
      <ToastContainer />
    </>
  );
}

export default App
