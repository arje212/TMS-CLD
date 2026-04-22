import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const ProtectedRoute = ({ children, requiredRole = null, requireAdmin = false, requireTrainee = false }) => {
  const { isAuthenticated, currentUser, initialLoading } = useAuth();

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = currentUser?.role;

  // Legacy support for older props, mapped to new logic
  if (requireAdmin && role !== 'admin') {
    return <Navigate to={role === 'trainee' ? "/trainee-dashboard" : "/"} replace />;
  }

  if (requireTrainee && role !== 'trainee') {
    return <Navigate to={role === 'admin' ? "/dashboard" : "/"} replace />;
  }

  // New role-based check
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === 'admin' ? "/dashboard" : "/trainee-dashboard"} replace />;
  }

  return children;
};

export default ProtectedRoute;