import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

// Lazy load all pages for better performance
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const BookingPage = React.lazy(() => import('./pages/public/BookingPage'));
const BookingConfirmPage = React.lazy(() => import('./pages/BookingConfirmPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const AppointmentsPage = React.lazy(() => import('./pages/AppointmentsPage'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const ServicesPage = React.lazy(() => import('./pages/ServicesPage'));
const StaffPage = React.lazy(() => import('./pages/StaffPage'));
const CustomersPage = React.lazy(() => import('./pages/CustomersPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const ConfigPage = React.lazy(() => import('./pages/ConfigPage'));
const ImportPage = React.lazy(() => import('./pages/ImportPage'));
const BusinessProfilePage = React.lazy(() => import('./pages/admin/BusinessProfilePage'));
const MySchedulePage = React.lazy(() => import('./pages/MySchedulePage'));
const MyAppointmentsPage = React.lazy(() => import('./pages/MyAppointmentsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const ForbiddenPage = React.lazy(() => import('./pages/ForbiddenPage'));

// Layout Components
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';

// Route Components
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Loading component for lazy loading
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
