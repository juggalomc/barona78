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
    fontSize: '20px',
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
    fontSize: '14px',
    textAlign: 'center',
    transition: 'all 0.2s'
  },
  btnSmall: {
    padding: '6px 10px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '500'
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

  // Grupēšana un filtrēšana
  const groupedInvoices = {};
  invoices.forEach(inv => {
    if (!groupedInvoices[inv.period]) groupedInvoices[inv.period] = [];
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

  const handleSelectAllInMonth = (month) => {
    const monthInvoices = invoices.filter(inv => inv.period === month);
    setSelectedInvoices(new Set(monthInvoices.map(inv => inv.id)));
  };

  /**
   * Jauna, profesionāla PDF ģenerēšanas funkcija latviešu valodā
   * Ja globālais pdfMake neeksistē, mēģinām alternatīvu vai izvadam kļūdu
   */
  const handleGeneratePDF = (invoice) => {
    const apt = apartments.find(a => a.id === invoice.apartment_id);
    
    // Pārbaudām vai pdfMake ir pieejams globāli
    const pdfMake = window.pdfMake;
    if (!pdfMake || typeof pdfMake.createPdf !== 'function') {
      console.error("pdfMake nav inicializēts");
      showToast("Kļūda: PDF bibliotēka nav pieejama. Mēģiniet pārlādēt lapu.", "error");
      return;
    }

    const docDefinition = {
      content: [
        { text: 'RĒĶINS Nr. ' + invoice.invoice_number, style: 'header' },
        { text: 'Datums: ' + new Date().toLocaleDateString('lv-LV'), alignment: 'right' },
        { text: '\n' },
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'PAKALPOJUMA SNIEDZĒJS:', style: 'subHeader' },
                { text: 'Biedrība "Mājas Apsaimniekotājs"' },
                { text: 'Reģ. nr: 40000000000' },
                { text: 'Adrese: Rīga, Latvija' },
              ]
            },
            {
              width: '*',
              stack: [
                { text: 'KLIENTS:', style: 'subHeader' },
                { text: 'Dzīvoklis Nr. ' + (apt?.number || 'N/A') },
                { text: 'Īpašnieks: ' + (apt?.owner_name || 'N/A') },
                { text: 'Adrese: ' + (apt?.address || 'N/A') },
              ]
            }
          ]
        },
        { text: '\n\n' },
        { text: 'Norēķinu periods: ' + invoice.period, style: 'boldText' },
        {
          style: 'tableExample',
          table: {
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Pakalpojums', style: 'tableHeader' },
                { text: 'Daudzums', style: 'tableHeader' },
                { text: 'Tarifs', style: 'tableHeader' },
                { text: 'Summa (€)', style: 'tableHeader' }
              ],
              ...(invoice.items || []).map(item => [
                item.name,
                item.quantity.toFixed(2),
                '€' + item.price.toFixed(4),
                '€' + (item.quantity * item.price).toFixed(2)
              ]),
              [
                { text: 'KOPĀ APMAKSAI:', colSpan: 3, style: 'boldText' },
                {},
                {},
                { text: '€' + invoice.amount.toFixed(2), style: 'boldText' }
              ]
            ]
          },
          layout: 'lightHorizontalLines'
        },
        { text: '\n' },
        invoice.previous_debt_amount > 0 ? {
          text: 'Iepriekšējais parāds: €' + invoice.previous_debt_amount.toFixed(2),
          color: 'red'
        } : null,
        invoice.overpayment_amount > 0 ? {
          text: 'Pārmaksa: €' + invoice.overpayment_amount.toFixed(2),
          color: 'green'
        } : null,
        { text: '\n\n' },
        { text: 'Piezīmes: Rēķins sagatavots elektroniski un ir derīgs bez paraksta.', style: 'smallText' }
      ],
      styles: {
        header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#1e293b' },
        subHeader: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, color: '#64748b' },
        tableHeader: { bold: true, fontSize: 12, color: 'white', fillOpacity: 1, fillColor: '#2563eb' },
        boldText: { bold: true, fontSize: 13 },
        smallText: { fontSize: 10, italic: true, color: '#94a3b8' },
        tableExample: { margin: [0, 5, 0, 15] }
      },
      defaultStyle: { font: 'Roboto' } // Pārliecinies, ka fonti ir ielādēti
    };

    try {
      pdfMake.createPdf(docDefinition).download(`Rekins_${invoice.invoice_number}.pdf`);
      showToast("PDF veiksmīgi izveidots");
    } catch (e) {
      console.error("PDF ģenerēšanas kļūda:", e);
      // Fallback uz veco metodi, ja jaunā neizdodas
      downloadPDF(invoice);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ===== ĢENERĒŠANAS SEKCIJA ===== */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px'}}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📄 Masu rēķinu ģenerēšana</h2>
          <form onSubmit={(e) => generateInvoices(e, tariffs.filter(t => t.period === invoiceMonth && t.include_in_invoice === true), invoiceMonth, { water: true })} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <label style={{fontSize: '14px', fontWeight: '500'}}>Izvēlieties periodu</label>
            <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} style={styles.input}>
              <option value="">-- Mēnesis --</option>
              {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{period}</option>))}
            </select>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
              <div>
                <label style={{fontSize: '12px', color: '#64748b'}}>No</label>
                <input type="date" value={invoiceFromDate} onChange={(e) => setInvoiceFromDate(e.target.value)} style={styles.input} />
              </div>
              <div>
                <label style={{fontSize: '12px', color: '#64748b'}}>Līdz</label>
                <input type="date" value={invoiceToDate} onChange={(e) => setInvoiceToDate(e.target.value)} style={styles.input} />
              </div>
            </div>
            <button type="submit" style={styles.btn}>🚀 Ģenerēt visiem dzīvokļiem</button>
          </form>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🏠 Individuāls rēķins</h2>
          <form onSubmit={(e) => generateInvoiceForApartment(e, selectedApartmentForGen, invoiceMonth, tariffs.filter(t => t.period === invoiceMonth && t.include_in_invoice === true), invoiceFromDate, invoiceToDate)} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <label style={{fontSize: '14px', fontWeight: '500'}}>Dzīvoklis</label>
            <select value={selectedApartmentForGen} onChange={(e) => setSelectedApartmentForGen(e.target.value)} style={styles.input}>
              <option value="">-- Atlasīt dzīvokli --</option>
              {apartments.sort((a,b) => a.number.localeCompare(b.number, undefined, {numeric: true})).map(apt => (
                <option key={apt.id} value={apt.id}>Dz. {apt.number} - {apt.owner_name}</option>
              ))}
            </select>
            <button type="submit" style={{...styles.btn, background: '#0ea5e9'}}>✨ Izveidot vienu rēķinu</button>
          </form>
        </div>
      </div>

      {/* ===== FILTRI UN DARBĪBAS ===== */}
      <div style={styles.card}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px'}}>
          <h2 style={styles.cardTitle}>📋 Rēķinu pārvaldība</h2>
          <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
            <input 
              type="text" 
              placeholder="🔍 Meklēt dzīv. nr." 
              value={filterApartment} 
              onChange={(e) => setFilterApartment(e.target.value)} 
              style={{...styles.input, width: '180px'}}
            />
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{...styles.input, width: '160px'}}>
              <option value="">Visi mēneši</option>
              {sortedMonths.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={exportInvoicesToCSV} style={{...styles.btnSmall, background: '#10b981', color: 'white', padding: '10px 15px'}}>📊 Eksportēt CSV</button>
          </div>
        </div>

        {selectedInvoices.size > 0 && (
          <div style={{marginBottom: '20px', padding: '15px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontWeight: '600', color: '#1e40af'}}>Izvēlēti {selectedInvoices.size} rēķini</span>
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={() => regenerateInvoices(Array.from(selectedInvoices))} style={{...styles.btnSmall, background: '#f59e0b', color: 'white'}}>🔄 Reģenerēt</button>
              <button onClick={() => deleteInvoices(Array.from(selectedInvoices))} style={{...styles.btnSmall, background: '#ef4444', color: 'white'}}>🗑️ Dzēst</button>
              <button onClick={() => setSelectedInvoices(new Set())} style={{...styles.btnSmall, background: '#64748b', color: 'white'}}>Atcelt</button>
            </div>
          </div>
        )}

        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'separate', borderSpacing: '0', fontSize: '14px'}}>
            <thead>
              <tr style={{background: '#f8fafc'}}>
                <th style={{padding: '16px', textAlign: 'left', borderBottom: '2px solid #e2e8f0'}}><input type="checkbox" onChange={(e) => {
                  if (e.target.checked) handleSelectAllInMonth(filterMonth);
                  else setSelectedInvoices(new Set());
                }} /></th>
                <th style={{padding: '16px', textAlign: 'left', borderBottom: '2px solid #e2e8f0'}}>Rēķins</th>
                <th style={{padding: '16px', textAlign: 'center', borderBottom: '2px solid #e2e8f0'}}>Dzīv.</th>
                <th style={{padding: '16px', textAlign: 'right', borderBottom: '2px solid #e2e8f0'}}>Summa</th>
                <th style={{padding: '16px', textAlign: 'center', borderBottom: '2px solid #e2e8f0'}}>Pārmaksa</th>
                <th style={{padding: '16px', textAlign: 'center', borderBottom: '2px solid #e2e8f0'}}>Statuss</th>
                <th style={{padding: '16px', textAlign: 'center', borderBottom: '2px solid #e2e8f0'}}>Darbības</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const apt = apartments.find(a => a.id === invoice.apartment_id);
                const status = getInvoiceStatus(invoice);
                const isEditing = editingOverpaymentId === invoice.id;

                return (
                  <tr key={invoice.id} style={{
                    background: selectedInvoices.has(invoice.id) ? '#f0f9ff' : 'white',
                    transition: 'background 0.2s'
                  }}>
                    <td style={{padding: '14px', borderBottom: '1px solid #f1f5f9'}}>
                      <input 
                        type="checkbox" 
                        checked={selectedInvoices.has(invoice.id)}
                        onChange={(e) => {
                          const next = new Set(selectedInvoices);
                          if (e.target.checked) next.add(invoice.id);
                          else next.delete(invoice.id);
                          setSelectedInvoices(next);
                        }}
                      />
                    </td>
                    <td style={{padding: '14px', borderBottom: '1px solid #f1f5f9', fontWeight: '500'}}>{invoice.invoice_number}</td>
                    <td style={{padding: '14px', textAlign: 'center', borderBottom: '1px solid #f1f5f9'}}>{apt?.number}</td>
                    <td style={{padding: '14px', textAlign: 'right', fontWeight: '700', borderBottom: '1px solid #f1f5f9'}}>€{invoice.amount.toFixed(2)}</td>
                    
                    <td style={{padding: '14px', textAlign: 'center', borderBottom: '1px solid #f1f5f9'}}>
                      {isEditing ? (
                        <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                          <input 
                            type="number" 
                            value={editingOverpaymentAmount} 
                            onChange={(e) => setEditingOverpaymentAmount(e.target.value)} 
                            style={{width: '60px', padding: '4px', border: '1px solid #3b82f6', borderRadius: '4px'}}
                          />
                          <button onClick={() => {
                            updateOverpayment(invoice.id, parseFloat(editingOverpaymentAmount));
                            setEditingOverpaymentId(null);
                          }} style={{...styles.btnSmall, background: '#10b981', color: 'white'}}>✓</button>
                        </div>
                      ) : (
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                          <span style={{color: invoice.overpayment_amount > 0 ? '#10b981' : '#94a3b8', fontWeight: '600'}}>
                            €{invoice.overpayment_amount?.toFixed(2) || '0.00'}
                          </span>
                          <button onClick={() => {
                            setEditingOverpaymentId(invoice.id);
                            setEditingOverpaymentAmount(invoice.overpayment_amount || 0);
                          }} style={{border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5}}>✎</button>
                        </div>
                      )}
                    </td>

                    <td style={{padding: '14px', textAlign: 'center', borderBottom: '1px solid #f1f5f9'}}>
                      <span style={{
                        background: status.color, 
                        color: 'white', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {status.status}
                      </span>
                    </td>
                    <td style={{padding: '14px', textAlign: 'center', borderBottom: '1px solid #f1f5f9'}}>
                      <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                        <button onClick={() => toggleInvoicePaid(invoice.id, invoice.paid)} style={{...styles.btnSmall, background: invoice.paid ? '#10b981' : '#f59e0b', color: 'white'}}>
                          {invoice.paid ? 'Apmaksāts' : 'Apmaksāt'}
                        </button>
                        <button onClick={() => handleGeneratePDF(invoice)} style={{...styles.btnSmall, background: '#334155', color: 'white'}} title="Lejupielādēt PDF">📥 PDF</button>
                        <button onClick={() => regenerateInvoice(invoice)} style={{...styles.btnSmall, background: '#6366f1', color: 'white'}}>🔄</button>
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

      {/* ===== PIEZĪMES UN PĀRMAKSU SKATS ===== */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '32px'}}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📝 Parādu piezīmes</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {invoices.filter(i => i.previous_debt_amount > 0).slice(0, 5).map(inv => (
                <div key={inv.id} style={{padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{fontSize: '13px'}}>
                    <strong style={{color: '#1e293b'}}>Dz. {apartments.find(a => a.id === inv.apartment_id)?.number}:</strong> 
                    <span style={{color: '#64748b', marginLeft: '8px'}}>{inv.previous_debt_note || 'Nav piezīmju'}</span>
                  </div>
                  <button onClick={() => setDebtNoteForm({ invoiceId: inv.id, note: inv.previous_debt_note || '' })} style={{color: '#2563eb', fontSize: '12px', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer'}}>Labot</button>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>💰 Pārmaksu kontrole</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {invoices.filter(i => i.overpayment_amount > 0).slice(0, 5).map(inv => (
                <div key={inv.id} style={{padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontSize: '13px', fontWeight: '500'}}>Dz. {apartments.find(a => a.id === inv.apartment_id)?.number} ({inv.period})</span>
                  <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                    <span style={{fontWeight: '700', color: '#10b981'}}>€{inv.overpayment_amount.toFixed(2)}</span>
                    <button onClick={() => deleteOverpayment(inv.id)} style={{...styles.btnSmall, background: '#fee2e2', color: '#ef4444'}}>Dzēst</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
}