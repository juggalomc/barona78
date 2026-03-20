import React, { useState } from 'react';
import { Toast } from './shared/Toast';

export function LoginScreen({ onLogin }) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [toast, setToast] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setToast({ message: 'Aizpildiet email un paroli', type: 'error' });
      return;
    }

    await onLogin(loginEmail, loginPassword);
    setLoginEmail('');
    setLoginPassword('');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', color: '#003399', marginBottom: '30px', fontSize: '28px' }}>🏢 BARONA 78</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder="E-pasts"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
          />
          <input
            type="password"
            placeholder="Parole"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
          />
          <button
            type="submit"
            style={{ padding: '12px', background: '#003399', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
          >
            Pierakstīties
          </button>
        </form>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
