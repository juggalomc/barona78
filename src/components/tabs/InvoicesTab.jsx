import React from 'react';

// Lokāli definēti stili profesionālam UI
const styles = {
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    marginBottom: '24px',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '20,px',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    outline: 'none',
    boxSizing: 'border-box'
  },
  btn: {
    padding: '12px 20px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background 0.2s',
    fontSize: '14px'
  },
  btnSmall: {
    padding: '6px 12px',
    fontSize: '12px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#fff'
  }
};

export function InvoicesTab({
  invoices,
  apartments,
  tariffs,
  uniqueTariffPeriods,
  invoiceMonth, setInvoiceMonth,
  invoiceFromDate, setInvoiceFromDate,
  invoiceToDate, setInvoiceToDate,
  debtNoteForm, setDebtNoteForm,
  generateInvoices,
  toggleInvoicePaid,
  deleteInvoice,
  downloadPDF,
  exportInvoicesToCSV,
  getInvoiceStatus,
  showToast,
  generateInvoiceForApartment,
  updateOverpayment,
  deleteOverpayment,
  downloadMonthAsZip
}) {
  const [selectedApartmentForGen, setSelectedApartmentForGen] = React.useState('');
  const [editingOverpaymentId, setEditingOverpaymentId] = React.useState(null);
  const [editingOverpaymentAmount, setEditingOverpaymentAmount] = React.useState('');
  const [filterMonth, setFilterMonth] = React.useState('');
  const [filterApartment, setFilterApartment] = React.useState('');

  // Aprēķinām unikālos mēnešus no esošajiem rēķiniem filtrēšanai
  const sortedMonths = [...new Set(invoices.map(i => i.period))].sort().reverse();

  // Filtrēšanas loģika sarakstam
  const filteredInvoices = invoices.filter(inv => {
    if (filterMonth && inv.period !== filterMonth) return false;
    if (filterApartment) {
      const apt = apartments.find(a => a.id === inv.apartment_id);
      if (!apt || !apt.number.toString().includes(filterApartment)) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Rēķinu ģenerēšanas bloks */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>⚙️ Rēķinu ģenerēšana</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <select style={styles.input} value={invoiceMonth} onChange={e => setInvoiceMonth(e.target.value)}>
              <option value="">Izvēlieties mēnesi...</option>
              {uniqueTariffPeriods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>No datuma:</label>
                <input type="date" style={styles.input} value={invoiceFromDate} onChange={e => setInvoiceFromDate(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Līdz datumam:</label>
                <input type="date" style={styles.input} value={invoiceToDate} onChange={e => setInvoiceToDate(e.target.value)} />
              </div>
            </div>
            <button 
              style={styles.btn} 
              onClick={(e) => generateInvoices(e, tariffs.filter(t => t.period === invoiceMonth), invoiceMonth)}
            >
              🚀 Ģenerēt rēķinus visiem
            </button>
          </div>
        </div>

        {/* Individuāls rēķins */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🏠 Individuāls rēķins</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <select style={styles.input} value={selectedApartmentForGen} onChange={e => setSelectedApartmentForGen(e.target.value)}>
              <option value="">Izvēlieties dzīvokli...</option>
              {apartments.map(a => <option key={a.id} value={a.id}>Dz. {a.number} - {a.owner_name}</option>)}
            </select>
            <button 
              style={{ ...styles.btn, background: '#0ea5e9' }} 
              onClick={(e) => generateInvoiceForApartment(e, selectedApartmentForGen, invoiceMonth)}
            >
              Izveidot šim dzīvoklim
            </button>
            {invoiceMonth && (
               <button 
               style={{ ...styles.btn, background: '#6366f1' }} 
               onClick={() => downloadMonthAsZip(invoiceMonth)}
             >
               📦 Lejupielādēt mēneša ZIP
             </button>
            )}
          </div>
        </div>
      </div>

      {/* Rēķinu saraksta tabula */}
      <div style={{ ...styles.card, marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ ...styles.cardTitle, marginBottom: 0 }}>📋 Sagatavotie rēķini</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input 
              placeholder="🔍 Dzīv. nr." 
              style={{ ...styles.input, width: '130px' }} 
              value={filterApartment} 
              onChange={e => setFilterApartment(e.target.value)} 
            />
            <select style={{ ...styles.input, width: '150px' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">Visi mēneši</option>
              {sortedMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={exportInvoicesToCSV} style={{ ...styles.btnSmall, background: '#10b981' }}>Eksportēt CSV</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '12px' }}>Nr.</th>
                <th style={{ padding: '12px' }}>Dzīvoklis</th>
                <th style={{ padding: '12px' }}>Periods</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Summa</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Statuss</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Darbības</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const apt = apartments.find(a => a.id === inv.apartment_id);
                const status = getInvoiceStatus(inv);
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{inv.invoice_number}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>Dz. {apt?.number}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{inv.period}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700' }}>€{inv.amount.toFixed(2)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        background: status.color, 
                        color: 'white', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'inline-block',
                        minWidth: '80px'
                      }}>
                        {status.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          title={inv.paid ? "Atzīmēt kā neapmaksātu" : "Atzīmēt kā apmaksātu"}
                          onClick={() => toggleInvoicePaid(inv.id, inv.paid)}
                          style={{ ...styles.btnSmall, background: inv.paid ? '#f59e0b' : '#10b981' }}
                        >
                          {inv.paid ? '↩️' : 'Apmaksāt'}
                        </button>
                        <button 
                          onClick={() => downloadPDF(inv)}
                          style={{ ...styles.btnSmall, background: '#475569' }}
                        >
                          PDF
                        </button>
                        <button 
                          onClick={() => deleteInvoice(inv.id)}
                          style={{ ...styles.btnSmall, background: '#ef4444' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Netika atrasts neviens rēķins.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Papildus funkcijas: Piezīmes un Pārmaksas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '24px' }}>
        
        {/* Piezīmju sadaļa */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📝 Parādu piezīmes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {invoices.filter(i => i.previous_debt_note).slice(0, 5).map(inv => (
              <div key={inv.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>Dz. {apartments.find(a => a.id === inv.apartment_id)?.number} ({inv.period})</div>
                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>"{inv.previous_debt_note}"</div>
                </div>
                <button 
                  onClick={() => setDebtNoteForm({ invoiceId: inv.id, note: inv.previous_debt_note || '' })}
                  style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '12px', padding: '0 0 0 10px' }}
                >
                  Labot
                </button>
              </div>
            ))}
            {invoices.filter(i => i.previous_debt_note).length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '10px' }}>Nav pievienotu piezīmju.</div>
            )}
          </div>
        </div>

        {/* Pārmaksu kontrole */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>💰 Pārmaksu reģistrs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {invoices.filter(inv => inv.overpayment_amount > 0).slice(0, 5).map(invoice => (
              <div key={invoice.id} style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#166534' }}>Dz. {apartments.find(a => a.id === invoice.apartment_id)?.number} ({invoice.period})</div>
                    <div style={{ color: '#166534', fontSize: '16px', fontWeight: '800' }}>€{invoice.overpayment_amount.toFixed(2)}</div>
                  </div>
                  
                  {editingOverpaymentId === invoice.id ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        type="number" 
                        value={editingOverpaymentAmount} 
                        onChange={e => setEditingOverpaymentAmount(e.target.value)} 
                        style={{ ...styles.input, width: '80px', padding: '6px' }} 
                      />
                      <button 
                        onClick={() => { updateOverpayment(invoice.id, parseFloat(editingOverpaymentAmount)); setEditingOverpaymentId(null); }} 
                        style={{ ...styles.btnSmall, background: '#10b981', padding: '6px 10px' }}
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => setEditingOverpaymentId(null)} 
                        style={{ ...styles.btnSmall, background: '#6b7280', padding: '6px 10px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        title="Labot summu"
                        onClick={() => { setEditingOverpaymentId(invoice.id); setEditingOverpaymentAmount(invoice.overpayment_amount); }} 
                        style={{ ...styles.btnSmall, background: '#3b82f6', padding: '6px 10px' }}
                      >
                        ✎
                      </button>
                      <button 
                        title="Dzēst pārmaksu"
                        onClick={() => deleteOverpayment(invoice.id)} 
                        style={{ ...styles.btnSmall, background: '#ef4444', padding: '6px 10px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
             {invoices.filter(inv => inv.overpayment_amount > 0).length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '10px' }}>Nav reģistrētu pārmaksu.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}