import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'CUSTOMER') {
    return <Navigate to="/bills" replace />;
  } else if (user?.role === 'TECHNICIAN') {
    return <Navigate to="/dashboard" replace />;
  } else if (user?.role === 'MANAGER') {
    return <Navigate to="/dashboard" replace />;
  }

  // Default fallback
  return <Navigate to="/dashboard" replace />;
};

export default RoleBasedRedirect;
