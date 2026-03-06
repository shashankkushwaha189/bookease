import React from 'react';

const PageLoader: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="animate-pulse bg-gray-200 h-8 w-48 rounded mb-4"></div>
          <div className="animate-pulse bg-gray-200 h-4 w-96 rounded"></div>
        </div>

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded mb-3"></div>
              <div className="animate-pulse bg-gray-200 h-3 w-full rounded mb-2"></div>
              <div className="animate-pulse bg-gray-200 h-3 w-5/6 rounded mb-4"></div>
              <div className="flex items-center justify-between">
                <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                <div className="animate-pulse bg-gray-200 h-8 w-8 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="animate-pulse bg-gray-200 h-6 w-32 rounded"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Array.from({ length: 4 }, (_, index) => (
                    <th key={index} className="px-6 py-3 text-left">
                      <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from({ length: 5 }, (_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 4 }, (_, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                        <div className="animate-pulse bg-gray-200 h-4 w-32 rounded"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action buttons skeleton */}
        <div className="mt-8 flex justify-end space-x-3">
          <div className="animate-pulse bg-neutral-200 h-10 w-24 rounded"></div>
          <div className="animate-pulse bg-neutral-200 h-10 w-32 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
