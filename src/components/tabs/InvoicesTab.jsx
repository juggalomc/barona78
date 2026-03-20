import React from 'react';
import { styles } from '../shared/styles';

export function InvoicesTab({
  invoices,
  apartments,
  tariffs,
  waterTariffs,
  meterReadings,
  uniqueTariffPeriods,
  // Handlers
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
  regenerateInvoice  // JAUNAIS - reģenerēšana
}) {
  const groupedInvoices = {};
  invoices.forEach(inv => {
    if (!groupedInvoices[inv.period]) {
      groupedInvoices[inv.period] = [];
    }
    groupedInvoices[inv.period].push(inv);
  });

  const sortedMonths = Object.keys(groupedInvoices).sort().reverse();

  return (
    <div>
      {/* RĒĶINU ĢENERĒŠANA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📄 Ģenerēt rēķinus</h2>
        <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#0369a1'}}>
          <strong>ℹ️ Automātiski parāds + pārmaksa:</strong> Sistēma automātiski pievienos parādu un atņems pārmaksas.
        </div>
        <form onSubmit={(e) => generateInvoices(e, tariffs.filter(t => t.period === invoiceMonth && t.include_in_invoice === true), invoiceMonth, { water: true })} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} style={styles.input}>
            <option value="">-- Izvēlieties mēnesi --</option>
            {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
          </select>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
            <input type="date" value={invoiceFromDate} onChange={(e) => setInvoiceFromDate(e.target.value)} style={styles.input} placeholder="No datuma" />
            <input type="date" value={invoiceToDate} onChange={(e) => setInvoiceToDate(e.target.value)} style={styles.input} placeholder="Līdz datumam" />
          </div>
          <button type="submit" style={styles.btn}>Ģenerēt</button>
        </form>
      </div>

      {/* RĒĶINU SARAKSTS */}
      <div style={styles.card}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
          <h2 style={styles.cardTitle}>💳 Rēķini ({invoices.length})</h2>
          <button onClick={exportInvoicesToCSV} style={{padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}>📊 CSV Export</button>
        </div>
        
        {sortedMonths.length === 0 ? (
          <div style={{textAlign: 'center', color: '#999', padding: '40px'}}>Nav rēķinu</div>
        ) : (
          <div>
            {sortedMonths.map(month => {
              const monthInvoices = groupedInvoices[month];
              const monthTotal = monthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
              const monthUnpaid = monthInvoices.filter(i => !i.paid).reduce((sum, inv) => sum + inv.amount, 0);
              const isExpanded = expandedInvoiceMonth === month;

              return (
                <div key={month} style={{marginBottom: '15px'}}>
                  <div
                    onClick={() => setExpandedInvoiceMonth(isExpanded ? null : month)}
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
                      <div style={{fontWeight: 'bold', fontSize: '14px'}}>📅 {new Date(month + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</div>
                      <div style={{fontSize: '12px', color: '#666'}}>€{monthTotal.toFixed(2)} • Parāds: €{monthUnpaid.toFixed(2)}</div>
                    </div>
                    <div style={{fontSize: '18px'}}>{isExpanded ? '▼' : '▶'}</div>
                  </div>

                  {isExpanded && (
                    <div style={{marginTop: '10px'}}>
                      {monthInvoices.map(invoice => {
                        const apt = apartments.find(a => a.id === invoice.apartment_id);
                        return (
                          <div key={invoice.id} style={{...styles.invoiceCard, flexWrap: 'wrap', marginBottom: '8px'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 100%', marginBottom: '10px'}}>
                              <input type="checkbox" checked={invoice.paid || false} onChange={() => toggleInvoicePaid(invoice.id, invoice.paid)} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
                              <div style={{flex: 1}}>
                                <div style={{fontWeight: '600', fontSize: '13px'}}>Dzīv. {apt?.number}</div>
                                <div style={{fontSize: '12px', color: '#666'}}>{invoice.invoice_number}</div>

                                {/* PARĀDS AR KOMENTĀRU */}
                                {invoice.previous_debt_amount > 0 && (
                                  <div style={{fontSize: '12px', color: '#991b1b', marginTop: '4px', padding: '8px', background: '#fee2e2', borderRadius: '4px'}}>
                                    <strong>⚠️ Parāds: €{invoice.previous_debt_amount.toFixed(2)}</strong>
                                    {invoice.previous_debt_note && (
                                      <div style={{marginTop: '4px', fontStyle: 'italic', fontSize: '11px'}}>
                                        💬 {invoice.previous_debt_note}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* PĀRMAKSA */}
                                {invoice.overpayment_amount > 0 && (
                                  <div style={{fontSize: '12px', color: '#0369a1', marginTop: '4px', padding: '8px', background: '#dbeafe', borderRadius: '4px'}}>
                                    <strong>💰 Pārmaksa: -€{invoice.overpayment_amount.toFixed(2)}</strong>
                                  </div>
                                )}

                                {/* PARĀDA NOPIEŠA */}
                                {debtNoteForm.invoiceId === invoice.id && (
                                  <div style={{marginTop: '8px', display: 'flex', gap: '8px'}}>
                                    <input type="text" placeholder="Paskaidrojums..." value={debtNoteForm.note} onChange={(e) => setDebtNoteForm({...debtNoteForm, note: e.target.value})} style={{...styles.input, flex: 1, fontSize: '12px'}} />
                                    <button onClick={() => saveDebtNote(invoice.id, debtNoteForm.note)} style={{padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>✓</button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 100%'}}>
                              <div style={{flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: invoice.paid ? '#10b981' : '#ef4444'}}>
                                €{invoice.amount.toFixed(2)}
                              </div>
                              <button onClick={() => downloadPDF(invoice)} style={{...styles.btnSmall, padding: '6px 12px'}} title="PDF">📥</button>
                              <button onClick={() => regenerateInvoice(invoice)} style={{...styles.btnSmall, padding: '6px 12px'}} title="Reģenerēt rēķinu">🔄</button>
                              {invoice.previous_debt_amount > 0 && (
                                <button onClick={() => setDebtNoteForm({invoiceId: invoice.id, note: invoice.previous_debt_note || ''})} style={{...styles.btnSmall, padding: '6px 12px', background: '#fecaca', borderRadius: '4px'}}>📝</button>
                              )}
                              <button onClick={() => deleteInvoice(invoice.id)} style={{...styles.btnSmall, padding: '6px 12px'}}>🗑️</button>
                            </div>
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

      {/* PĀRMAKSAS IEVADE */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>💰 Dzīvokļa pārmaksa</h2>
        <form onSubmit={saveOverpayment} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px'}}>
            <select value={overpaymentForm.apartmentId} onChange={(e) => setOverpaymentForm({...overpaymentForm, apartmentId: e.target.value})} style={styles.input}>
              <option value="">-- Dzīvoklis --</option>
              {apartments.map(apt => (<option key={apt.id} value={apt.id}>Dzīv. {apt.number} - {apt.owner_name}</option>))}
            </select>
            <select value={overpaymentForm.month} onChange={(e) => setOverpaymentForm({...overpaymentForm, month: e.target.value})} style={styles.input}>
              <option value="">-- Mēnesis --</option>
              {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
            </select>
            <input type="number" step="0.01" placeholder="Summa (€)" value={overpaymentForm.amount} onChange={(e) => setOverpaymentForm({...overpaymentForm, amount: e.target.value})} style={styles.input} />
          </div>
          <button type="submit" style={styles.btn}>Saglabāt pārmaksu</button>
        </form>
      </div>
    </div>
  );
}