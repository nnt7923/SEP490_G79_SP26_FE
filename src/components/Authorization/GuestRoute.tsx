import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import ROUTER from '../../router/ROUTER';
import useAuthStore from '../../store/useAuthStore';

const GuestRoute: React.FC = () => {
  const { token, user } = useAuthStore();

  if (token && user) {
    const role = String((user as any)?.role?.name || '').toLowerCase();
    switch (role) {
      case 'admin':
        return <Navigate to={ROUTER.ADMIN_DASHBOARD} replace />;
      case 'mentor':
        return <Navigate to={ROUTER.MENTOR_DASHBOARD} replace />;
      case 'student':
        return <Navigate to={ROUTER.STUDENT_DASHBOARD} replace />;
      default:
        return <Navigate to={ROUTER.STUDENT_DASHBOARD} replace />;
    }
  }

  return <Outlet />;
};

export default GuestRoute;
