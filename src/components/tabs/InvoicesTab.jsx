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
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = React.useState('');
  const [selectedInvoices, setSelectedInvoices] = React.useState(new Set());
  const [batchMonth, setBatchMonth] = React.useState('');
  const [editingOverpaymentId, setEditingOverpaymentId] = React.useState(null);
  const [editingOverpaymentAmount, setEditingOverpaymentAmount] = React.useState('');

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
      {/* RĒĶINU ĢENERĒŠANA - VISI */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📄 Ģenerēt rēķinus - VISI DZĪVOKĻI</h2>
        <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#0369a1'}}>
          <strong>ℹ️ Automātiski parāds + pārmaksa:</strong> Sistēma automātiski pievienos parādu un pārmaksu no iepriekšējiem rēķiniem (ja to gala summa ir negatīva).
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
          <button type="submit" style={styles.btn}>Ģenerēt VISIEM</button>
        </form>
      </div>

      {/* RĒĶINU ĢENERĒŠANA - ATSEVIŠĶAM DZĪVOKLIM */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🏠 Ģenerēt rēķinu - ATSEVIŠĶAM DZĪVOKLIM</h2>
        <form onSubmit={(e) => generateInvoiceForApartment(e, selectedApartmentForGen, invoiceMonth, tariffs.filter(t => t.period === invoiceMonth && t.include_in_invoice === true), invoiceFromDate, invoiceToDate)} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          <select value={selectedApartmentForGen} onChange={(e) => setSelectedApartmentForGen(e.target.value)} style={styles.input}>
            <option value="">-- Izvēlieties dzīvokli --</option>
            {apartments.map(apt => (<option key={apt.id} value={apt.id}>Dzīv. {apt.number} - {apt.owner_name}</option>))}
          </select>
          <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} style={styles.input}>
            <option value="">-- Izvēlieties mēnesi --</option>
            {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
          </select>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
            <input type="date" value={invoiceFromDate} onChange={(e) => setInvoiceFromDate(e.target.value)} style={styles.input} placeholder="No datuma" />
            <input type="date" value={invoiceToDate} onChange={(e) => setInvoiceToDate(e.target.value)} style={styles.input} placeholder="Līdz datumam" />
          </div>
          <button type="submit" style={styles.btn}>Ģenerēt ATSEVIŠĶI</button>
        </form>
      </div>

      {/* NOSŪTĪT RĒĶINUS PA E-PASTU */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📧 Nosūtīt rēķinus pa e-pastu</h2>
        <form onSubmit={(e) => sendInvoicesByEmail(e, selectedInvoiceForEmail)} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          <select value={selectedInvoiceForEmail} onChange={(e) => setSelectedInvoiceForEmail(e.target.value)} style={styles.input}>
            <option value="">-- Izvēlieties rēķinu vai periodu --</option>
            <optgroup label="Periodi">
              {uniqueTariffPeriods.map(period => (<option key={period} value={`period-${period}`}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})} (visi)</option>))}
            </optgroup>
            <optgroup label="Atsevišķi rēķini">
              {invoices.map(inv => {
                const apt = apartments.find(a => a.id === inv.apartment_id);
                return (<option key={inv.id} value={inv.id}>Dzīv. {apt?.number} - {inv.period} ({inv.invoice_number})</option>);
              })}
            </optgroup>
          </select>
          <button type="submit" style={styles.btn}>📤 Nosūtīt pa e-pastu</button>
        </form>
      </div>

      {/* RĒĶINU MASU LABOŠANA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>⚙️ Rēķinu Masu Labošana</h2>
        <div style={{display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'flex-end', marginBottom: '15px'}}>
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
              if (monthInvoices.length === 0) {
                showToast('Nav šī perioda rēķinu', 'error');
                return;
              }
              setSelectedInvoices(new Set(monthInvoices.map(inv => inv.id)));
              showToast(`Izvēlēti ${monthInvoices.length} rēķini`);
            }}
            style={{padding: '10px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap'}}
          >
            Izvēlēt VISUS
          </button>
          <button 
            onClick={() => setSelectedInvoices(new Set())}
            style={{padding: '10px 16px', background: '#e5e7eb', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap'}}
          >
            Notīrīt
          </button>
        </div>
        {selectedInvoices.size > 0 && (
          <div style={{display: 'flex', gap: '12px', marginTop: '12px', padding: '12px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #0ea5e9'}}>
            <span style={{fontSize: '13px', fontWeight: '600', color: '#0369a1'}}>Izvēlēti: {selectedInvoices.size}</span>
            <button 
              onClick={() => regenerateInvoices(Array.from(selectedInvoices))}
              style={{padding: '8px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'}}
            >
              🔄 Reģenerēt
            </button>
            <button 
              onClick={() => deleteInvoices(Array.from(selectedInvoices))}
              style={{padding: '8px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'}}
            >
              🗑️ Izdzēst
            </button>
          </div>
        )}
      </div>

      {/* LEJUPLĀDES MĒNEŠA RĒĶINI KĀ ZIP */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📥 Lejuplādes Mēneša Rēķinus ZIP Formātā</h2>
        <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-end'}}>
          <select 
            value={batchMonth} 
            onChange={(e) => setBatchMonth(e.target.value)} 
            style={styles.input}
          >
            <option value="">-- Izvēlieties mēnesi --</option>
            {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
          </select>
          <button 
            onClick={() => downloadMonthAsZip(batchMonth)}
            style={{padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap'}}
          >
            📦 ZIP Lejuplāde
          </button>
        </div>
        <div style={{marginTop: '10px', fontSize: '12px', color: '#666'}}>
          <p>✓ Visi mēneša rēķini tiks pievienoti ZIP failā PDF formātā</p>
          <p>✓ Failu nosaukumi satur rēķina numuru un dzīvokļa numuru</p>
        </div>
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
                        const isSelected = selectedInvoices.has(invoice.id);
                        return (
                          <div key={invoice.id} style={{...styles.invoiceCard, flexWrap: 'wrap', marginBottom: '8px', border: isSelected && batchMonth ? '2px solid #0ea5e9' : '1px solid #e2e8f0', background: isSelected && batchMonth ? '#f0f9ff' : '#fff'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 100%', marginBottom: '10px'}}>
                              {batchMonth && month === batchMonth ? (
                                <input 
                                  type="checkbox" 
                                  checked={isSelected} 
                                  onChange={() => {
                                    const newSelected = new Set(selectedInvoices);
                                    if (isSelected) {
                                      newSelected.delete(invoice.id);
                                    } else {
                                      newSelected.add(invoice.id);
                                    }
                                    setSelectedInvoices(newSelected);
                                  }} 
                                  style={{width: '18px', height: '18px', cursor: 'pointer'}}
                                />
                              ) : (
                                <input type="checkbox" checked={invoice.paid || false} onChange={() => toggleInvoicePaid(invoice.id, invoice.paid)} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
                              )}
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
                                    {editingOverpaymentId === invoice.id ? (
                                      <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editingOverpaymentAmount}
                                          onChange={(e) => setEditingOverpaymentAmount(e.target.value)}
                                          style={{flex: 1, padding: '4px 8px', fontSize: '12px', border: '1px solid #0369a1', borderRadius: '3px'}}
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => {
                                            updateOverpayment(invoice.id, parseFloat(editingOverpaymentAmount));
                                            setEditingOverpaymentId(null);
                                          }}
                                          style={{padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: '600'}}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={() => setEditingOverpaymentId(null)}
                                          style={{padding: '4px 8px', background: '#e5e7eb', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px'}}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between'}}>
                                        <strong>💰 Pārmaksa: -€{invoice.overpayment_amount.toFixed(2)}</strong>
                                        <div style={{display: 'flex', gap: '6px'}}>
                                          <button
                                            onClick={() => {
                                              setEditingOverpaymentId(invoice.id);
                                              setEditingOverpaymentAmount(invoice.overpayment_amount);
                                            }}
                                            style={{padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: '600'}}
                                            title="Rediģēt pārmaksu"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            onClick={() => deleteOverpayment(invoice.id)}
                                            style={{padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: '600'}}
                                            title="Dzēst pārmaksu"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* PARĀDA PASKAIDROJUMA FORMA */}
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
                              <button onClick={() => sendInvoicesByEmail(new Event('submit'), invoice.id)} style={{...styles.btnSmall, padding: '6px 12px', background: '#3b82f6'}} title="Nosūtīt e-pastu">📧</button>
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
        <h2 style={styles.cardTitle}>💰 Rēķina Pārmaksa</h2>
        <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#0369a1'}}>
          <strong>ℹ️ Norādi pārmaksu pie konkrēta rēķina.</strong> Pārmaksa tiks atņemta no šī rēķina summas un parādīsies nākamajā mēneša rēķinā (ja iepriekšējā rēķina gala summa ir negatīva).
        </div>
        <form onSubmit={saveOverpayment} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
            <select value={overpaymentForm.invoiceId || ''} onChange={(e) => setOverpaymentForm({...overpaymentForm, invoiceId: e.target.value})} style={styles.input}>
              <option value="">-- Izvēlieties rēķinu --</option>
              {invoices.map(inv => {
                const apt = apartments.find(a => a.id === inv.apartment_id);
                return (<option key={inv.id} value={inv.id}>Dzīv. {apt?.number} - {inv.period} ({inv.invoice_number})</option>);
              })}
            </select>
            <input type="number" step="0.01" placeholder="Pārmaksas summa (€)" value={overpaymentForm.amount} onChange={(e) => setOverpaymentForm({...overpaymentForm, amount: e.target.value})} style={styles.input} />
          </div>
          <button type="submit" style={styles.btn}>Saglabāt pārmaksu uz rēķina</button>
        </form>
      </div>
    </div>
  );
}