/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUILDING_NAME = "BIEDRĪBA \"BARONA 78\"";
const BUILDING_CODE = "40008325768";
const BUILDING_ADDRESS = "Kr. Barona iela 78-14, Rīga, LV-1001";
const TOTAL_AREA = 1959;

// Toast Component
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6'
  }[type];

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: bgColor,
      color: 'white',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      animation: 'slideIn 0.3s ease-out',
      fontWeight: 500
    }}>
      {message}
    </div>
  );
}

export default function PropertyManager() {
  const [apartments, setApartments] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);
  
  const [apartmentForm, setApartmentForm] = useState({
    number: '',
    area: '',
    kadaster: '',
    owner_name: '',
    owner_surname: '',
    personal_code: '',
    phone: '',
    email: '',
    share: ''
  });

  const [tariffForm, setTariffForm] = useState({
    name: '',
    total_amount: ''
  });

  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [expandedMonth, setExpandedMonth] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aptRes, tarRes, invRes] = await Promise.all([
        supabase.from('apartments').select('*').order('number', { ascending: true }),
        supabase.from('tariffs').select('*').order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').order('period', { ascending: false })
      ]);

      setApartments(aptRes.data || []);
      setTariffs(tarRes.data || []);
      setInvoices(invRes.data || []);
    } catch (error) {
      showToast('Kļūda ielādējot datus', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const addApartment = async (e) => {
    e.preventDefault();
    if (!apartmentForm.number || !apartmentForm.area || !apartmentForm.owner_name) {
      showToast('Aizpildiet obligātos laukus', 'error');
      return;
    }

    try {
      const dataToInsert = {
        number: apartmentForm.number.trim(),
        area: parseFloat(apartmentForm.area),
        kadaster: apartmentForm.kadaster || null,
        owner_name: apartmentForm.owner_name.trim(),
        owner_surname: apartmentForm.owner_surname || null,
        personal_code: apartmentForm.personal_code || null,
        phone: apartmentForm.phone || null,
        email: apartmentForm.email || null,
        share: apartmentForm.share ? parseFloat(apartmentForm.share) : null
      };

      const { error } = await supabase.from('apartments').insert([dataToInsert]);
      if (error) throw error;
      
      setApartmentForm({
        number: '',
        area: '',
        kadaster: '',
        owner_name: '',
        owner_surname: '',
        personal_code: '',
        phone: '',
        email: '',
        share: ''
      });
      fetchData();
      showToast('✓ Dzīvoklis pievienots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const addTariff = async (e) => {
    e.preventDefault();
    if (!tariffForm.name || !tariffForm.total_amount) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const dataToInsert = {
        name: tariffForm.name.trim(),
        total_amount: parseFloat(tariffForm.total_amount)
      };

      const { error } = await supabase.from('tariffs').insert([dataToInsert]);
      if (error) throw error;
      
      setTariffForm({ name: '', total_amount: '' });
      fetchData();
      showToast('✓ Tarifs pievienots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const generateInvoices = async (e) => {
    e.preventDefault();
    if (!invoiceMonth || tariffs.length === 0) {
      showToast('Izvēlieties mēnesi un pārliecinieties, ka ir tarifi', 'error');
      return;
    }

    try {
      const invoicesToAdd = [];
      const [year, month] = invoiceMonth.split('-');

      for (const apt of apartments) {
        for (const tariff of tariffs) {
          const pricePerSqm = parseFloat(tariff.total_amount) / TOTAL_AREA;
          const amount = Math.round(pricePerSqm * parseFloat(apt.area) * 100) / 100;
          const invoiceNumber = `${year}/${month}-${apt.number}`;
          const dueDate = new Date(year, month, 15).toISOString().split('T')[0];

          invoicesToAdd.push({
            apartment_id: apt.id,
            tariff_id: tariff.id,
            invoice_number: invoiceNumber,
            period: invoiceMonth,
            amount: amount,
            due_date: dueDate,
            paid: false
          });
        }
      }

      const { error } = await supabase.from('invoices').insert(invoicesToAdd);
      if (error) throw error;

      setInvoiceMonth('');
      fetchData();
      showToast(`✓ Ģenerēti ${invoicesToAdd.length} rēķini`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const toggleInvoicePaid = async (invoiceId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ paid: !currentStatus })
        .eq('id', invoiceId);
      
      if (error) throw error;
      fetchData();
      showToast(!currentStatus ? '✓ Apmaksāts' : '✓ Neapmaksāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteApartment = async (id) => {
    if (!window.confirm('Izdzēst dzīvokli?')) return;
    try {
      await supabase.from('invoices').delete().eq('apartment_id', id);
      await supabase.from('apartments').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteTariff = async (id) => {
    if (!window.confirm('Izdzēst tarifu?')) return;
    try {
      await supabase.from('invoices').delete().eq('tariff_id', id);
      await supabase.from('tariffs').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm('Izdzēst rēķinu?')) return;
    try {
      await supabase.from('invoices').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const downloadPDF = (invoice) => {
    const apt = apartments.find(a => a.id === invoice.apartment_id);
    const tariff = tariffs.find(t => t.id === invoice.tariff_id);

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 40px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .logo { font-size: 36px; font-weight: bold; }
            .company-info { text-align: right; font-size: 12px; }
            .title { font-size: 24px; font-weight: bold; }
            .info-section { margin-bottom: 20px; }
            .info-title { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
            .info-value { font-size: 14px; }
            .divider { border-top: 3px solid #000; margin: 30px 0; }
            .payment-info-box { background: #003399; color: white; padding: 20px; margin: 30px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th { text-align: left; padding: 10px; border-bottom: 2px solid #000; font-size: 12px; font-weight: bold; }
            td { padding: 15px 10px; border-bottom: 2px solid #000; }
            .amount-total { font-size: 32px; font-weight: bold; color: #003399; text-align: right; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">RĒĶINS</div>
            <div class="company-info">
              <div style="font-weight: bold; margin-bottom: 10px;">${BUILDING_NAME}</div>
              <div>${BUILDING_CODE}</div>
              <div style="font-size: 11px; margin-top: 5px;">${BUILDING_ADDRESS}</div>
            </div>
          </div>

          <div style="font-size: 12px;">
            <p><strong>Nr:</strong> ${invoice.invoice_number}</p>
            <p><strong>PERIODS:</strong> ${invoice.period}</p>
            <p><strong>IZRAKSTĪTS:</strong> ${new Date().toLocaleDateString('lv-LV')}</p>
          </div>

          <div class="divider"></div>

          <div class="info-section">
            <div class="info-title">Maksātājs</div>
            <div class="info-value" style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">
              ${apt.owner_name} ${apt.owner_surname || ''}
            </div>
            <div class="info-value" style="font-size: 12px;">Personas kods: ${apt.personal_code || '-'}</div>
          </div>

          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <div class="info-title">Īpašums</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Dzīvoklis Nr. ${apt.number}</div>
            <div style="font-size: 14px;">Aprēķina platība: ${apt.area} m²</div>
          </div>

          <table>
            <tr>
              <th>PAKALPOJUMS</th>
              <th style="text-align: center;">DAUDZ.</th>
              <th style="text-align: right;">CENA</th>
              <th style="text-align: right;">SUMMA</th>
            </tr>
            <tr>
              <td>${tariff.name}</td>
              <td style="text-align: center;">${apt.area} m²</td>
              <td style="text-align: right;">€${(invoice.amount / apt.area).toFixed(4)}</td>
              <td style="text-align: right; font-weight: bold;">€${invoice.amount.toFixed(2)}</td>
            </tr>
          </table>

          <div style="text-align: right;">
            <div style="font-size: 12px; margin-bottom: 10px;">KOPĀ APMAKSAI (EUR):</div>
            <div class="amount-total">€${invoice.amount.toFixed(2)}</div>
          </div>

          <div class="payment-info-box">
            <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 15px;">Maksājuma informācija</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div style="margin-bottom: 5px;">SAŅEMĒJA IBAN</div>
                <div style="font-weight: bold;">LV62HABA0551064112797</div>
              </div>
              <div>
                <div style="margin-bottom: 5px;">MAKSĀJUMA MĒRĶIS</div>
                <div style="font-weight: bold;">Rēķins ${invoice.invoice_number}</div>
              </div>
            </div>
            <div style="margin-top: 15px; font-size: 11px;">
              Maksājuma termiņš: ${new Date(invoice.due_date).toLocaleDateString('lv-LV')}
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Grupēt rēķinus pa mēnešiem
  const groupedInvoices = {};
  invoices.forEach(inv => {
    if (!groupedInvoices[inv.period]) {
      groupedInvoices[inv.period] = [];
    }
    groupedInvoices[inv.period].push(inv);
  });

  const sortedMonths = Object.keys(groupedInvoices).sort().reverse();

  // Aprēķināt parādu
  const totalDebt = invoices
    .filter(inv => !inv.paid)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={styles.sidebar}>
        <div style={styles.logo}>🏢 BARONA 78</div>
        <nav style={styles.nav}>
          {[
            { id: 'overview', label: '📊 Pārskats' },
            { id: 'apartments', label: '🏠 Dzīvokļi' },
            { id: 'tariffs', label: '💰 Tarifi' },
            { id: 'invoices', label: '📄 Rēķini' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? {...styles.navBtn, ...styles.navBtnActive} : styles.navBtn}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>Rēķinu Vadības Sistēma</h1>
            <p style={styles.subtitle}>Inteligenta mājas apsaimniekošana</p>
          </div>
        </header>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>⏳ Ielāde...</div>
          ) : activeTab === 'overview' ? (
            <div>
              <div style={styles.statsGrid}>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{apartments.length}</div>
                  <div style={styles.statLabel}>Dzīvokļi</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{tariffs.length}</div>
                  <div style={styles.statLabel}>Tarifi</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{invoices.length}</div>
                  <div style={styles.statLabel}>Rēķini</div>
                </div>
                <div style={{...styles.stat, background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'}}>
                  <div style={styles.statValue}>€{totalDebt.toFixed(2)}</div>
                  <div style={styles.statLabel}>Parāds</div>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💳 Kopsavilkums</h2>
                <div style={styles.summaryGrid}>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Kopā apmaksāt</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#0066cc'}}>€{totalAmount.toFixed(2)}</div>
                  </div>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Apmaksāts</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#10b981'}}>
                      €{(totalAmount - totalDebt).toFixed(2)}
                    </div>
                  </div>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Parāds</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#ff6b6b'}}>€{totalDebt.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'apartments' ? (
            <div style={styles.twoCol}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>➕ Pievienot dzīvokli</h2>
                <form onSubmit={addApartment} style={styles.form}>
                  <div style={styles.formRow}>
                    <input
                      type="text"
                      placeholder="Numurs *"
                      value={apartmentForm.number}
                      onChange={(e) => setApartmentForm({...apartmentForm, number: e.target.value})}
                      style={styles.input}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Platība (m²) *"
                      value={apartmentForm.area}
                      onChange={(e) => setApartmentForm({...apartmentForm, area: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Vārds *"
                    value={apartmentForm.owner_name}
                    onChange={(e) => setApartmentForm({...apartmentForm, owner_name: e.target.value})}
                    style={styles.input}
                  />
                  <div style={styles.formRow}>
                    <input
                      type="text"
                      placeholder="Uzvārds"
                      value={apartmentForm.owner_surname}
                      onChange={(e) => setApartmentForm({...apartmentForm, owner_surname: e.target.value})}
                      style={styles.input}
                    />
                    <input
                      type="text"
                      placeholder="Personas kods"
                      value={apartmentForm.personal_code}
                      onChange={(e) => setApartmentForm({...apartmentForm, personal_code: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formRow}>
                    <input
                      type="email"
                      placeholder="E-pasts"
                      value={apartmentForm.email}
                      onChange={(e) => setApartmentForm({...apartmentForm, email: e.target.value})}
                      style={styles.input}
                    />
                    <input
                      type="tel"
                      placeholder="Telefons"
                      value={apartmentForm.phone}
                      onChange={(e) => setApartmentForm({...apartmentForm, phone: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <button type="submit" style={styles.btn}>Pievienot</button>
                </form>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>📋 Dzīvokļi ({apartments.length})</h2>
                <div style={styles.list}>
                  {apartments.map(apt => (
                    <div key={apt.id} style={styles.listItem}>
                      <div>
                        <div style={{fontWeight: 'bold'}}>Dzīv. {apt.number}</div>
                        <div style={{fontSize: '13px', color: '#666'}}>📐 {apt.area} m² • {apt.owner_name}</div>
                      </div>
                      <button onClick={() => deleteApartment(apt.id)} style={styles.btnSmall}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'tariffs' ? (
            <div style={styles.twoCol}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>➕ Pievienot tarifu</h2>
                <form onSubmit={addTariff} style={styles.form}>
                  <input
                    type="text"
                    placeholder="Nosaukums *"
                    value={tariffForm.name}
                    onChange={(e) => setTariffForm({...tariffForm, name: e.target.value})}
                    style={styles.input}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Summa mājai (€) *"
                    value={tariffForm.total_amount}
                    onChange={(e) => setTariffForm({...tariffForm, total_amount: e.target.value})}
                    style={styles.input}
                  />
                  <small style={{color: '#666', display: 'block', marginBottom: '15px'}}>
                    Summa tiks dalīta ar {TOTAL_AREA} m² un reizināta ar dzīvokļa platību
                  </small>
                  <button type="submit" style={styles.btn}>Pievienot</button>
                </form>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💰 Tarifi ({tariffs.length})</h2>
                <div style={styles.list}>
                  {tariffs.map(tar => {
                    const pricePerSqm = parseFloat(tar.total_amount) / TOTAL_AREA;
                    return (
                      <div key={tar.id} style={styles.listItem}>
                        <div>
                          <div style={{fontWeight: 'bold'}}>{tar.name}</div>
                          <div style={{fontSize: '13px', color: '#666'}}>€{parseFloat(tar.total_amount).toFixed(2)} • €{pricePerSqm.toFixed(4)}/m²</div>
                        </div>
                        <button onClick={() => deleteTariff(tar.id)} style={styles.btnSmall}>🗑️</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>📄 Ģenerēt rēķinus</h2>
                <form onSubmit={generateInvoices} style={{display: 'flex', gap: '10px'}}>
                  <input
                    type="month"
                    value={invoiceMonth}
                    onChange={(e) => setInvoiceMonth(e.target.value)}
                    style={{...styles.input, flex: 1}}
                  />
                  <button type="submit" style={styles.btn}>Ģenerēt</button>
                </form>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💳 Rēķini ({invoices.length})</h2>
                
                {sortedMonths.length === 0 ? (
                  <div style={{textAlign: 'center', color: '#999', padding: '40px'}}>Nav rēķinu</div>
                ) : (
                  <div>
                    {sortedMonths.map(month => {
                      const monthInvoices = groupedInvoices[month];
                      const monthTotal = monthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                      const monthUnpaid = monthInvoices.filter(i => !i.paid).reduce((sum, inv) => sum + inv.amount, 0);
                      const isExpanded = expandedMonth === month;

                      return (
                        <div key={month} style={{marginBottom: '15px'}}>
                          <div
                            onClick={() => setExpandedMonth(isExpanded ? null : month)}
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '15px',
                              background: '#f8fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <div>
                              <div style={{fontWeight: 'bold', fontSize: '14px'}}>
                                📅 {new Date(month + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                              </div>
                              <div style={{fontSize: '12px', color: '#666'}}>
                                €{monthTotal.toFixed(2)} • Parāds: €{monthUnpaid.toFixed(2)}
                              </div>
                            </div>
                            <div style={{fontSize: '18px'}}>{isExpanded ? '▼' : '▶'}</div>
                          </div>

                          {isExpanded && (
                            <div style={{marginTop: '10px'}}>
                              {monthInvoices.map(invoice => {
                                const apt = apartments.find(a => a.id === invoice.apartment_id);
                                const tariff = tariffs.find(t => t.id === invoice.tariff_id);
                                return (
                                  <div key={invoice.id} style={styles.invoiceCard}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: 1}}>
                                      <input
                                        type="checkbox"
                                        checked={invoice.paid || false}
                                        onChange={() => toggleInvoicePaid(invoice.id, invoice.paid)}
                                        style={{width: '18px', height: '18px', cursor: 'pointer'}}
                                      />
                                      <div style={{flex: 1}}>
                                        <div style={{fontWeight: '600', fontSize: '13px'}}>
                                          Dzīv. {apt?.number} • {tariff?.name}
                                        </div>
                                        <div style={{fontSize: '12px', color: '#666'}}>
                                          {invoice.invoice_number} • Termiņš: {new Date(invoice.due_date).toLocaleDateString('lv-LV')}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{
                                      fontWeight: 'bold',
                                      color: invoice.paid ? '#10b981' : '#ef4444',
                                      minWidth: '80px',
                                      textAlign: 'right',
                                      marginRight: '10px'
                                    }}>
                                      €{invoice.amount.toFixed(2)}
                                    </div>
                                    <button
                                      onClick={() => downloadPDF(invoice)}
                                      style={{...styles.btnSmall, padding: '6px 12px'}}
                                      title="Lejupielādēt PDF"
                                    >
                                      📥
                                    </button>
                                    <button
                                      onClick={() => deleteInvoice(invoice.id)}
                                      style={{...styles.btnSmall, padding: '6px 12px'}}
                                      title="Dzēst"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  },
  sidebar: {
    width: '250px',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    color: 'white',
    padding: '30px 20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    position: 'fixed',
    height: '100vh',
    left: 0,
    top: 0,
    overflowY: 'auto'
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '40px',
    textAlign: 'center',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  navBtn: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none',
    padding: '12px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    textAlign: 'left'
  },
  navBtnActive: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    borderLeft: '3px solid #3b82f6'
  },
  main: {
    marginLeft: '250px',
    flex: 1,
    padding: '40px'
  },
  header: {
    marginBottom: '40px'
  },
  h1: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#0f172a',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  content: {},
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  stat: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    color: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '12px',
    opacity: 0.9
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#0f172a'
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  input: {
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border 0.2s'
  },
  btn: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'transform 0.2s'
  },
  btnSmall: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 15px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px'
  },
  invoiceCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 15px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '8px',
    gap: '10px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px'
  },
  summaryItem: {
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '8px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#64748b'
  }
};
