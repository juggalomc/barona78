import React, { useState } from 'react';
import { styles } from '../shared/styles';

export function InvoicesTab({
  invoices,
  apartments,
  tariffs,
  waterTariffs,
  meterReadings,
  uniqueTariffPeriods,
  getInvoiceStatus,
  showToast,
  generateInvoiceForApartment,
  sendInvoicesByEmail,
  regenerateInvoice,
  deleteInvoice,
  deleteInvoices,
  regenerateInvoices,
  downloadPDF,
  viewAsHTML,
  toggleInvoicePaid,
  openReminderModal,
  sendAllReminders,
  invoiceMonth, setInvoiceMonth,
  invoiceFromDate, setInvoiceFromDate,
  invoiceToDate, setInvoiceToDate,
  generateInvoices
}) {
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  // Grupējam rēķinus pa mēnešiem
  const invoicesByMonth = invoices.reduce((acc, inv) => {
    const month = inv.period;
    if (!acc[month]) acc[month] = [];
    acc[month].push(inv);
    return acc;
  }, {});

  const sortedMonths = Object.keys(invoicesByMonth).sort().reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ĢENERĒŠANAS PANELIS */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>⚙️ Rēķinu ģenerēšana</h2>
        <form onSubmit={(e) => generateInvoices(e, tariffs.filter(t => t.period === invoiceMonth), invoiceMonth, {})} style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '5px' }}>Periods</label>
            <select 
              value={invoiceMonth} 
              onChange={(e) => setInvoiceMonth(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', minWidth: '150px' }}
            >
              <option value="">-- Izvēlieties --</option>
              {uniqueTariffPeriods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '5px' }}>No</label>
            <input type="date" value={invoiceFromDate} onChange={(e) => setInvoiceFromDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '5px' }}>Līdz</label>
            <input type="date" value={invoiceToDate} onChange={(e) => setInvoiceToDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <button type="submit" style={{ padding: '8px 20px', background: '#003399', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            🚀 Ģenerēt visiem
          </button>
        </form>
      </div>

      {/* SARAKSTS PA MĒNEŠIEM */}
      {sortedMonths.map(period => (
        <div key={period} style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#334155' }}>📅 {period} ({invoicesByMonth[period].length})</h3>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={(e) => sendInvoicesByEmail(e, `period-${period}`)}
                style={{ padding: '6px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                📧 Izsūtīt visus rēķinus ({invoicesByMonth[period].length})
              </button>
              <button 
                onClick={() => sendAllReminders()}
                style={{ padding: '6px 12px', background: '#d97706', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                🔔 Sūtīt atgādinājumus kavētājiem
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {invoicesByMonth[period].map(inv => {
              const apt = apartments.find(a => a.id === inv.apartment_id);
              const status = getInvoiceStatus(inv);
              
              return (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                      {inv.invoice_number} 
                      <span style={{ marginLeft: '10px', fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: status.color, color: 'white' }}>{status.emoji} {status.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Dzīv. {apt?.number} • {apt?.owner_name} • €{inv.amount.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={(e) => sendInvoicesByEmail(e, inv.id)} 
                      title="Nosūtīt e-pastā"
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      📧
                    </button>
                    <button 
                      onClick={() => viewAsHTML(inv)} 
                      title="Skatīt"
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      👁️
                    </button>
                    <button 
                      onClick={() => downloadPDF(inv)} 
                      title="Lejuplādēt PDF"
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      📥
                    </button>
                    <button 
                      onClick={() => regenerateInvoice(inv)} 
                      title="Pārrēķināt"
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      🔄
                    </button>
                    <button 
                      onClick={() => toggleInvoicePaid(inv.id, inv.paid)} 
                      title={inv.paid ? "Atzīmēt kā neapmaksātu" : "Atzīmēt kā apmaksātu"}
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: inv.paid ? '#dcfce7' : 'white', border: inv.paid ? '1px solid #16a34a' : '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: inv.paid ? '#16a34a' : '#64748b' }}
                    >
                      {inv.paid ? '✓' : '€'}
                    </button>
                    <button 
                      onClick={() => deleteInvoice(inv.id)} 
                      title="Dzēst"
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', color: '#dc2626' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {sortedMonths.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          Nav ģenerētu rēķinu. Izvēlieties periodu augstāk un nospiediet "Ģenerēt".
        </div>
      )}
    </div>
  );
}