import React, { createContext, useContext, useState, useCallback } from 'react';
import { authAPI, setAuthToken } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const response = await authAPI.login(email, password);
      const data = response.data;

      if (data.must_change_password) {
        return { success: false, must_change_password: true, setup_token: data.setup_token };
      }

      const { token, user: userData } = data;
      setAuthToken(token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const data = err.response?.data;
      const message = data?.error || 'Login failed';
      setError(message);
      if (data?.needs_verification) {
        return { success: false, error: message, needs_verification: true, verification_token: data.verification_token };
      }
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const response = await authAPI.register(userData);
      return { success: true, data: response.data };
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const verifyEmail = useCallback(async (verificationToken, code) => {
    setError(null);
    try {
      const response = await authAPI.verifyEmail(verificationToken, code);
      const { token, user: userData } = response.data;
      setAuthToken(token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Verification failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const setupPassword = useCallback(async (setupToken, newPassword) => {
    setError(null);
    try {
      const response = await authAPI.setupPassword(setupToken, newPassword);
      const data = response.data;
      if (data.verification_token) {
        return { success: true, verification_token: data.verification_token };
      }
      const { token, user: userData } = data;
      setAuthToken(token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Setup failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      const updatedUser = response.data.user;
      setUser(updatedUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Update failed';
      return { success: false, error: message };
    }
  }, []);

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      await authAPI.updatePassword(currentPassword, newPassword);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Password update failed';
      return { success: false, error: message };
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isStudent: user?.role === 'student',
    isInstructor: user?.role === 'instructor',
    isAdmin: user?.role === 'admin',
    login,
    register,
    verifyEmail,
    setupPassword,
    logout,
    updateProfile,
    updatePassword,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
