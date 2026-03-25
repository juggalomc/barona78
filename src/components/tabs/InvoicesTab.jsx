import React from 'react';

// Lokāli definēti stili, lai novērstu importa kļūdas
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
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    width: '600px',
    maxWidth: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
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
  downloadMonthAsZip,
  viewAsHTML,
  openReminderModal,
  closeReminderModal,
  sendReminderFromModal,
  reminderModal,
  setReminderModal,
  sendAllReminders,
  sendingProgress
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
    <div style={{ padding: '20px' }}>
      {/* ===== SŪTĪŠANAS PROGRESS ===== */}
      {sendingProgress?.active && (
        <div style={{ ...styles.card, background: '#f0f9ff', border: '1px solid #0ea5e9', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: '700', color: '#0369a1' }}>
            <span>📧 Notiek e-pastu izsūtīšana...</span>
            <span>{sendingProgress.current} no {sendingProgress.total}</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%`, height: '100%', background: '#0ea5e9', transition: 'width 0.4s ease' }}></div>
          </div>
        </div>
      )}

      {/* ===== ĢENERĒŠANAS BLOKS ===== */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px'}}>
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
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px'}}>
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
                <button onClick={() => regenerateInvoices(Array.from(selectedInvoices))} style={{...styles.btn, flex: 1, fontSize: '12px'}}>🔄 Reģenerēt</button>
                <button onClick={() => deleteInvoices(Array.from(selectedInvoices))} style={{...styles.btn, background: '#ef4444', flex: 1, fontSize: '12px'}}>🗑️ Dzēst</button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📤 Nosūtīšana un lejuplāde</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <button onClick={(e) => sendInvoicesByEmail(e, 'period-' + batchMonth)} style={{...styles.btn, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
              📤 Izsūtīt rēķinus e-pastā
              <span style={{background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px'}}>
                {invoices.filter(inv => inv.period === batchMonth).length}
              </span>
            </button>
            <button onClick={() => downloadMonthAsZip(batchMonth)} style={{...styles.btn, background: '#8b5cf6'}}>📦 ZIP lejuplāde ({invoices.filter(inv => inv.period === batchMonth).length})</button>
            <button onClick={sendAllReminders} style={{...styles.btn, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
              📧 Sūtīt atgādinājumus kavētajiem
              <span style={{background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px'}}>
                {invoices.filter(inv => !inv.paid && inv.due_date < new Date().toISOString().split('T')[0]).length}
              </span>
            </button>
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
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Statuss:</label>
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
                <tr style={{background: '#f0f4f8', borderBottom: '2px solid #cbd5e1'}}>
                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Rēķins</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Dzīvoklis</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Periods</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>Summa</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Pārmaksa</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Termiņš</th>
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
                    <tr key={invoice.id} style={{borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fafbfc' : '#fff'}}>
                      <td style={{padding: '12px', fontWeight: '600'}}>
                        <div style={{fontSize: '12px', display: 'flex', flexDirection: 'column'}}>
                          <span>{invoice.invoice_number}</span>
                          {invoice.sent_at && (
                            <span style={{fontSize: '10px', color: '#059669', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px'}}>
                              📩 Nosūtīts {new Date(invoice.sent_at).toLocaleDateString('lv-LV')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{padding: '12px', textAlign: 'center'}}>Dzīv. {apt?.number}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{invoice.period}</td>
                      <td style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#003399'}}>€{invoice.amount.toFixed(2)}</td>
                      
                      <td style={{padding: '12px', textAlign: 'center'}}>
                        {isEditingThis ? (
                          <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                            <input 
                              type="number" 
                              step="0.01" 
                              value={editingOverpaymentAmount} 
                              onChange={(e) => setEditingOverpaymentAmount(e.target.value)} 
                              style={{width: '60px', padding: '4px', border: '1px solid #0369a1', borderRadius: '3px', fontSize: '11px'}} 
                              autoFocus
                            />
                            <button onClick={() => {
                              updateOverpayment(invoice.id, parseFloat(editingOverpaymentAmount) || 0);
                              setEditingOverpaymentId(null);
                            }} style={{...styles.btnSmall, background: '#10b981', color: 'white'}}>✓</button>
                            <button onClick={() => setEditingOverpaymentId(null)} style={{...styles.btnSmall, background: '#6b7280', color: 'white'}}>✕</button>
                          </div>
                        ) : (
                          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                            <span style={{color: invoice.overpayment_amount > 0 ? '#10b981' : '#94a3b8', fontWeight: invoice.overpayment_amount > 0 ? '600' : '400'}}>
                              €{invoice.overpayment_amount?.toFixed(2) || '0.00'}
                            </span>
                            <button 
                              onClick={() => {
                                setEditingOverpaymentId(invoice.id);
                                setEditingOverpaymentAmount(invoice.overpayment_amount || 0);
                              }} 
                              style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '0', opacity: '0.6'}}
                              title="Labot pārmaksu"
                            >
                              ✎
                            </button>
                          </div>
                        )}
                      </td>

                      <td style={{padding: '12px', textAlign: 'center', fontSize: '12px'}}>
                        {new Date(invoice.due_date).toLocaleDateString('lv-LV')}
                      </td>
                      <td style={{padding: '12px', textAlign: 'center'}}>
                        <span style={{fontSize: '11px', fontWeight: '600', padding: '4px 8px', borderRadius: '4px', backgroundColor: status.color, color: 'white'}}>
                          {status.emoji} {status.status}
                        </span>
                      </td>
                      <td style={{padding: '12px', textAlign: 'center'}}>
                        <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                          <button onClick={() => toggleInvoicePaid(invoice.id, invoice.paid)} style={{...styles.btnSmall, padding: '4px 6px', background: invoice.paid ? '#10b981' : '#f59e0b', borderRadius: '3px', color: 'white', fontWeight: '600'}} title={invoice.paid ? 'Neapmaksāts' : 'Apmaksāts'}>
                            {invoice.paid ? '✓' : '○'}
                          </button>
                          <button onClick={(e) => sendInvoicesByEmail(e, invoice.id)} style={{...styles.btnSmall, padding: '4px 6px', background: '#3b82f6', color: 'white'}} title="Nosūtīt e-pastā (PDF)">
                            📧
                          </button>
                          {!invoice.paid && (
                            <button onClick={() => openReminderModal(invoice)} style={{...styles.btnSmall, padding: '4px 6px', background: '#ef4444', color: 'white'}} title="Sūtīt atgādinājumu">
                              
                            </button>
                          )}
                          <button onClick={() => viewAsHTML(invoice)} style={{...styles.btnSmall, padding: '4px 6px'}} title="Skatīt HTML">👁️</button>
                          <button onClick={() => downloadPDF(invoice)} style={{...styles.btnSmall, padding: '4px 6px'}} title="PDF">📥</button>
                          <button onClick={() => regenerateInvoice(invoice)} style={{...styles.btnSmall, padding: '4px 6px'}} title="Reģenerēt">🔄</button>
                          <button onClick={() => deleteInvoice(invoice.id)} style={{...styles.btnSmall, padding: '4px 6px'}} title="Dzēst">🗑️</button>
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

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px'}}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📝 Parāda Paskaidrojums</h2>
          {invoices.filter(inv => inv.previous_debt_amount > 0).length === 0 ? (
            <div style={{color: '#999', padding: '20px', textAlign: 'center'}}>Nav rēķinu ar parādu</div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {invoices.filter(inv => inv.previous_debt_amount > 0).slice(0, 5).map(invoice => {
                const apt = apartments.find(a => a.id === invoice.apartment_id);
                return (
                  <div key={invoice.id} style={{padding: '10px', background: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5'}}>
                    <div style={{fontSize: '12px', fontWeight: '600', color: '#991b1b', marginBottom: '6px'}}>
                      Dzīv. {apt?.number} - €{invoice.previous_debt_amount.toFixed(2)}
                    </div>
                    {debtNoteForm.invoiceId === invoice.id ? (
                      <div style={{display: 'flex', gap: '4px'}}>
                        <input type="text" placeholder="Paskaidrojums..." value={debtNoteForm.note} onChange={(e) => setDebtNoteForm({...debtNoteForm, note: e.target.value})} style={{...styles.input, flex: 1, fontSize: '12px'}} />
                        <button onClick={() => saveDebtNote(invoice.id, debtNoteForm.note)} style={{...styles.btn, padding: '4px 8px', fontSize: '11px', background: '#10b981'}}>✓</button>
                      </div>
                    ) : (
                      <button onClick={() => setDebtNoteForm({invoiceId: invoice.id, note: invoice.previous_debt_note || ''})} style={{width: '100%', padding: '6px', fontSize: '12px', background: '#fed7aa', border: '1px solid #fdba74', borderRadius: '4px', cursor: 'pointer', color: '#92400e', fontWeight: '600'}}>
                        ✎ {invoice.previous_debt_note ? 'Labot' : 'Pievienot'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>💰 Pārmaksa (Kopsavilkums)</h2>
          {invoices.filter(inv => inv.overpayment_amount > 0).length === 0 ? (
            <div style={{color: '#999', padding: '20px', textAlign: 'center'}}>Nav rēķinu ar pārmaksu</div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {invoices.filter(inv => inv.overpayment_amount > 0).slice(0, 5).map(invoice => {
                const apt = apartments.find(a => a.id === invoice.apartment_id);
                return (
                  <div key={invoice.id} style={{padding: '10px', background: '#dbeafe', borderRadius: '6px', border: '1px solid #bfdbfe'}}>
                    <div style={{fontSize: '12px', fontWeight: '600', color: '#0369a1', marginBottom: '6px'}}>
                      Dzīv. {apt?.number} - €{invoice.overpayment_amount.toFixed(2)}
                    </div>
                    {editingOverpaymentId === invoice.id ? (
                      <div style={{display: 'flex', gap: '4px'}}>
                        <input type="number" step="0.01" value={editingOverpaymentAmount} onChange={(e) => setEditingOverpaymentAmount(e.target.value)} style={{flex: 1, padding: '6px', border: '1px solid #0369a1', borderRadius: '3px', fontSize: '12px'}} />
                        <button onClick={() => {
                          updateOverpayment(invoice.id, parseFloat(editingOverpaymentAmount) || 0);
                          setEditingOverpaymentId(null);
                        }} style={{...styles.btn, padding: '4px 8px', fontSize: '11px', background: '#10b981'}}>✓</button>
                        <button onClick={() => setEditingOverpaymentId(null)} style={{...styles.btn, padding: '4px 8px', fontSize: '11px', background: '#6b7280'}}>✕</button>
                      </div>
                    ) : (
                      <div style={{display: 'flex', gap: '4px'}}>
                        <button onClick={() => {
                          setEditingOverpaymentId(invoice.id);
                          setEditingOverpaymentAmount(invoice.overpayment_amount);
                        }} style={{flex: 1, padding: '6px', fontSize: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: '600'}}>✎ Labot</button>
                        <button onClick={() => deleteOverpayment(invoice.id)} style={{padding: '6px 8px', fontSize: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: '600'}}>🗑️</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== ATGĀDINĀJUMA MODĀLAIS LOGS ===== */}
      {reminderModal.open && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={{fontSize: '18px', margin: 0}}>📧 Sūtīt atgādinājumu</h2>
            
            <div>
              <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px'}}>Saņēmējs:</label>
              <input type="email" value={reminderModal.to} onChange={(e) => setReminderModal({...reminderModal, to: e.target.value})} style={styles.input} />
            </div>
            
            <div>
              <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px'}}>Tēma:</label>
              <input type="text" value={reminderModal.subject} onChange={(e) => setReminderModal({...reminderModal, subject: e.target.value})} style={styles.input} />
            </div>
            
            <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
              <label style={{display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px'}}>Saturs (HTML):</label>
              <textarea value={reminderModal.body} onChange={(e) => setReminderModal({...reminderModal, body: e.target.value})} style={{...styles.input, minHeight: '300px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px'}} />
            </div>

            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
              <button onClick={sendReminderFromModal} style={{...styles.btn, flex: 1, background: '#10b981'}}>✓ Nosūtīt</button>
              <button onClick={closeReminderModal} style={{...styles.btn, flex: 1, background: '#6b7280'}}>✕ Atcelt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}