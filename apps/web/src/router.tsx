import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

// Lazy load all pages for better performance
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const BookingPage = React.lazy(() => import('./pages/public/BookingPage'));
const BookingConfirmPage = React.lazy(() => import('./pages/BookingConfirmPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const AppointmentsPage = React.lazy(() => import('./pages/AppointmentsPage'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const ServicesPage = React.lazy(() => import('./pages/admin/ServicesPage'));
const StaffPage = React.lazy(() => import('./pages/admin/StaffPage'));
const CustomersPage = React.lazy(() => import('./pages/CustomersPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const ConfigPage = React.lazy(() => import('./pages/ConfigPage'));
const ImportPage = React.lazy(() => import('./pages/ImportPage'));
const BusinessProfilePage = React.lazy(() => import('./pages/admin/BusinessProfilePage'));
const MySchedulePage = React.lazy(() => import('./pages/MySchedulePage'));
const MyAppointmentsPage = React.lazy(() => import('./pages/MyAppointmentsPage'));
const StaffAvailabilityPage = React.lazy(() => import('./pages/StaffAvailabilityPage'));
const StaffPerformancePage = React.lazy(() => import('./pages/StaffPerformancePage'));
const CustomerBookingsPage = React.lazy(() => import('./pages/CustomerBookingsPage'));
const CustomerProfilePage = React.lazy(() => import('./pages/CustomerProfilePage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const ForbiddenPage = React.lazy(() => import('./pages/ForbiddenPage'));

// Layout Components
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import CustomerLayout from './components/layout/CustomerLayout';

// Route Components
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Loading component for lazy loading
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

// Production-ready router with lazy loading and error boundaries
const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <ErrorBoundary>
            <LoginPage />
          </ErrorBoundary>
        </PublicLayout>
      </Suspense>
    ),
  },
  {
    path: '/:tenantSlug/book',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <ErrorBoundary>
            <BookingPage />
          </ErrorBoundary>
        </PublicLayout>
      </Suspense>
    ),
  },
  {
    path: '/:tenantSlug/book/confirm',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicLayout>
          <ErrorBoundary>
            <BookingConfirmPage />
          </ErrorBoundary>
        </PublicLayout>
      </Suspense>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="ADMIN">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <DashboardPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'business-profile',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <BusinessProfilePage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'appointments',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <AppointmentsPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'calendar',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <CalendarPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'services',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <ServicesPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'staff',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <StaffPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'customers',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <CustomersPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <ReportsPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'config',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <ConfigPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'import',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <ImportPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/staff',
    element: (
      <ProtectedRoute requiredRole={['STAFF', 'ADMIN']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/staff/schedule" replace />,
      },
      {
        path: 'schedule',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <MySchedulePage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'appointments',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <MyAppointmentsPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'availability',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <StaffAvailabilityPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'performance',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <StaffPerformancePage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/customer',
    element: (
      <ProtectedRoute requiredRole="USER">
        <CustomerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/customer/bookings" replace />,
      },
      {
        path: 'bookings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <CustomerBookingsPage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <CustomerProfilePage />
            </ErrorBoundary>
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/403',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ErrorBoundary>
          <ForbiddenPage />
        </ErrorBoundary>
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ErrorBoundary>
          <NotFoundPage />
        </ErrorBoundary>
      </Suspense>
    ),
  },
]);

// Router provider component
const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
