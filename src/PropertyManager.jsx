import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase konfigurācija (aizstāj ar saviem atslēgiem)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function PropertyManager() {
  // State
  const [residents, setResidents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('residents');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    apartment: '',
    phone: ''
  });
  const [invoiceForm, setInvoiceForm] = useState({
    serviceType: '',
    amount: '',
    period: '',
    dueDate: ''
  });
  const [selectedResident, setSelectedResident] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch residents
  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResidents(data || []);
      
      // Fetch invoices
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      setInvoices(invoiceData || []);
    } catch (error) {
      alert('Kļūda ielādējot datus: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addResident = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.apartment) {
      alert('Lūdzu, aizpildiet visus laukus!');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('residents')
        .insert([{
          name: formData.name,
          email: formData.email,
          apartment: formData.apartment,
          phone: formData.phone
        }])
        .select();

      if (error) throw error;
      
      setFormData({ name: '', email: '', apartment: '', phone: '' });
      fetchResidents();
      alert('✓ Iedzīvotājs veiksmīgi pievienots!');
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  };

  const deleteResident = async (id) => {
    if (!window.confirm('Vai tiešām vēlaties izdzēst šo iedzīvotāju?')) return;

    try {
      // Vispirms izdzēsim viņa rēķinus
      await supabase
        .from('invoices')
        .delete()
        .eq('resident_id', id);

      // Tad izdzēsim iedzīvotāju
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchResidents();
      alert('✓ Iedzīvotājs izdzēsts!');
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  };

  const generateInvoices = async (e) => {
    e.preventDefault();
    if (!selectedResident || !invoiceForm.serviceType || !invoiceForm.amount || !invoiceForm.period || !invoiceForm.dueDate) {
      alert('Lūdzu, aizpildiet visus laukus!');
      return;
    }

    try {
      const invoicesToAdd = selectedResident === 'all' 
        ? residents.map(r => ({
            resident_id: r.id,
            service_type: invoiceForm.serviceType,
            amount: parseFloat(invoiceForm.amount),
            period: invoiceForm.period,
            due_date: invoiceForm.dueDate
          }))
        : [{
            resident_id: selectedResident,
            service_type: invoiceForm.serviceType,
            amount: parseFloat(invoiceForm.amount),
            period: invoiceForm.period,
            due_date: invoiceForm.dueDate
          }];

      const { error } = await supabase
        .from('invoices')
        .insert(invoicesToAdd);

      if (error) throw error;

      setInvoiceForm({ serviceType: '', amount: '', period: '', dueDate: '' });
      setSelectedResident(null);
      fetchResidents();
      alert('✓ Rēķini veiksmīgi ģenerēti!');
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm('Vai tiešām vēlaties izdzēst šo rēķinu?')) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchResidents();
      alert('✓ Rēķins izdzēsts!');
    } catch (error) {
      alert('Kļūda: ' + error.message);
    }
  };

  const filteredResidents = residents.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.apartment.includes(searchTerm)
  );

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Playfair+Display:wght@700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Sora', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🏢 Mājas Apsaimniekošana</h1>
          <p style={styles.subtitle}>Rēķinu vadības sistēma ar Supabase</p>
        </div>
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>{residents.length}</div>
            <div style={styles.statLabel}>Iedzīvotāji</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>{invoices.length}</div>
            <div style={styles.statLabel}>Rēķini</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>€{totalAmount.toFixed(2)}</div>
            <div style={styles.statLabel}>Kopā</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button
          style={{...styles.tab, ...(activeTab === 'residents' ? styles.tabActive : {})}}
          onClick={() => setActiveTab('residents')}
        >
          👥 Iedzīvotāji
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'invoices' ? styles.tabActive : {})}}
          onClick={() => setActiveTab('invoices')}
        >
          💰 Rēķini
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>Ielāde...</div>
        ) : activeTab === 'residents' ? (
          <div style={styles.twoColumn}>
            {/* Add Resident Form */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>➕ Pievienot iedzīvotāju</h2>
              <form onSubmit={addResident} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Vārds *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Jānis Bērziņš"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>E-pasts *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="janis@example.com"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Dzīvokļa numurs *</label>
                  <input
                    type="text"
                    value={formData.apartment}
                    onChange={(e) => setFormData({...formData, apartment: e.target.value})}
                    placeholder="12"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Telefons</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+371 2X XXX XXX"
                    style={styles.input}
                  />
                </div>
                <button type="submit" style={styles.button}>Pievienot</button>
              </form>
            </div>

            {/* Residents List */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📋 Iedzīvotāju saraksts</h2>
              <input
                type="text"
                placeholder="Meklēt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{...styles.input, marginBottom: '15px'}}
              />
              <div style={styles.residentsList}>
                {filteredResidents.length === 0 ? (
                  <div style={styles.empty}>Nav iedzīvotāju</div>
                ) : (
                  filteredResidents.map(resident => (
                    <div key={resident.id} style={styles.residentItem}>
                      <div>
                        <strong style={styles.residentName}>{resident.name}</strong>
                        <div style={styles.residentMeta}>
                          📍 Dzīv. {resident.apartment} • {resident.email}
                          {resident.phone && ` • ☎️ ${resident.phone}`}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteResident(resident.id)}
                        style={styles.btnDelete}
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.twoColumn}>
            {/* Generate Invoice Form */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📄 Ģenerēt rēķinu</h2>
              <form onSubmit={generateInvoices} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Iedzīvotājs *</label>
                  <select
                    value={selectedResident || ''}
                    onChange={(e) => setSelectedResident(e.target.value || null)}
                    style={styles.input}
                  >
                    <option value="">-- Izvēlieties --</option>
                    <option value="all">📢 Visi iedzīvotāji</option>
                    {residents.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Dzīv. {r.apartment})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Pakalpojums *</label>
                  <select
                    value={invoiceForm.serviceType}
                    onChange={(e) => setInvoiceForm({...invoiceForm, serviceType: e.target.value})}
                    style={styles.input}
                  >
                    <option value="">-- Izvēlieties --</option>
                    <option value="Ūdens">💧 Ūdens</option>
                    <option value="Siltums">🔥 Siltums</option>
                    <option value="Elektrība">⚡ Elektrība</option>
                    <option value="Gāze">🌬️ Gāze</option>
                    <option value="Kanalizācija">🚰 Kanalizācija</option>
                    <option value="Ņemējsistēma">📡 Ņemējsistēma</option>
                    <option value="Apkope">🧹 Apkope</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Summa (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({...invoiceForm, amount: e.target.value})}
                    placeholder="0.00"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Periods *</label>
                  <input
                    type="month"
                    value={invoiceForm.period}
                    onChange={(e) => setInvoiceForm({...invoiceForm, period: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Maksājuma termiņš *</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <button type="submit" style={styles.button}>Ģenerēt rēķinus</button>
              </form>
            </div>

            {/* Invoices List */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📋 Rēķinu saraksts</h2>
              <div style={styles.invoicesList}>
                {invoices.length === 0 ? (
                  <div style={styles.empty}>Nav rēķinu</div>
                ) : (
                  invoices.map(invoice => {
                    const resident = residents.find(r => r.id === invoice.resident_id);
                    return (
                      <div key={invoice.id} style={styles.invoiceItem}>
                        <div>
                          <div style={styles.invoiceHeader}>
                            {resident?.name} (Dzīv. {resident?.apartment})
                          </div>
                          <div style={styles.invoiceMeta}>
                            {invoice.service_type} • €{invoice.amount.toFixed(2)} • {new Date(invoice.period + '-01').toLocaleDateString('lv-LV', { month: 'long', year: 'numeric' })}
                          </div>
                          <div style={styles.invoiceDue}>
                            ⏰ Termiņš: {new Date(invoice.due_date).toLocaleDateString('lv-LV')}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteInvoice(invoice.id)}
                          style={styles.btnDelete}
                        >
                          🗑️
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
    backdropFilter: 'blur(10px)',
  },
  headerContent: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '2.5em',
    color: '#667eea',
    marginBottom: '8px',
    fontWeight: 700,
    fontFamily: "'Playfair Display', serif",
  },
  subtitle: {
    fontSize: '1.1em',
    color: '#666',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginTop: '20px',
  },
  statItem: {
    textAlign: 'center',
    padding: '15px',
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(102, 126, 234, 0.2)',
  },
  statNumber: {
    fontSize: '1.8em',
    fontWeight: 700,
    color: '#667eea',
  },
  statLabel: {
    fontSize: '0.9em',
    color: '#666',
    marginTop: '5px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    maxWidth: '600px',
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
    transition: 'all 0.3s ease',
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
    transition: 'all 0.3s ease',
    marginTop: '10px',
  },
  btnDelete: {
    background: 'none',
    border: 'none',
    fontSize: '1.2em',
    cursor: 'pointer',
    padding: '5px 10px',
  },
  residentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  residentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  residentName: {
    display: 'block',
    fontSize: '1em',
    color: '#333',
    marginBottom: '5px',
  },
  residentMeta: {
    fontSize: '0.9em',
    color: '#666',
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
    marginBottom: '5px',
  },
  invoiceDue: {
    fontSize: '0.85em',
    color: '#999',
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
