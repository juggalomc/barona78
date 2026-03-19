import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUILDING_NAME = "BIEDRĪBA \"BARONA 78\"";
const BUILDING_CODE = "40008325768";
const BUILDING_ADDRESS = "Kr. Barona iela 78-14, Rīga, LV-1001";
const TOTAL_AREA = 1959; // Kopējā mājas m²

export default function PropertyManager() {
  const [apartments, setApartments] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('apartments');
  
  // Apartments form
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

  // Tariffs form
  const [tariffForm, setTariffForm] = useState({
    name: '',
    total_amount: '',
    calculation_type: 'per_sqm' // per_sqm vai flat
  });

  const [invoiceMonth, setInvoiceMonth] = useState('');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aptRes, tarRes, invRes] = await Promise.all([
        supabase.from('apartments').select('*').order('number', { ascending: true }),
        supabase.from('tariffs').select('*').order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').order('created_at', { ascending: false })
      ]);

      setApartments(aptRes.data || []);
      setTariffs(tarRes.data || []);
      setInvoices(invRes.data || []);
    } catch (error) {
      alert('Kļūda ielādējot datus: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addApartment = async (e) => {
    e.preventDefault();
    if (!apartmentForm.number || !apartmentForm.area || !apartmentForm.owner_name) {
      alert('Lūdzu, aizpildiet obligātos laukus!');
      return;
    }

    try {
      const { error } = await supabase.from('apartments').insert([apartmentForm]);
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
      alert('✓ Dzīvoklis pievienots!');
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  };

  const addTariff = async (e) => {
    e.preventDefault();
    if (!tariffForm.name || !tariffForm.total_amount) {
      alert('Lūdzu, aizpildiet visus laukus!');
      return;
    }

    try {
      const { error } = await supabase.from('tariffs').insert([tariffForm]);
      if (error) throw error;
      
      setTariffForm({ name: '', total_amount: '', calculation_type: 'per_sqm' });
      fetchData();
      alert('✓ Tarifs pievienots!');
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  };

  const generateInvoices = async (e) => {
    e.preventDefault();
    if (!invoiceMonth || tariffs.length === 0) {
      alert('Lūdzu, izvēlieties mēnesi un pārliecinieties, ka ir tarifi!');
      return;
    }

    try {
      const invoicesToAdd = [];
      const [year, month] = invoiceMonth.split('-');

      for (const apt of apartments) {
        for (const tariff of tariffs) {
          // Aprēķins: (tarifa_summa / kopējā_m²) × dzīvokļa_m²
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
            due_date: dueDate
          });
        }
      }

      const { error } = await supabase.from('invoices').insert(invoicesToAdd);
      if (error) throw error;

      setInvoiceMonth('');
      fetchData();
      alert(`✓ Ģenerēti ${invoicesToAdd.length} rēķini!`);
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  };

  const deleteApartment = async (id) => {
    if (!window.confirm('Izdzēst dzīvokli?')) return;
    try {
      await supabase.from('invoices').delete().eq('apartment_id', id);
      await supabase.from('apartments').delete().eq('id', id);
      fetchData();
      alert('✓ Dzīvoklis izdzēsts!');
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  };

  const deleteTariff = async (id) => {
    if (!window.confirm('Izdzēst tarifu?')) return;
    try {
      await supabase.from('invoices').delete().eq('tariff_id', id);
      await supabase.from('tariffs').delete().eq('id', id);
      fetchData();
      alert('✓ Tarifs izdzēsts!');
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  };

  const generatePDF = async (invoiceId) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    const apt = apartments.find(a => a.id === invoice.apartment_id);
    const tariff = tariffs.find(t => t.id === invoice.tariff_id);

    const pdfContent = (
      <div style={{ padding: '40px', fontFamily: 'Arial', lineHeight: 1.6, width: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>RĒĶINS</h1>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>{BUILDING_NAME}</h2>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>{BUILDING_CODE}</p>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>{BUILDING_ADDRESS}</p>
          </div>
        </div>

        <div style={{ marginBottom: '20px', fontSize: '12px' }}>
          <p style={{ margin: '5px 0' }}><strong>Nr:</strong> {invoice.invoice_number}</p>
          <p style={{ margin: '5px 0' }}><strong>PERIODS:</strong> {invoiceMonth}</p>
          <p style={{ margin: '5px 0' }}><strong>IZRAKSTĪTS:</strong> {new Date().toLocaleDateString('lv-LV')}</p>
        </div>

        <div style={{ borderTop: '3px solid #000', borderBottom: '3px solid #000', padding: '20px 0', marginBottom: '30px' }} />

        <div style={{ marginBottom: '40px' }}>
          <p style={{ margin: '5px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>MAKSĀTĀJS</p>
          <h3 style={{ margin: '10px 0 5px 0', fontSize: '20px' }}>{apt.owner_name} {apt.owner_surname}</h3>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Personas kods: {apt.personal_code}</p>
        </div>

        <div style={{ 
          background: '#f5f5f5', 
          padding: '20px', 
          marginBottom: '30px',
          borderRadius: '8px'
        }}>
          <p style={{ margin: '5px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>ĪPAŠUMS</p>
          <h3 style={{ margin: '10px 0 5px 0', fontSize: '18px' }}>Dzīvoklis Nr. {apt.number}</h3>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>Aprēkina platība: {apt.area} m²</p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px' }}>PAKALPOJUMS</th>
              <th style={{ textAlign: 'center', padding: '10px', fontSize: '12px' }}>DAUDZ.</th>
              <th style={{ textAlign: 'right', padding: '10px', fontSize: '12px' }}>CENA</th>
              <th style={{ textAlign: 'right', padding: '10px', fontSize: '12px' }}>SUMMA</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <td style={{ padding: '15px 10px' }}>{tariff.name}</td>
              <td style={{ textAlign: 'center', padding: '15px 10px' }}>{apt.area} m²</td>
              <td style={{ textAlign: 'right', padding: '15px 10px' }}>€{(invoice.amount / apt.area).toFixed(4)}</td>
              <td style={{ textAlign: 'right', padding: '15px 10px', fontWeight: 'bold' }}>€{invoice.amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'right', marginBottom: '40px' }}>
          <p style={{ fontSize: '12px', margin: '5px 0' }}>KOPĀ APMAKSAI (EUR):</p>
          <h2 style={{ fontSize: '32px', margin: '10px 0', color: '#003399' }}>€{invoice.amount.toFixed(2)}</h2>
        </div>

        <div style={{ 
          background: '#003399', 
          color: 'white', 
          padding: '20px',
          borderRadius: '12px',
          fontSize: '12px',
          marginBottom: '30px'
        }}>
          <p style={{ margin: '5px 0', fontWeight: 'bold', textTransform: 'uppercase' }}>MAKSĀJUMA INFORMĀCIJA</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
            <div>
              <p style={{ margin: '5px 0' }}>SAŅEMĒJA IBAN</p>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>LV62HABA0551064112797</p>
            </div>
            <div>
              <p style={{ margin: '5px 0' }}>MAKSĀJUMA MĒRĶIS</p>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>Rēķins {invoice.invoice_number}</p>
            </div>
          </div>
          <p style={{ margin: '15px 0 0 0', fontSize: '11px' }}>
            Maksājuma termiņš: {new Date(invoice.due_date).toLocaleDateString('lv-LV')}
          </p>
        </div>
      </div>
    );

    const element = document.createElement('div');
    element.innerHTML = pdfContent.props.children;
    document.body.appendChild(element);

    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      pdf.save(`Rekins_${invoice.invoice_number}.pdf`);
      alert('✓ PDF lejupielādēts!');
    } catch (error) {
      alert('Kļūda ģenerējot PDF: ' + error.message);
    } finally {
      document.body.removeChild(element);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Sora', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🏢 BARONA 78 - Rēķinu vadības sistēma</h1>
        <p style={styles.subtitle}>Inteligenta apsaimniekošanas un tarifēšanas platforma</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        {['apartments', 'tariffs', 'invoices'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{...styles.tab, ...(activeTab === tab ? styles.tabActive : {})}}
          >
            {tab === 'apartments' && '🏠 Dzīvokļi'}
            {tab === 'tariffs' && '💰 Tarifi'}
            {tab === 'invoices' && '📄 Rēķini'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>Ielāde...</div>
        ) : activeTab === 'apartments' ? (
          <div style={styles.twoColumn}>
            {/* Add Apartment */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>➕ Pievienot dzīvokli</h2>
              <form onSubmit={addApartment} style={styles.form}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Dzīvokļa numurs *</label>
                    <input
                      type="text"
                      value={apartmentForm.number}
                      onChange={(e) => setApartmentForm({...apartmentForm, number: e.target.value})}
                      placeholder="14"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Platība (m²) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={apartmentForm.area}
                      onChange={(e) => setApartmentForm({...apartmentForm, area: e.target.value})}
                      placeholder="75"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Kadastra numurs</label>
                  <input
                    type="text"
                    value={apartmentForm.kadaster}
                    onChange={(e) => setApartmentForm({...apartmentForm, kadaster: e.target.value})}
                    placeholder="01001234567"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Vārds *</label>
                    <input
                      type="text"
                      value={apartmentForm.owner_name}
                      onChange={(e) => setApartmentForm({...apartmentForm, owner_name: e.target.value})}
                      placeholder="Jānis"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Uzvārds</label>
                    <input
                      type="text"
                      value={apartmentForm.owner_surname}
                      onChange={(e) => setApartmentForm({...apartmentForm, owner_surname: e.target.value})}
                      placeholder="Bērziņš"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Personas kods</label>
                    <input
                      type="text"
                      value={apartmentForm.personal_code}
                      onChange={(e) => setApartmentForm({...apartmentForm, personal_code: e.target.value})}
                      placeholder="123456-12345"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Kopīpašuma daļa (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={apartmentForm.share}
                      onChange={(e) => setApartmentForm({...apartmentForm, share: e.target.value})}
                      placeholder="3.83"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>E-pasts</label>
                    <input
                      type="email"
                      value={apartmentForm.email}
                      onChange={(e) => setApartmentForm({...apartmentForm, email: e.target.value})}
                      placeholder="janis@example.com"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Telefons</label>
                    <input
                      type="tel"
                      value={apartmentForm.phone}
                      onChange={(e) => setApartmentForm({...apartmentForm, phone: e.target.value})}
                      placeholder="+371 2X XXX XXX"
                      style={styles.input}
                    />
                  </div>
                </div>

                <button type="submit" style={styles.button}>Pievienot dzīvokli</button>
              </form>
            </div>

            {/* Apartments List */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📋 Dzīvokļu saraksts ({apartments.length})</h2>
              <div style={styles.list}>
                {apartments.length === 0 ? (
                  <div style={styles.empty}>Nav dzīvokļu</div>
                ) : (
                  apartments.map(apt => (
                    <div key={apt.id} style={styles.item}>
                      <div>
                        <strong style={styles.itemTitle}>Dzīv. {apt.number}</strong>
                        <div style={styles.itemMeta}>
                          📐 {apt.area} m² | {apt.owner_name} {apt.owner_surname}
                          {apt.personal_code && ` | ${apt.personal_code}`}
                        </div>
                        {apt.email && <div style={styles.itemMeta}>📧 {apt.email}</div>}
                      </div>
                      <button onClick={() => deleteApartment(apt.id)} style={styles.btnDelete}>🗑️</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'tariffs' ? (
          <div style={styles.twoColumn}>
            {/* Add Tariff */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>➕ Pievienot tarifu</h2>
              <form onSubmit={addTariff} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Pakalpojuma nosaukums *</label>
                  <input
                    type="text"
                    value={tariffForm.name}
                    onChange={(e) => setTariffForm({...tariffForm, name: e.target.value})}
                    placeholder="Apsaimniekošanas maksa"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Kopējā summa mājai (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tariffForm.total_amount}
                    onChange={(e) => setTariffForm({...tariffForm, total_amount: e.target.value})}
                    placeholder="1400"
                    style={styles.input}
                  />
                  <small style={{color: '#666', marginTop: '5px', display: 'block'}}>
                    Šī summa tiks dalīta ar {TOTAL_AREA} m² un reizināta ar katra dzīvokļa platību
                  </small>
                </div>

                <button type="submit" style={styles.button}>Pievienot tarifu</button>
              </form>
            </div>

            {/* Tariffs List */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📊 Tarifи ({tariffs.length})</h2>
              <div style={styles.list}>
                {tariffs.length === 0 ? (
                  <div style={styles.empty}>Nav tarifūu</div>
                ) : (
                  tariffs.map(tar => {
                    const pricePerSqm = parseFloat(tar.total_amount) / TOTAL_AREA;
                    return (
                      <div key={tar.id} style={styles.item}>
                        <div>
                          <strong style={styles.itemTitle}>{tar.name}</strong>
                          <div style={styles.itemMeta}>
                            💰 Kopējā summa: €{parseFloat(tar.total_amount).toFixed(2)}
                          </div>
                          <div style={styles.itemMeta}>
                            📐 Par m²: €{pricePerSqm.toFixed(4)}
                          </div>
                        </div>
                        <button onClick={() => deleteTariff(tar.id)} style={styles.btnDelete}>🗑️</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.singleColumn}>
            {/* Generate Invoices */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📄 Ģenerēt rēķinus</h2>
              <form onSubmit={generateInvoices} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Mēnesis *</label>
                  <input
                    type="month"
                    value={invoiceMonth}
                    onChange={(e) => setInvoiceMonth(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <button type="submit" style={styles.button}>Ģenerēt rēķinus</button>
              </form>
            </div>

            {/* Invoices List */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📋 Rēķini ({invoices.length})</h2>
              <div style={styles.invoicesList}>
                {invoices.length === 0 ? (
                  <div style={styles.empty}>Nav rēķinu</div>
                ) : (
                  invoices.map(invoice => {
                    const apt = apartments.find(a => a.id === invoice.apartment_id);
                    const tar = tariffs.find(t => t.id === invoice.tariff_id);
                    return (
                      <div key={invoice.id} style={styles.invoiceItem}>
                        <div>
                          <div style={styles.invoiceHeader}>
                            Rēķins {invoice.invoice_number}
                          </div>
                          <div style={styles.invoiceMeta}>
                            Dzīv. {apt?.number} - {tar?.name} | €{invoice.amount.toFixed(2)}
                          </div>
                          <div style={styles.invoiceMeta}>
                            Period: {invoice.period} | Termiņš: {new Date(invoice.due_date).toLocaleDateString('lv-LV')}
                          </div>
                        </div>
                        <button
                          onClick={() => generatePDF(invoice.id)}
                          style={{...styles.button, padding: '8px 15px', fontSize: '0.9em', marginRight: '10px'}}
                        >
                          📥 PDF
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: "'Sora', sans-serif",
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '2.2em',
    color: '#667eea',
    marginBottom: '8px',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '1em',
    color: '#666',
  },
  tabsContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    maxWidth: '800px',
  },
  tab: {
    flex: 1,
    padding: '12px 20px',
    background: 'rgba(255, 255, 255, 0.6)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 600,
    transition: 'all 0.3s ease',
    color: '#666',
  },
  tabActive: {
    background: 'white',
    color: '#667eea',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
    marginBottom: '40px',
  },
  singleColumn: {
    marginBottom: '40px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  cardTitle: {
    fontSize: '1.4em',
    fontWeight: 700,
    color: '#333',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f0f0f0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 600,
    color: '#333',
    fontSize: '0.95em',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '1em',
    fontFamily: 'inherit',
  },
  button: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '1em',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '10px',
  },
  btnDelete: {
    background: 'none',
    border: 'none',
    fontSize: '1.2em',
    cursor: 'pointer',
    padding: '5px 10px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  itemTitle: {
    display: 'block',
    fontSize: '1em',
    color: '#333',
    marginBottom: '5px',
  },
  itemMeta: {
    fontSize: '0.9em',
    color: '#666',
    marginBottom: '3px',
  },
  invoicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  invoiceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  invoiceHeader: {
    fontWeight: 600,
    color: '#333',
    marginBottom: '5px',
  },
  invoiceMeta: {
    fontSize: '0.9em',
    color: '#666',
    marginBottom: '3px',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '30px',
    fontStyle: 'italic',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '1.2em',
    color: 'white',
  },
};
