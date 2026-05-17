import React, { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';

export default function AdminWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        localStorage.setItem('admin_session', 'true');
        localStorage.setItem('admin_password', password); // For header auth
        setIsAuthenticated(true);
      } else {
        setError('Hatalı şifre');
      }
    } catch (err) {
      setError('Bağlantı hatası');
    }
  };

  if (isAuthenticated) {
    return <AdminDashboard />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f4f4f4' }}>
      <form onSubmit={handleLogin} style={{ padding: '2rem', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '1rem', color: '#333' }}>Admin Girişi</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Şifre"
          style={{ padding: '0.5rem', width: '100%', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#e63946', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
          Giriş
        </button>
        {error && <p style={{ color: 'red', marginTop: '1rem', fontSize: '14px' }}>{error}</p>}
      </form>
    </div>
  );
}
