import React from 'react';

// Lokāli definēti stili, lai izvairītos no importa kļūdām
const styles = {
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  btn: {
    padding: '10px 16px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    textAlign: 'center'
  },
  btnSmall: {
    padding: '4px 8px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

export function InvoicesTab({
  invoices,
  apartments,
  tariffs,
  waterTariffs,
  meterReadings,
  uniqueTariffPeriods,
  invoiceMonth, setInvoiceMonth,
  invoiceFromDate, setInvoiceFromDate,
  invoiceToDate, setInvoiceToDate,
  expandedInvoiceMonth, setExpandedInvoiceMonth,
  debtNoteForm, setDebtNoteForm,
  overpaymentForm, setOverpaymentForm,
  generateInvoices,
  toggleInvoicePaid,
  deleteInvoice,
  downloadPDF,
  exportInvoicesToCSV,
  saveDebtNote,
  saveOverpayment,
  getInvoiceStatus,
  showToast,
  regenerateInvoice,
  generateInvoiceForApartment,
  sendInvoicesByEmail,
  deleteInvoices,
  regenerateInvoices,
  updateOverpayment,
  deleteOverpayment,
  downloadMonthAsZip
}) {
  const [selectedApartmentForGen, setSelectedApartmentForGen] = React.useState('');
  const [selectedInvoices, setSelectedInvoices] = React.useState(new Set());
  const [batchMonth, setBatchMonth] = React.useState('');
  const [editingOverpaymentId, setEditingOverpaymentId] = React.useState(null);
  const [editingOverpaymentAmount, setEditingOverpaymentAmount] = React.useState('');
  const [filterMonth, setFilterMonth] = React.useState('');
  const [filterApartment, setFilterApartment] = React.useState('');

  const groupedInvoices = {};
  invoices.forEach(inv => {
    if (!groupedInvoices[inv.period]) {
      groupedInvoices[inv.period] = [];
    }
    groupedInvoices[inv.period].push(inv);
  });

  const sortedMonths = Object.keys(groupedInvoices).sort().reverse();

  const filteredInvoices = invoices.filter(inv => {
    if (filterMonth && inv.period !== filterMonth) return false;
    if (filterApartment) {
      const apt = apartments.find(a => a.id === inv.apartment_id);
      if (!apt || apt.number !== filterApartment) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ===== ĢENERĒŠANAS UN DARBĪBU SEKCIJA ===== */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '30px'}}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📄 Ģenerēt rēķinus</h2>
          <form onSubmit={(e) => generateInvoices(e, tariffs.filter(t => t.period === invoiceMonth && t.include_in_invoice === true), invoiceMonth, { water: true })} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} style={styles.input}>
              <option value="">-- Izvēlieties mēnesi --</option>
              {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{period}</option>))}
            </select>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
              <input type="date" value={invoiceFromDate} onChange={(e) => setInvoiceFromDate(e.target.value)} style={styles.input} />
              <input type="date" value={invoiceToDate} onChange={(e) => setInvoiceToDate(e.target.value)} style={styles.input} />
            </div>
            <button type="submit" style={styles.btn}>✓ Ģenerēt VISIEM</button>
          </form>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>⚙️ Masu darbības ({batchMonth})</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <select value={batchMonth} onChange={(e) => setBatchMonth(e.target.value)} style={styles.input}>
              <option value="">-- Izvēlieties mēnesi --</option>
              {sortedMonths.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div style={{display: 'flex', gap: '8px'}}>
              <button onClick={() => downloadMonthAsZip(batchMonth)} style={{...styles.btn, background: '#8b5cf6', flex: 1, fontSize: '12px'}}>📦 Lejupielādēt ZIP</button>
              <button onClick={exportInvoicesToCSV} style={{...styles.btn, background: '#10b981', flex: 1, fontSize: '12px'}}>📊 Eksportēt CSV</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RĒĶINU SARAKSTS ===== */}
      <div style={styles.card}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
          <h2 style={styles.cardTitle}>💳 Rēķinu saraksts</h2>
          <div style={{display: 'flex', gap: '10px'}}>
             <input 
               type="text" 
               placeholder="Dzīvokļa nr." 
               value={filterApartment} 
               onChange={(e) => setFilterApartment(e.target.value)} 
               style={{...styles.input, width: '120px', padding: '6px'}}
             />
             <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{...styles.input, width: '140px', padding: '6px'}}>
               <option value="">Visi mēneši</option>
               {sortedMonths.map(p => <option key={p} value={p}>{p}</option>)}
             </select>
          </div>
        </div>

        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
            <thead>
              <tr style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0'}}>
                <th style={{padding: '12px', textAlign: 'left'}}>Nr.</th>
                <th style={{padding: '12px', textAlign: 'center'}}>Dzīv.</th>
                <th style={{padding: '12px', textAlign: 'right'}}>Summa</th>
                <th style={{padding: '12px', textAlign: 'center'}}>Pārmaksa</th>
                <th style={{padding: '12px', textAlign: 'center'}}>Statuss</th>
                <th style={{padding: '12px', textAlign: 'center'}}>Darbības</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const apt = apartments.find(a => a.id === invoice.apartment_id);
                const status = getInvoiceStatus(invoice);
                const isEditingOverpayment = editingOverpaymentId === invoice.id;

                return (
                  <tr key={invoice.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                    <td style={{padding: '12px'}}>{invoice.invoice_number}</td>
                    <td style={{padding: '12px', textAlign: 'center'}}>{apt?.number}</td>
                    <td style={{padding: '12px', textAlign: 'right', fontWeight: 'bold'}}>€{invoice.amount.toFixed(2)}</td>
                    
                    <td style={{padding: '12px', textAlign: 'center'}}>
                      {isEditingOverpayment ? (
                        <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={editingOverpaymentAmount} 
                            onChange={(e) => setEditingOverpaymentAmount(e.target.value)} 
                            style={{width: '60px', padding: '4px', border: '1px solid #2563eb', borderRadius: '4px'}}
                            autoFocus
                          />
                          <button onClick={() => {
                            updateOverpayment(invoice.id, parseFloat(editingOverpaymentAmount) || 0);
                            setEditingOverpaymentId(null);
                          }} style={{...styles.btnSmall, background: '#10b981', color: 'white'}}>✓</button>
                        </div>
                      ) : (
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}>
                          <span style={{color: invoice.overpayment_amount > 0 ? '#10b981' : '#94a3b8'}}>
                            €{invoice.overpayment_amount?.toFixed(2) || '0.00'}
                          </span>
                          <button 
                            onClick={() => {
                              setEditingOverpaymentId(invoice.id);
                              setEditingOverpaymentAmount(invoice.overpayment_amount || 0);
                            }}
                            style={{background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5}}
                          >✎</button>
                        </div>
                      )}
                    </td>

                    <td style={{padding: '12px', textAlign: 'center'}}>
                      <span style={{background: status.color, color: 'white', padding: '3px 8px', borderRadius: '12px', fontSize: '11px'}}>
                        {status.status}
                      </span>
                    </td>
                    <td style={{padding: '12px', textAlign: 'center'}}>
                      <div style={{display: 'flex', gap: '6px', justifyContent: 'center'}}>
                        <button onClick={() => toggleInvoicePaid(invoice.id, invoice.paid)} style={{...styles.btnSmall, background: invoice.paid ? '#10b981' : '#f59e0b', color: 'white'}}>
                          {invoice.paid ? 'Apmaksāts' : 'Atzīmēt'}
                        </button>
                        <button onClick={() => downloadPDF(invoice)} style={{...styles.btnSmall, background: '#334155', color: 'white'}} title="Lejupielādēt PDF">📥</button>
                        <button onClick={() => deleteInvoice(invoice.id)} style={{...styles.btnSmall, background: '#ef4444', color: 'white'}}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== KOPSAVILKUMA KARTĪTES ===== */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px'}}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📝 Parādu piezīmes</h3>
            {invoices.filter(i => i.previous_debt_amount > 0).slice(0, 5).map(inv => (
              <div key={inv.id} style={{padding: '8px', borderBottom: '1px solid #eee', fontSize: '12px'}}>
                <strong>Dz. {apartments.find(a => a.id === inv.apartment_id)?.number}:</strong> {inv.previous_debt_note || 'Nav piezīmju'}
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>💰 Pārmaksu labošana</h3>
            {invoices.filter(i => i.overpayment_amount > 0).slice(0, 5).map(inv => (
              <div key={inv.id} style={{padding: '8px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px'}}>
                <span>Dz. {apartments.find(a => a.id === inv.apartment_id)?.number}</span>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <span style={{fontWeight: 'bold', color: '#10b981'}}>€{inv.overpayment_amount.toFixed(2)}</span>
                  <button onClick={() => deleteOverpayment(inv.id)} style={{...styles.btnSmall, background: '#fee2e2', color: '#ef4444'}}>Dzēst</button>
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}