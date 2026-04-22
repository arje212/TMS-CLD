import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';

const AuthContext = createContext();

// MOCK ADMIN DATA - for development/testing only
const MOCK_ADMIN = {
  id: 'admin-001',
  email: 'raybhudz90@gmail.com',
  password: 'Bhudzray91',
  name: 'Admin User',
  role: 'admin'
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (pb.authStore.isValid) {
      setCurrentUser(pb.authStore.model);
    }
    setInitialLoading(false);
  }, []);

  const login = async (email, password) => {
    // MOCK LOGIN - Check against hardcoded admin credentials
    if (email === MOCK_ADMIN.email && password === MOCK_ADMIN.password) {
      const mockAuthData = {
        record: MOCK_ADMIN,
        token: 'mock-token-' + Date.now()
      };
      setCurrentUser(mockAuthData.record);
      // Store in localStorage for persistence
      localStorage.setItem('mockAuth', JSON.stringify(mockAuthData.record));
      return mockAuthData;
    }

    // Try real PocketBase authentication as fallback
    try {
      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      setCurrentUser(authData.record);
      return authData;
    } catch (error) {
      throw new Error('Invalid email or password');
    }
  };

  const logout = () => {
    pb.authStore.clear();
    localStorage.removeItem('mockAuth');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    logout,
    initialLoading,
    isAuthenticated: pb.authStore.isValid || !!currentUser,
    isAdmin: currentUser?.role === 'admin',
    isTrainee: currentUser?.role === 'trainee',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};