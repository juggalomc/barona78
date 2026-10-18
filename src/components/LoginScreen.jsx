import React, { useState } from 'react';
import { Toast } from './shared/Toast';
import { Building2, Mail, Lock, ArrowRight, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';

export function LoginScreen({ onLogin }) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setToast({ message: 'Lūdzu, ievadiet e-pastu un paroli', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogin(loginEmail, loginPassword);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (email, pass) => {
    setLoginEmail(email);
    setLoginPassword(pass);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '24px 16px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden'
      }}>
        {/* Top Header Banner */}
        <div style={{
          padding: '32px 32px 24px 32px',
          textAlign: 'center',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            <Building2 size={26} />
          </div>

          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: '22px',
            fontWeight: '700',
            color: '#0f172a',
            letterSpacing: '-0.025em'
          }}>
            BARONA 78
          </h1>
          <p style={{
            margin: 0,
            fontSize: '13.5px',
            color: '#64748b'
          }}>
            Rēķinu vadības un apsaimniekošanas sistēma
          </p>
        </div>

        {/* Login Form */}
        <div style={{ padding: '28px 32px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                E-pasta adrese
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  placeholder="vards@barona78.lv"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s'
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Parole
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s'
                  }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '8px',
                padding: '11px 18px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.15s',
                opacity: isSubmitting ? 0.7 : 1
              }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#2563eb'; }}
            >
              <span>{isSubmitting ? 'Pieslēdzas...' : 'Pierakstīties'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#64748b',
              marginBottom: '10px'
            }}>
              <KeyRound size={14} />
              <span>Ātrā testa piekļuve:</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fillDemo('admin@barona78.lv', 'admin')}
                style={{
                  padding: '9px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'center',
                  transition: 'background 0.15s, border-color 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              >
                <ShieldCheck size={14} style={{ color: '#2563eb' }} />
                <span>Administrators</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('dzivoklis1@barona78.lv', 'user123')}
                style={{
                  padding: '9px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'center',
                  transition: 'background 0.15s, border-color 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              >
                <UserCheck size={14} style={{ color: '#16a34a' }} />
                <span>Dzīvoklis 1</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footnote */}
        <div style={{
          padding: '12px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center',
          fontSize: '11.5px',
          color: '#94a3b8'
        }}>
          Droša autorizācija ar datu šifrēšanu • Barona 78
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
