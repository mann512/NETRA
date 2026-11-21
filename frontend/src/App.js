import React, { useState, useEffect } from 'react';
import { api, getToken, setToken, clearToken, setUser, getUser } from './api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUserState] = useState(getUser());
  const [loading, setLoading] = useState(false);

  async function handleLogin(username, password) {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setToken(res.token);
      setUser(res.user);
      setUserState(res.user);
    } catch (e) {
      alert('Login failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setUserState(null);
  }

  if (!user) return <Login onLogin={handleLogin} loading={loading} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}