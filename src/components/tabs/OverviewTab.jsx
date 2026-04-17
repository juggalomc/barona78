import React from 'react';
import { styles } from '../shared/styles';

export function OverviewTab({ apartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs }) {
  // Aprēķinām kopējo parādu, saskaitot katra dzīvokļa jaunāko neapmaksāto rēķinu
  const totalDebt = apartments.reduce((sum, apt) => {
    const aptInvoices = invoices.filter(inv => inv.apartment_id === apt.id && !inv.paid);
    if (aptInvoices.length === 0) return sum;
    const latest = aptInvoices.reduce((prev, curr) => prev.period > curr.period ? prev : curr);
    return sum + latest.amount;
  }, 0);

  // Kopējā rēķinu summa (tīrā statistika bez parāda pārcelšanas būtu sarežģītāka, 
  // šeit rādām visu rēķinu summu, bet parāda sadaļa ir precizēta)
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Aktuālā mēneša datu kopsavilkums (ņemam jaunāko rēķinu periodu)
  const latestPeriod = invoices.length > 0 ? invoices[0].period : null;
  
  const monthlyStats = latestPeriod ? {
    period: latestPeriod,
    // Summa, ko māja maksā pakalpojumu sniedzējiem (tarifu ievadītās kopsummas)
    expectedTotal: (
      tariffs.filter(t => t.period === latestPeriod).reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0) +
      (wasteTariffs.find(w => w.period === latestPeriod)?.total_amount || 0)
    ),
    // Summa, kas faktiski ir izrakstīta iedzīvotājiem (ieskaitot ūdeni un PVN)
    actualInvoiced: invoices.filter(inv => inv.period === latestPeriod).reduce((sum, inv) => sum + inv.amount, 0),
    // Tikai pakalpojumu daļa bez parādiem un pārmaksām (lai salīdzinātu ar expected)
    serviceInvoiced: invoices.filter(inv => inv.period === latestPeriod).reduce((sum, inv) => {
      const details = JSON.parse(inv.invoice_details || '[]');
      return sum + details.filter(d => ['tariff', 'waste'].includes(d.type)).reduce((s, d) => s + (d.amount_without_vat + d.vat_amount), 0);
    }, 0)
  } : null;

  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{apartments.length}</div>
          <div style={styles.statLabel}>Dzīvokļi</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{tariffs.length}</div>
          <div style={styles.statLabel}>Tarifi</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statValue}>{invoices.length}</div>
          <div style={styles.statLabel}>Rēķini</div>
        </div>
        <div style={{...styles.stat, background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'}}>
          <div style={styles.statValue}>€{totalDebt.toFixed(2)}</div>
          <div style={styles.statLabel}>Parāds</div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>💳 Kopsavilkums</h2>
        
        {monthlyStats && (
          <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mēneša kopsavilkums: {monthlyStats.period}</div>
              <div style={{ display: 'flex', gap: '40px', marginTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Sagaidāmā summa (Tarifi)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#334155' }}>€{monthlyStats.expectedTotal.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Izrakstīts iedzīvotājiem (Kopā)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#003399' }}>€{monthlyStats.actualInvoiced.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div style={{ width: '1px', background: '#e2e8f0' }}></div>
            <div style={{ flex: 1, paddingLeft: '10px' }}>
               <div style={{ fontSize: '11px', color: '#64748b' }}>Starpība (Sagaidāmais vs Pakalpojumi)</div>
               <div style={{ fontSize: '20px', fontWeight: 'bold', color: Math.abs(monthlyStats.expectedTotal - monthlyStats.serviceInvoiced) < 0.1 ? '#10b981' : '#f59e0b' }}>
                 €{(monthlyStats.serviceInvoiced - monthlyStats.expectedTotal).toFixed(2)}
                 <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '8px' }}>
                   {Math.abs(monthlyStats.expectedTotal - monthlyStats.serviceInvoiced) < 0.1 ? '✅ Sakrīt' : '⚠️ Nesakrīt'}
                 </span>
               </div>
            </div>
          </div>
        )}

        {totalDebt > 0 && (
          <div style={{background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '15px', marginBottom: '15px', color: '#991b1b'}}>
            <div style={{fontWeight: 'bold', marginBottom: '8px'}}>⚠️ SVARĪGI - Ir parāds!</div>
            <div style={{fontSize: '13px'}}>
              Kopā parāds: <strong>€{totalDebt.toFixed(2)}</strong><br/>
              Dzīvokļu skaits ar parādu: <strong>{invoices.filter(i => !i.paid && new Date(i.due_date) <= new Date()).map(i => i.apartment_id).filter((v, i, a) => a.indexOf(v) === i).length}</strong>
            </div>
          </div>
        )}
        
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>Kopā apmaksāt</div>
            <div style={{fontSize: '24px', fontWeight: 'bold', color: '#0066cc'}}>€{totalAmount.toFixed(2)}</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>Apmaksāts</div>
            <div style={{fontSize: '24px', fontWeight: 'bold', color: '#10b981'}}>€{(totalAmount - totalDebt).toFixed(2)}</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>Parāds</div>
            <div style={{fontSize: '24px', fontWeight: 'bold', color: '#ff6b6b'}}>€{totalDebt.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📊 Rēķinu statusi</h2>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>✓ Apmaksāti</div>
            <div style={{fontSize: '20px', fontWeight: 'bold', color: '#10b981'}}>{invoices.filter(i => i.paid).length}</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>⏳ Gaida atmaksu</div>
            <div style={{fontSize: '20px', fontWeight: 'bold', color: '#f59e0b'}}>{invoices.filter(i => !i.paid && new Date(i.due_date) > new Date()).length}</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>⚠️ Parāds</div>
            <div style={{fontSize: '20px', fontWeight: 'bold', color: '#ef4444'}}>{invoices.filter(i => !i.paid && new Date(i.due_date) <= new Date()).length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
