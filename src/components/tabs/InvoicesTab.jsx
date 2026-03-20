import React from 'react';

// Lokāli definēti stili, lai novērstu importa kļūdas un nodrošinātu konsistenci
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
    textAlign: 'center',
    transition: 'background 0.2s'
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

  // Droša PDF lejupielādes funkcija
  const handleDownloadPDF = async (invoice) => {
    try {
      if (typeof downloadPDF === 'function') {
        await downloadPDF(invoice);
      } else {
        console.error("downloadPDF function is not provided");
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      if (typeof showToast === 'function') {
        showToast("Kļūda PDF ģenerēšanā", "error");
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ===== ĢENERĒŠANAS BLOKS ===== */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '30px'}}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📄 Ģenerēt - VISI DZĪVOKĻI</h2>
          <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#0369a1'}}>
            <strong>ℹ️</strong> Automātiski pievienos parādu un pārmaksu
          </div>
          <form onSubmit={(e) => generateInvoices(e, tariffs.filter(t => t.period === invoiceMonth && t.include_in_invoice === true), invoiceMonth, { water: true })} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} style={styles.input}>
              <option value="">-- Izvēlieties mēnesi --</option>
              {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
            </select>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
              <input type="date" value={invoiceFromDate} onChange={(e) => setInvoiceFromDate(e.target.value)} style={styles.input} />
              <input type="date" value={invoiceToDate} onChange={(e) => setInvoiceToDate(e.target.value)} style={styles.input} />
            </div>
            <button type="submit" style={styles.btn}>✓ Ģenerēt VISIEM</button>
          </form>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🏠 Ģenerēt - ATSEVIŠĶAM</h2>
          <form onSubmit={(e) => generateInvoiceForApartment(e, selectedApartmentForGen, invoiceMonth, tariffs.filter(t => t.period === invoiceMonth && t.include_in_invoice === true), invoiceFromDate, invoiceToDate)} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <select value={selectedApartmentForGen} onChange={(e) => setSelectedApartmentForGen(e.target.value)} style={styles.input}>
              <option value="">-- Izvēlieties dzīvokli --</option>
              {apartments.sort((a, b) => parseInt(a.number) - parseInt(b.number)).map(apt => (<option key={apt.id} value={apt.id}>Dzīv. {apt.number} - {apt.owner_name}</option>))}
            </select>
            <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} style={styles.input}>
              <option value="">-- Izvēlieties mēnesi --</option>
              {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
            </select>
            <button type="submit" style={styles.btn}>✓ Ģenerēt ATSEVIŠĶI</button>
          </form>
        </div>
      </div>

      {/* ===== DARBĪBAS AR RĒĶINIEM ===== */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '30px'}}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>⚙️ Masu darbības</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <select value={batchMonth} onChange={(e) => {
              setBatchMonth(e.target.value);
              setSelectedInvoices(new Set());
            }} style={styles.input}>
              <option value="">-- Izvēlieties mēnesi --</option>
              {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
            </select>
            <button 
              onClick={() => {
                const monthInvoices = invoices.filter(inv => inv.period === batchMonth);
                setSelectedInvoices(new Set(monthInvoices.map(inv => inv.id)));
              }}
              style={{padding: '10px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'}}
            >
              Izvēlēt VISUS ({invoices.filter(inv => inv.period === batchMonth).length})
            </button>
            {selectedInvoices.size > 0 && (
              <div style={{display: 'flex', gap: '8px'}}>
                <button onClick={() => regenerateInvoices(Array.from(selectedInvoices))} style={{...styles.btn, background: '#f59e0b', flex: 1, fontSize: '12px'}}>🔄 Reģenerēt</button>
                <button onClick={() => deleteInvoices(Array.from(selectedInvoices))} style={{...styles.btn, background: '#ef4444', flex: 1, fontSize: '12px'}}>🗑️ Dzēst</button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📤 Nosūtīšana un lejuplāde</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <button onClick={() => downloadMonthAsZip(batchMonth)} style={{...styles.btn, background: '#8b5cf6'}}>📦 ZIP lejuplāde ({invoices.filter(inv => inv.period === batchMonth).length})</button>
            <button onClick={exportInvoicesToCSV} style={{...styles.btn, background: '#10b981'}}>📊 CSV eksports</button>
          </div>
        </div>
      </div>

      {/* ===== RĒĶINU FILTRS UN PĀRLŪKS ===== */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>💳 Rēķinu Pārlūks</h2>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Periods:</label>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={styles.input}>
              <option value="">Visi periodi</option>
              {sortedMonths.map(period => (
                <option key={period} value={period}>
                  {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'short', year: 'numeric'})}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Dzīvoklis:</label>
            <select value={filterApartment} onChange={(e) => setFilterApartment(e.target.value)} style={styles.input}>
              <option value="">Visi dzīvokļi</option>
              {apartments.sort((a, b) => parseInt(a.number) - parseInt(b.number)).map(apt => (
                <option key={apt.id} value={apt.number}>Dzīv. {apt.number}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Kopā:</label>
            <div style={{fontSize: '13px', color: '#0369a1', fontWeight: '600', padding: '8px', background: '#dbeafe', borderRadius: '4px', textAlign: 'center'}}>
              {filteredInvoices.length} rēķini
            </div>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div style={{textAlign: 'center', color: '#999', padding: '40px'}}>Nav rēķinu</div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
              <thead>
                <tr style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0'}}>
                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Nr.</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Dzīv.</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Periods</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Summa</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Pārmaksa</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Statuss</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Darbības</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, idx) => {
                  const apt = apartments.find(a => a.id === invoice.apartment_id);
                  const status = getInvoiceStatus(invoice);
                  const isEditingThis = editingOverpaymentId === invoice.id;

                  return (
                    <tr key={invoice.id} style={{borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc'}}>
                      <td style={{padding: '12px', fontWeight: '600'}}>{invoice.invoice_number}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{apt?.number}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{invoice.period}</td>
                      <td style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#1e40af'}}>€{invoice.amount.toFixed(2)}</td>
                      
                      <td style={{padding: '12px', textAlign: 'center'}}>
                        {isEditingThis ? (
                          <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                            <input 
                              type="number" 
                              step="0.01" 
                              value={editingOverpaymentAmount} 
                              onChange={(e) => setEditingOverpaymentAmount(e.target.value)} 
                              style={{width: '65px', padding: '4px', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '11px'}} 
                              autoFocus
                            />
                            <button onClick={() => {
                              updateOverpayment(invoice.id, parseFloat(editingOverpaymentAmount) || 0);
                              setEditingOverpaymentId(null);
                            }} style={{...styles.btnSmall, background: '#10b981', color: 'white'}}>✓</button>
                            <button onClick={() => setEditingOverpaymentId(null)} style={{...styles.btnSmall, background: '#64748b', color: 'white'}}>✕</button>
                          </div>
                        ) : (
                          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                            <span style={{color: invoice.overpayment_amount > 0 ? '#059669' : '#94a3b8', fontWeight: invoice.overpayment_amount > 0 ? '600' : '400'}}>
                              €{invoice.overpayment_amount?.toFixed(2) || '0.00'}
                            </span>
                            <button 
                              onClick={() => {
                                setEditingOverpaymentId(invoice.id);
                                setEditingOverpaymentAmount(invoice.overpayment_amount || 0);
                              }} 
                              style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: '0.4', padding: '4px'}}
                              title="Labot pārmaksu"
                            >
                              ✎
                            </button>
                          </div>
                        )}
                      </td>

                      <td style={{padding: '12px', textAlign: 'center'}}>
                        <span style={{fontSize: '11px', fontWeight: '600', padding: '4px 8px', borderRadius: '4px', backgroundColor: status.color, color: 'white'}}>
                          {status.emoji} {status.status}
                        </span>
                      </td>
                      <td style={{padding: '12px', textAlign: 'center'}}>
                        <div style={{display: 'flex', gap: '6px', justifyContent: 'center'}}>
                          <button onClick={() => toggleInvoicePaid(invoice.id, invoice.paid)} style={{...styles.btnSmall, background: invoice.paid ? '#10b981' : '#f59e0b', color: 'white'}} title={invoice.paid ? 'Iezīmēt kā nemaksātu' : 'Iezīmēt kā apmaksātu'}>
                            {invoice.paid ? '✓' : '○'}
                          </button>
                          <button onClick={() => handleDownloadPDF(invoice)} style={{...styles.btnSmall, background: '#334155', color: 'white'}} title="Lejupielādēt PDF">📥</button>
                          <button onClick={() => regenerateInvoice(invoice)} style={{...styles.btnSmall, background: '#6366f1', color: 'white'}} title="Pārrēķināt">🔄</button>
                          <button onClick={() => deleteInvoice(invoice.id)} style={{...styles.btnSmall, background: '#ef4444', color: 'white'}} title="Dzēst">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginTop: '30px'}}>
        {/* PARĀDA PASKAIDROJUMS */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📝 Parāda Paskaidrojumi</h2>
          {invoices.filter(inv => inv.previous_debt_amount > 0).length === 0 ? (
            <div style={{color: '#94a3b8', padding: '20px', textAlign: 'center', fontSize: '14px'}}>Nav rēķinu ar parādu</div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {invoices.filter(inv => inv.previous_debt_amount > 0).slice(0, 5).map(invoice => {
                const apt = apartments.find(a => a.id === invoice.apartment_id);
                return (
                  <div key={invoice.id} style={{padding: '12px', background: '#fff1f2', borderRadius: '6px', border: '1px solid #fecaca'}}>
                    <div style={{fontSize: '12px', fontWeight: '600', color: '#991b1b', marginBottom: '8px', display: 'flex', justifyContent: 'space-between'}}>
                      <span>Dzīv. {apt?.number} ({invoice.period})</span>
                      <span>€{invoice.previous_debt_amount.toFixed(2)}</span>
                    </div>
                    {debtNoteForm.invoiceId === invoice.id ? (
                      <div style={{display: 'flex', gap: '4px'}}>
                        <input type="text" placeholder="Paskaidrojums..." value={debtNoteForm.note} onChange={(e) => setDebtNoteForm({...debtNoteForm, note: e.target.value})} style={{...styles.input, flex: 1, fontSize: '12px', padding: '6px'}} />
                        <button onClick={() => saveDebtNote(invoice.id, debtNoteForm.note)} style={{...styles.btnSmall, background: '#10b981', color: 'white', padding: '0 10px'}}>✓</button>
                      </div>
                    ) : (
                      <button onClick={() => setDebtNoteForm({invoiceId: invoice.id, note: invoice.previous_debt_note || ''})} style={{width: '100%', padding: '6px', fontSize: '12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', color: '#991b1b', textAlign: 'left'}}>
                        {invoice.previous_debt_note ? `💬 ${invoice.previous_debt_note}` : '✎ Pievienot paskaidrojumu'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PĀRMAKSU KOPSAVILKUMS */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>💰 Pārmaksu Kopsavilkums</h2>
          {invoices.filter(inv => inv.overpayment_amount > 0).length === 0 ? (
            <div style={{color: '#94a3b8', padding: '20px', textAlign: 'center', fontSize: '14px'}}>Nav rēķinu ar pārmaksu</div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {invoices.filter(inv => inv.overpayment_amount > 0).slice(0, 5).map(invoice => {
                const apt = apartments.find(a => a.id === invoice.apartment_id);
                return (
                  <div key={invoice.id} style={{padding: '12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0'}}>
                    <div style={{fontSize: '12px', fontWeight: '600', color: '#166534', marginBottom: '8px', display: 'flex', justifyContent: 'space-between'}}>
                      <span>Dzīv. {apt?.number} ({invoice.period})</span>
                      <span>€{invoice.overpayment_amount.toFixed(2)}</span>
                    </div>
                    {editingOverpaymentId === invoice.id ? (
                      <div style={{display: 'flex', gap: '4px'}}>
                        <input type="number" step="0.01" value={editingOverpaymentAmount} onChange={(e) => setEditingOverpaymentAmount(e.target.value)} style={{flex: 1, padding: '6px', border: '1px solid #22c55e', borderRadius: '4px', fontSize: '12px'}} />
                        <button onClick={() => {
                          updateOverpayment(invoice.id, parseFloat(editingOverpaymentAmount) || 0);
                          setEditingOverpaymentId(null);
                        }} style={{...styles.btnSmall, background: '#10b981', color: 'white', padding: '0 10px'}}>✓</button>
                      </div>
                    ) : (
                      <div style={{display: 'flex', gap: '6px'}}>
                        <button onClick={() => {
                          setEditingOverpaymentId(invoice.id);
                          setEditingOverpaymentAmount(invoice.overpayment_amount);
                        }} style={{flex: 1, padding: '6px', fontSize: '12px', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>✎ Labot</button>
                        <button onClick={() => deleteOverpayment(invoice.id)} style={{padding: '6px 10px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer'}}>🗑️</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}