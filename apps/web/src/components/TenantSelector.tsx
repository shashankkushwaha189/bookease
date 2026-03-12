import React from 'react';
import { Building2, ChevronDown } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface TenantSelectorProps {
  selectedTenant: string;
  onTenantChange: (tenantSlug: string) => void;
  className?: string;
}

const TenantSelector: React.FC<TenantSelectorProps> = ({ 
  selectedTenant, 
  onTenantChange, 
  className = '' 
}) => {
  const availableTenants: Tenant[] = [
    {
      id: '9d6a9a2c-4d64-4167-a9ae-2f0c21f34939',
      name: 'Demo Clinic',
      slug: 'demo-clinic'
    },
    {
      id: 'b2934b40-378c-4736-82d1-b56a1d905858',
      name: 'Wellness Spa Center',
      slug: 'wellness-spa-v2'
    },
    {
      id: '679fb5e6-0de4-4d2c-864a-b7370c28600e',
      name: 'Test Spa',
      slug: 'test-spa'
    }
  ];

  return (
    <div className={`relative ${className}`}>
      <label className="block text-base font-semibold text-gray-700 mb-2">
        Select Tenant
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Building2 className="w-5 h-5 text-gray-400" />
        </div>
        <select
          value={selectedTenant}
          onChange={(e) => onTenantChange(e.target.value)}
          className="w-full pl-12 pr-10 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base appearance-none bg-gray-50 focus:bg-white transition-all duration-200"
        >
          <option value="">Choose a tenant...</option>
          {availableTenants.map((tenant) => (
            <option key={tenant.id} value={tenant.slug}>
              {tenant.name} ({tenant.slug})
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      {selectedTenant && (
        <p className="mt-2 text-sm text-gray-600">
          Logging into: <span className="font-semibold text-blue-600">{selectedTenant}</span>
        </p>
      )}
    </div>
  );
};

export default TenantSelector;
