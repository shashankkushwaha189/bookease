import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import BookingPage from './pages/public/BookingPage';
import BookingConfirmPage from './pages/BookingConfirmPage';
import DashboardPage from './pages/DashboardPage';
import AppointmentsPage from './pages/AppointmentsPage';
import CalendarPage from './pages/CalendarPage';
import ServicesPage from './pages/ServicesPage';
import StaffPage from './pages/StaffPage';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';
import ConfigPage from './pages/ConfigPage';
import ImportPage from './pages/ImportPage';
import BusinessProfilePage from './pages/admin/BusinessProfilePage';
import MySchedulePage from './pages/MySchedulePage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import NotFoundPage from './pages/NotFoundPage';
import ForbiddenPage from './pages/ForbiddenPage';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Complete router with all pages
const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <PublicLayout>
        <LoginPage />
      </PublicLayout>
    ),
  },
  {
    path: '/:tenantSlug/book',
    element: (
      <PublicLayout>
        <BookingPage />
      </PublicLayout>
    ),
  },
  {
    path: '/:tenantSlug/book/confirm',
    element: (
      <PublicLayout>
        <BookingConfirmPage />
      </PublicLayout>
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
        element: <DashboardPage />,
      },
      {
        path: 'business-profile',
        element: <BusinessProfilePage />,
      },
      {
        path: 'appointments',
        element: <AppointmentsPage />,
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
      {
        path: 'services',
        element: <ServicesPage />,
      },
      {
        path: 'staff',
        element: <StaffPage />,
      },
      {
        path: 'customers',
        element: <CustomersPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'config',
        element: <ConfigPage />,
      },
      {
        path: 'import',
        element: <ImportPage />,
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
        element: <MySchedulePage />,
      },
      {
        path: 'appointments',
        element: <MyAppointmentsPage />,
      },
    ],
  },
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

// Router provider component
const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
