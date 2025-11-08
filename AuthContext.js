import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored) {
      setUser(JSON.parse(stored));
      setLoading(false);
      return;
    }
    // If we have a token but no stored user, decode token for minimal user info
    if (!stored && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const minimal = { student_id: payload.student_id, email: payload.email };
        setUser(minimal);
        localStorage.setItem('user', JSON.stringify(minimal));
      } catch (e) {
        console.warn('Failed to decode token', e);
      }
    }
    setLoading(false);
  }, []);

  // 🔹 Login
  const login = (u) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  // 🔹 Logout
  const logout = async () => {
    if (user) {
      try {
        await api.logout(user.student_id);
      } catch (e) {
        console.warn('Logout API failed', e);
      }
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.hash = 'login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
