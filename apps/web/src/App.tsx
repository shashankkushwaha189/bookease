import { useEffect } from 'react'
import { applyTenantTheme } from './utils/theme'
import AppRouter from './router'
import ToastContainer from './components/ui/ToastContainer'
import DemoBanner from './components/DemoBanner'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  useEffect(() => {
    // Demo: Inject tenant theme on mount mapping 'brand' & 'brand-soft' primitives
    applyTenantTheme('#10B981', '#10B981')
    console.log('App component mounted')
  }, [])

  return (
    <ErrorBoundary>
      <DemoBanner />
      <div className={import.meta.env.VITE_DEMO_MODE ? 'pt-10' : ''}>
        <AppRouter />
      </div>
      <ToastContainer />
    </ErrorBoundary>
  )
}

export default App
