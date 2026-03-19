import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUILDING_NAME = "BIEDRĪBA \"BARONA 78\"";
const BUILDING_ADDRESS = "Kr. Barona iela 78-14, Rīga, LV-1001";
const IBAN = "LV62HABA0551064112797";

const Toast = ({ message, type, onClose }) => (
  <div
    style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '15px 20px',
      background: type === 'error' ? '#fee2e2' : '#dcfce7',
      color: type === 'error' ? '#dc2626' : '#16a34a',
      borderRadius: '6px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease-out',
      fontSize: '14px',
      maxWidth: '400px',
      cursor: 'pointer'
    }}
    onClick={onClose}
  >
    {message}
  </div>
);

export default function PropertyManager() {
  // AUTH STATE
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [toast, setToast] = useState(null);

  // ADMIN STATE
  const [apartments, setApartments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // USER STATE
  const [userApartment, setUserApartment] = useState(null);
  const [userInvoices, setUserInvoices] = useState([]);
  const [meterReadings, setMeterReadings] = useState([]);
  const [meterForm, setMeterForm] = useState({
    meter_type: 'electricity',
    reading_value: '',
    reading_date: new Date().toISOString().split('T')[0]
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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

      if (data.password !== loginPassword) {
        showToast('Nepareizs email vai parole', 'error');
        return;
      }

      setCurrentUser(data);
      setIsAdmin(data.role === 'admin');
      setLoginEmail('');
      setLoginPassword('');
      
      if (data.role === 'admin') {
        fetchAdminData();
      } else {
        fetchUserData(data.apartment_id);
      }
      
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
    setActiveTab('overview');
    showToast('✓ Izrakstīts');
  };

  // ADMIN FUNCTIONS
  const fetchAdminData = async () => {
    try {
      const [aptRes, invRes, usersRes] = await Promise.all([
        supabase.from('apartments').select('*').order('number', { ascending: true }),
        supabase.from('invoices').select('*').order('period', { ascending: false }),
        supabase.from('users').select('*')
      ]);

      setApartments(aptRes.data || []);
      setInvoices(invRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      showToast('Kļūda ielādējot datus', 'error');
    }
  };

  // USER FUNCTIONS
  const fetchUserData = async (apartmentId) => {
    try {
      const [aptRes, invRes, mrRes] = await Promise.all([
        supabase.from('apartments').select('*').eq('id', apartmentId).single(),
        supabase.from('invoices').select('*').eq('apartment_id', apartmentId).order('period', { ascending: false }),
        supabase.from('meter_readings').select('*').eq('apartment_id', apartmentId).order('reading_date', { ascending: false })
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
    if (!currentUser || !userApartment || !meterForm.reading_value) return;

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

  const createUserForApartment = async (apartmentId) => {
    const apt = apartments.find(a => a.id === apartmentId);
    const email = prompt(`Email dzīvoklim ${apt.number}:`);
    if (!email) return;

    try {
      const password = Math.random().toString(36).slice(-8);
      const { error } = await supabase.from('users').insert([{
        apartment_id: apartmentId,
        email: email,
        password: password,
        role: 'user'
      }]);

      if (error) throw error;
      alert(`Lietotājs izveidots!\nEmail: ${email}\nParole: ${password}`);
      fetchAdminData();
      showToast('✓ Lietotājs izveidots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const downloadPDF = (invoice) => {
    const apt = apartments.find(a => a.id === invoice.apartment_id);
    const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
    const amountWithoutVat = invoice.amount_without_vat || 0;
    const vatAmount = invoice.vat_amount || 0;
    const amountWithVat = invoice.amount_with_vat || invoice.amount;

    const rowsWithoutVat = invoiceDetails.filter(d => d.vat_rate === 0 || d.vat_rate === undefined).map(detail => {
      if (detail.type === 'water') {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.consumption_m3} m³</td><td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      }
      return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${apt.area} m²</td><td style="text-align: right;">€${(detail.amount_without_vat / apt.area).toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
    }).join('');

    const rowsWithVat = invoiceDetails.filter(d => d.vat_rate > 0).map(detail => {
      if (detail.type === 'water') {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.consumption_m3} m³</td><td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      }
      return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${apt.area} m²</td><td style="text-align: right;">€${(detail.amount_without_vat / apt.area).toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
    }).join('');

    const vatByRate = {};
    invoiceDetails.filter(d => d.vat_rate > 0).forEach(detail => {
      const rate = detail.vat_rate;
      if (!vatByRate[rate]) vatByRate[rate] = 0;
      vatByRate[rate] += detail.vat_amount;
    });

    const vatRows = Object.entries(vatByRate).map(([rate, totalVat]) => 
      `<tr style="background: #f9fafb;"><td colspan="3" style="text-align: right; font-size: 11px;">PVN (${rate}%):</td><td style="text-align: right; font-size: 11px;">€${totalVat.toFixed(2)}</td></tr>`
    ).join('');

    const htmlContent = `<html><head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 40px; line-height: 1.6; }
      .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
      .title { font-size: 24px; font-weight: bold; }
      .company-info { text-align: right; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin: 30px 0; }
      th { text-align: left; padding: 10px; border-bottom: 2px solid #000; font-weight: bold; }
      td { padding: 12px 10px; }
      .amount-total { font-size: 32px; font-weight: bold; color: #003399; text-align: right; margin: 20px 0; }
      .payment-box { background: #003399; color: white; padding: 20px; margin: 30px 0; font-size: 12px; }
    </style></head><body>
      <div class="header">
        <div class="title">RĒĶINS</div>
        <div class="company-info"><div style="font-weight: bold; margin-bottom: 10px;">${BUILDING_NAME}</div>${BUILDING_ADDRESS}</div>
      </div>
      <p><strong>Nr:</strong> ${invoice.invoice_number} | <strong>Periods:</strong> ${invoice.period}</p>
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <div style="font-size: 16px; font-weight: bold;">Dzīvoklis Nr. ${apt.number} - ${apt.owner_name} ${apt.owner_surname || ''}</div>
        <div>Platība: ${apt.area} m² | Personas: ${apt.declared_persons || 1}</div>
      </div>
      <table>
        <tr><th>PAKALPOJUMS</th><th style="text-align: center;">DAUDZ.</th><th style="text-align: right;">CENA</th><th style="text-align: right;">SUMMA</th></tr>
        ${rowsWithoutVat}
      </table>
      ${rowsWithVat ? `<div style="margin-top: 20px; font-weight: bold; color: #003399; padding-bottom: 10px;">Pakalpojumi ar PVN</div>
      <table><tr><th>PAKALPOJUMS</th><th style="text-align: center;">DAUDZ.</th><th style="text-align: right;">CENA</th><th style="text-align: right;">SUMMA</th></tr>${rowsWithVat}${vatRows}</table>` : ''}
      <div style="text-align: right; margin: 20px 0; border-top: 2px solid #000; padding-top: 15px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;"><span>Summa bez PVN:</span><span>€${amountWithoutVat.toFixed(2)}</span></div>
        ${vatAmount > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px;"><span>PVN kopā:</span><span>€${vatAmount.toFixed(2)}</span></div>` : ''}
        <div style="font-size: 12px; margin-bottom: 15px;">KOPĀ APMAKSAI (EUR):</div>
        <div class="amount-total">€${amountWithVat.toFixed(2)}</div>
      </div>
      <div class="payment-box">
        <div style="font-weight: bold; margin-bottom: 15px;">MAKSĀJUMA INFORMĀCIJA</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div><div style="margin-bottom: 5px;">SAŅEMĒJA IBAN</div><div style="font-weight: bold;">${IBAN}</div></div>
          <div><div style="margin-bottom: 5px;">MAKSĀJUMA MĒRĶIS</div><div style="font-weight: bold;">Rēķins ${invoice.invoice_number}</div></div>
        </div>
        <div style="margin-top: 15px; font-size: 11px;">Maksājuma termiņš: ${new Date(invoice.due_date).toLocaleDateString('lv-LV')}</div>
      </div>
    </body></html>`;

    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const styles = {
    container: { maxWidth: '1400px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif', minHeight: '100vh', background: '#f8fafc' },
    card: { background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    header: { textAlign: 'center', marginBottom: '30px', background: '#003399', color: 'white', padding: '30px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: '28px', fontWeight: 'bold', margin: 0 },
    nav: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    navBtn: { padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', background: '#e5e7eb', color: '#333' },
    navBtnActive: { background: '#003399', color: 'white' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' },
    btn: { padding: '10px 20px', background: '#003399', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' },
    btnSmall: { padding: '6px 12px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    list: { display: 'flex', flexDirection: 'column', gap: '10px' },
    listItem: { padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' },
  };

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...styles.card, maxWidth: '400px', width: '100%' }}>
          <h1 style={{ textAlign: 'center', color: '#003399', marginBottom: '30px', fontSize: '28px' }}>🏢 {BUILDING_NAME}</h1>
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
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ADMIN PANEL
  if (isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔧 Admin Panelis</h1>
            <p style={{ margin: '5px 0 0 0', color: '#ddd', fontSize: '14px' }}>{BUILDING_NAME}</p>
          </div>
          <button onClick={handleLogout} style={{ ...styles.btn, background: '#ef4444' }}>Izrakstīties</button>
        </div>

        <nav style={styles.nav}>
          {['overview', 'apartments', 'users', 'tariffs', 'water', 'invoices'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.navBtn,
                ...(activeTab === tab ? styles.navBtnActive : {})
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
                <div style={{ fontSize: '12px', color: '#666' }}>Apmaksāti rēķini</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{invoices.filter(i => i.paid).length}</div>
              </div>
              <div style={{ padding: '15px', background: '#fee2e2', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Parāds</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>€{invoices.filter(i => !i.paid).reduce((sum, i) => sum + i.amount, 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

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

        {activeTab === 'apartments' && (
          <div style={styles.card}>
            <h2>🏠 Dzīvokļu saraksts ({apartments.length})</h2>
            <div style={styles.list}>
              {apartments.map(apt => (
                <div key={apt.id} style={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>Dzīv. {apt.number}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>📐 {apt.area} m² • 👤 {apt.declared_persons || 1} • {apt.owner_name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div style={styles.card}>
            <h2>📄 Rēķini ({invoices.length})</h2>
            <div style={styles.list}>
              {invoices.slice(0, 20).map(inv => {
                const apt = apartments.find(a => a.id === inv.apartment_id);
                return (
                  <div key={inv.id} style={styles.listItem}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{inv.invoice_number}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Dzīv. {apt?.number} • {inv.period}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold', color: inv.paid ? '#10b981' : '#ef4444' }}>€{inv.amount.toFixed(2)}</div>
                      <button onClick={() => downloadPDF(inv)} style={{ ...styles.btnSmall, fontSize: '14px' }}>📥</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'tariffs' && <div style={styles.card}><h2>💰 Tarifi</h2><p>Tarifesti...</p></div>}
        {activeTab === 'water' && <div style={styles.card}><h2>💧 Ūdens</h2><p>Ūdens vadība...</p></div>}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // USER PORTAL
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🏠 Dzīvoklis {userApartment?.number}</h1>
          <p style={{ margin: '5px 0 0 0', color: '#ddd', fontSize: '14px' }}>{userApartment?.owner_name}</p>
        </div>
        <button onClick={handleLogout} style={{ ...styles.btn, background: '#ef4444' }}>Izrakstīties</button>
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
                      <div style={{ fontSize: '12px', color: '#666' }}>{inv.period}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: inv.paid ? '#10b981' : '#ef4444' }}>€{inv.amount.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{inv.paid ? '✓ Apmaksāts' : 'Neatmaksāts'}</div>
                    </div>
                  </div>
                  <button onClick={() => downloadPDF(inv)} style={{ ...styles.btn, width: '100%', padding: '6px', fontSize: '12px' }}>📥 Lejupielādēt PDF</button>
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
              <option value="electricity">⚡ Elektrība (kWh)</option>
              <option value="gas">🔥 Gāze (m³)</option>
              <option value="water">💧 Ūdens (m³)</option>
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

          <h3 style={{ marginTop: '20px', fontSize: '16px' }}>Jaunākie rādījumi</h3>
          <div style={styles.list}>
            {meterReadings.length === 0 ? (
              <p style={{ color: '#999' }}>Nav rādījumu</p>
            ) : (
              meterReadings.slice(0, 10).map(mr => (
                <div key={mr.id} style={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {mr.meter_type === 'electricity' && '⚡ Elektrība'}
                      {mr.meter_type === 'gas' && '🔥 Gāze'}
                      {mr.meter_type === 'water' && '💧 Ūdens'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{mr.reading_date}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{mr.reading_value}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
