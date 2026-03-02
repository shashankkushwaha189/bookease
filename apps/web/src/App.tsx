import { useEffect } from 'react'
import { applyTenantTheme } from './utils/theme'

function App() {
  useEffect(() => {
    // Demo: Inject tenant theme on mount mapping 'brand' & 'brand-soft' primitives
    applyTenantTheme('#10B981', '#10B981')
  }, [])

  return (
    <div className="min-h-screen bg-brand-soft p-8">
      <div className="max-w-md mx-auto bg-surface rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-primary font-semibold">
            BookEase Web
          </div>
          <p className="block mt-1 text-lg leading-tight font-medium text-neutral-900">
            Frontend Scaffolding Complete
          </p>
          <p className="mt-2 text-neutral-600">
            Tailwind CSS styling is successfully bound to the custom <span className="text-brand font-bold">brand</span> tokens!
          </p>
          <button className="mt-4 px-4 py-2 bg-brand text-white rounded hover:opacity-90 transition-opacity">
            Action Button
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
