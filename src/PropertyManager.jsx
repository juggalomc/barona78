import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants
const BUILDING_NAME = "BIEDRĪBA \"BARONA 78\"";

export default function PropertyManager() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [toasts, setToasts] = useState([]);

  // Admin state
  const [apartments, setApartments] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [waterTariffs, setWaterTariffs] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // User state
  const [userApartment, setUserApartment] = useState(null);
  const [userInvoices, setUserInvoices] = useState([]);
  const [meterReadings, setMeterReadings] = useState([]);
  const [meterForm, setMeterForm] = useState({
    meter_type: 'electricity',
    reading_value: '',
    reading_date: new Date().toISOString().split('T')[0]
  });

  const showToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // AUTH FUNCTIONS
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast('Aizpildiet email un paroli', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', loginEmail)
        .single();

      if (error || !data) {
        showToast('Nepareizs email vai parole', 'error');
        return;
      }

      // Vienkārša paroles pārbaude (real app - izmantot bcrypt)
      if (data.password !== loginPassword) {
        showToast('Nepareizs email vai parole', 'error');
        return;
      }

      setCurrentUser(data);
      if (data.role === 'admin') {
        setIsAdmin(true);
        fetchAdminData();
      } else {
        setIsAdmin(false);
        fetchUserData(data.apartment_id);
      }
      setLoginEmail('');
      setLoginPassword('');
      showToast('✓ Pierakstīts!');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setLoginEmail('');
    setLoginPassword('');
    showToast('✓ Izrakstīts');
  };

  // ADMIN FUNCTIONS
  const fetchAdminData = async () => {
    try {
      const [aptRes, tarRes, invRes, wtRes, usersRes, mrRes] = await Promise.all([
        supabase.from('apartments').select('*').order('number', { ascending: true }),
        supabase.from('tariffs').select('*').order('period', { ascending: false }),
        supabase.from('invoices').select('*').order('period', { ascending: false }),
        supabase.from('water_tariffs').select('*'),
        supabase.from('users').select('*'),
        supabase.from('meter_readings').select('*')
      ]);

      setApartments(aptRes.data || []);
      setTariffs(tarRes.data || []);
      setInvoices(invRes.data || []);
      setWaterTariffs(wtRes.data || []);
      setUsers(usersRes.data || []);
      setMeterReadings(mrRes.data || []);
    } catch (error) {
      showToast('Kļūda ielādējot datus', 'error');
    }
  };

  const createUserForApartment = async (apartmentId) => {
    const apt = apartments.find(a => a.id === apartmentId);
    const email = prompt(`Email dzīvoklim ${apt.number}:`);
    if (!email) return;

    try {
      const { error } = await supabase.from('users').insert([{
        apartment_id: apartmentId,
        email: email,
        password: Math.random().toString(36).slice(-8),
        role: 'user'
      }]);

      if (error) throw error;
      fetchAdminData();
      showToast('✓ Lietotājs izveidots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  // USER FUNCTIONS
  const fetchUserData = async (apartmentId) => {
    try {
      const [aptRes, invRes, mrRes] = await Promise.all([
        supabase.from('apartments').select('*').eq('id', apartmentId).single(),
        supabase.from('invoices').select('*').eq('apartment_id', apartmentId),
        supabase.from('meter_readings').select('*').eq('apartment_id', apartmentId)
      ]);

      setUserApartment(aptRes.data);
      setUserInvoices(invRes.data || []);
      setMeterReadings(mrRes.data || []);
    } catch (error) {
      showToast('Kļūda ielādējot datus', 'error');
    }
  };

  const saveMeterReading = async (e) => {
    e.preventDefault();
    if (!currentUser || !userApartment) return;

    try {
      const { error } = await supabase.from('meter_readings').insert([{
        apartment_id: currentUser.apartment_id,
        meter_type: meterForm.meter_type,
        reading_date: meterForm.reading_date,
        reading_value: parseFloat(meterForm.reading_value)
      }]);

      if (error) throw error;
      setMeterForm({ meter_type: 'electricity', reading_value: '', reading_date: new Date().toISOString().split('T')[0] });
      fetchUserData(currentUser.apartment_id);
      showToast('✓ Rādījums saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  // UI STYLES
  const styles = {
    container: { maxWidth: '1400px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' },
    header: { textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid #003399', paddingBottom: '20px' },
    title: { fontSize: '32px', fontWeight: 'bold', color: '#003399', margin: '0 0 10px 0' },
    subtitle: { fontSize: '13px', color: '#666' },
    nav: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    navBtn: { padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
    navBtnActive: { background: '#003399', color: 'white' },
    navBtnInactive: { background: '#e5e7eb', color: '#333' },
    card: { background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' },
    btn: { padding: '10px 20px', background: '#003399', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' },
    list: { display: 'flex', flexDirection: 'column', gap: '10px' },
    listItem: { padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    toast: (type) => ({ padding: '12px 16px', borderRadius: '4px', marginBottom: '10px', fontSize: '13px', background: type === 'error' ? '#fee' : '#efe', color: type === 'error' ? '#c33' : '#3c3' })
  };

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>{BUILDING_NAME}</h1>
          <p style={styles.subtitle}>Rēķinu un ūdens patēriņa vadības sistēma</p>
        </div>

        <div style={{ maxWidth: '400px', margin: '60px auto' }}>
          <div style={styles.card}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Pierakstīšanās</h2>
            <form onSubmit={handleLogin} style={styles.form}>
              <input
                type="email"
                placeholder="E-pasts"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={styles.input}
              />
              <input
                type="password"
                placeholder="Parole"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.btn}>Pierakstīties</button>
            </form>
          </div>
        </div>

        {toasts.map(t => (
          <div key={t.id} style={{ position: 'fixed', top: '10px', right: '10px', ...styles.toast(t.type) }}>
            {t.msg}
          </div>
        ))}
      </div>
    );
  }

  // ADMIN PANEL
  if (isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🔧 Admin Panelis - {BUILDING_NAME}</h1>
          <button onClick={handleLogout} style={{ position: 'absolute', top: '20px', right: '20px', ...styles.btn, background: '#ef4444' }}>
            Izrakstīties
          </button>
        </div>

        <nav style={styles.nav}>
          {['overview', 'apartments', 'users', 'tariffs', 'water', 'invoices'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.navBtn,
                ...(activeTab === tab ? styles.navBtnActive : styles.navBtnInactive)
              }}
            >
              {tab === 'overview' && '📊 Pārskats'}
              {tab === 'apartments' && '🏠 Dzīvokļi'}
              {tab === 'users' && '👥 Lietotāji'}
              {tab === 'tariffs' && '💰 Tarifi'}
              {tab === 'water' && '💧 Ūdens'}
              {tab === 'invoices' && '📄 Rēķini'}
            </button>
          ))}
        </nav>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={styles.card}>
            <h2>📊 Sistēmas Pārskats</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
              <div style={{ padding: '15px', background: '#e0f2fe', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Dzīvokļu skaits</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#003399' }}>{apartments.length}</div>
              </div>
              <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Rēķinu skaits</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{invoices.length}</div>
              </div>
              <div style={{ padding: '15px', background: '#fef3c7', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Apmaksāto rēķinu</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{invoices.filter(i => i.paid).length}</div>
              </div>
              <div style={{ padding: '15px', background: '#fee2e2', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Neatmaksāto parāds</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>€{invoices.filter(i => !i.paid).reduce((sum, i) => sum + i.amount, 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div style={styles.card}>
            <h2>👥 Lietotāji</h2>
            <div style={styles.list}>
              {apartments.map(apt => {
                const user = users.find(u => u.apartment_id === apt.id);
                return (
                  <div key={apt.id} style={styles.listItem}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Dzīv. {apt.number}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{user ? user.email : 'Nav lietotāja'}</div>
                    </div>
                    {!user && (
                      <button onClick={() => createUserForApartment(apt.id)} style={{ ...styles.btn, padding: '6px 12px', fontSize: '12px' }}>
                        + Izveidot
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pārējie tabi - vienkāršota versija */}
        {activeTab === 'apartments' && (
          <div style={styles.card}>
            <h2>🏠 Dzīvokļu saraksts ({apartments.length})</h2>
            <div style={styles.list}>
              {apartments.map(apt => (
                <div key={apt.id} style={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Dzīv. {apt.number}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>📐 {apt.area} m² • 👤 {apt.declared_persons || 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tariffs' && (
          <div style={styles.card}>
            <h2>💰 Tarifi ({tariffs.length})</h2>
            <p style={{ color: '#666' }}>Tarifi pēc periodam...</p>
          </div>
        )}

        {activeTab === 'water' && (
          <div style={styles.card}>
            <h2>💧 Ūdens ({waterTariffs.length})</h2>
            <p style={{ color: '#666' }}>Ūdens vadība...</p>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div style={styles.card}>
            <h2>📄 Rēķini ({invoices.length})</h2>
            <p style={{ color: '#666' }}>Rēķinu saraksts...</p>
          </div>
        )}

        {toasts.map(t => (
          <div key={t.id} style={{ position: 'fixed', top: '10px', right: '10px', ...styles.toast(t.type) }}>
            {t.msg}
          </div>
        ))}
      </div>
    );
  }

  // USER PORTAL
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Dzīvoklis {userApartment?.number}</h1>
        <p style={styles.subtitle}>{BUILDING_NAME}</p>
        <button onClick={handleLogout} style={{ position: 'absolute', top: '20px', right: '20px', ...styles.btn, background: '#ef4444' }}>
          Izrakstīties
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* RĒĶINU VĒSTURE */}
        <div style={styles.card}>
          <h2>📄 Rēķinu vēsture</h2>
          <div style={styles.list}>
            {userInvoices.length === 0 ? (
              <p style={{ color: '#999' }}>Nav rēķinu</p>
            ) : (
              userInvoices.map(inv => (
                <div key={inv.id} style={{ ...styles.listItem, flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>Rēķins {inv.invoice_number}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Periods: {inv.period}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: inv.paid ? '#10b981' : '#ef4444' }}>€{inv.amount.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{inv.paid ? '✓ Apmaksāts' : 'Neatmaksāts'}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SKAITĪTĀJA RĀDĪJUMI */}
        <div style={styles.card}>
          <h2>📊 Skaitītāja rādījumi</h2>
          <form onSubmit={saveMeterReading} style={styles.form}>
            <select
              value={meterForm.meter_type}
              onChange={(e) => setMeterForm({ ...meterForm, meter_type: e.target.value })}
              style={styles.input}
            >
              <option value="electricity">Elektrība (kWh)</option>
              <option value="gas">Gāze (m³)</option>
              <option value="water">Ūdens (m³)</option>
            </select>
            <input
              type="date"
              value={meterForm.reading_date}
              onChange={(e) => setMeterForm({ ...meterForm, reading_date: e.target.value })}
              style={styles.input}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Rādījums"
              value={meterForm.reading_value}
              onChange={(e) => setMeterForm({ ...meterForm, reading_value: e.target.value })}
              style={styles.input}
            />
            <button type="submit" style={styles.btn}>Saglabāt rādījumu</button>
          </form>

          <h3 style={{ marginTop: '20px' }}>Jaunākie rādījumi</h3>
          <div style={styles.list}>
            {meterReadings.length === 0 ? (
              <p style={{ color: '#999' }}>Nav rādījumu</p>
            ) : (
              meterReadings.slice(-10).reverse().map(mr => (
                <div key={mr.id} style={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{mr.meter_type === 'electricity' ? '⚡' : mr.meter_type === 'gas' ? '🔥' : '💧'} {mr.meter_type}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{mr.reading_date}</div>
                  </div>
                  <div style={{ fontWeight: 'bold' }}>{mr.reading_value}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {toasts.map(t => (
        <div key={t.id} style={{ position: 'fixed', top: '10px', right: '10px', ...styles.toast(t.type) }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
