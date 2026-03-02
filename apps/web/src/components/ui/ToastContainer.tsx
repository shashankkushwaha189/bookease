import React from 'react';
import { useToastStore, Toast, ToastType } from '../../stores/toast.store';

const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToastStore();

  const getIcon = (type: ToastType): React.ReactNode => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getToastClasses = (type: ToastType): string => {
    switch (type) {
      case 'success':
        return 'bg-success text-white border-success';
      case 'error':
        return 'bg-danger text-white border-danger';
      case 'warning':
        return 'bg-warning text-white border-warning';
      case 'info':
        return 'bg-primary text-white border-primary';
      default:
        return 'bg-neutral-900 text-white border-neutral-900';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 sm:top-4 sm:right-4 md:top-6 md:right-6">
      {toasts.map((toast: Toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center p-4 rounded-lg shadow-lg border
            transform transition-all duration-300 ease-in-out
            animate-in slide-in-from-right-2 fade-in-0
            max-w-sm w-full
            ${getToastClasses(toast.type)}
          `}
          role="alert"
        >
          <div className="flex-shrink-0 mr-3">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 mr-3">
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="flex-shrink-0 p-1 rounded-md hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            aria-label="Dismiss toast"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
