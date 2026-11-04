import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredScope?: string | string[];
  fallbackPath?: string;
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  children, 
  allowedRoles, 
  requiredScope,
  fallbackPath = '/bills' 
}) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isManager = user.role === 'MANAGER';
  const isTechnician = user.role === 'TECHNICIAN';

  // Check role first if explicitly specified
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // If user has specific scope granted
  let hasRequiredScope = true;
  if (requiredScope) {
    const userScopes: string[] = user.scopes || [];
    if (isManager) {
      hasRequiredScope = true;
    } else if (Array.isArray(requiredScope)) {
      hasRequiredScope = requiredScope.some(s => userScopes.includes(s));
    } else if (requiredScope === 'job_cards' && isTechnician) {
      hasRequiredScope = true;
    } else if (userScopes.length > 0) {
      hasRequiredScope = userScopes.includes(requiredScope);
    } else {
      // Fallback defaults
      if (isTechnician) {
        hasRequiredScope = ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services', 'view_customer_retail'].includes(requiredScope);
      } else if (user.role === 'CUSTOMER') {
        hasRequiredScope = requiredScope === 'bills';
      } else {
        hasRequiredScope = false;
      }
    }
  }

  // If a required scope is explicitly defined and user has it, grant access
  if (requiredScope && hasRequiredScope) {
    return <>{children}</>;
  }

  if (!hasRequiredScope) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;
