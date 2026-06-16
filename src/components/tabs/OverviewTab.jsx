import React, { useState, useMemo } from 'react';
import { styles } from '../shared/styles';
import { calculateMonthlySummary } from '../../utils/summaryCalculations';

export function OverviewTab({ apartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs, waterConsumption }) {
  // Aprēķinām reālo kopējo parādu, ņemot vērā jau samaksātās summas
  const { totalDebt, apartmentsWithDebt } = useMemo(() => {
    let debt = 0;
    const apts = new Set();
    
    apartments.forEach(apt => {
      const aptInvoices = invoices.filter(inv => inv.apartment_id === apt.id && !inv.paid);
      if (aptInvoices.length === 0) return;
      
      // Ņemam jaunāko rēķinu katram dzīvokļu
      const latest = aptInvoices.reduce((prev, curr) => prev.period > curr.period ? prev : curr);
      
      // Aprēķinām reālo parādu: summa - samaksāts
      const realDebt = (parseFloat(latest.amount) || 0) - (parseFloat(latest.paid_amount) || 0);
      if (realDebt > 0.01) {
        debt += realDebt;
        apts.add(apt.id);
      }
    });
    
    return { totalDebt: debt, apartmentsWithDebt: apts.size };
  }, [apartments, invoices]);

  // Iegūstam visus unikālos periodus no rēķiniem sakārtotā secībā
  const periods = useMemo(() => {
    const p = [...new Set(invoices.map(inv => inv.period))].sort().reverse();
    return p.length > 0 ? p : [new Date().toISOString().slice(0, 7)];
  }, [invoices]);

  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);

  const summary = useMemo(() => 
    calculateMonthlySummary(selectedPeriod, invoices, apartments, tariffs, wasteTariffs, waterTariffs, hotWaterTariffs, waterConsumption),
    [selectedPeriod, invoices, apartments, tariffs, wasteTariffs, waterTariffs, hotWaterTariffs, waterConsumption]
  );

  const formatCurrency = (val) => `€${(val || 0).toFixed(2)}`;

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
        <div style={{...styles.stat, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
          <div style={styles.statValue}>{invoices.filter(i => i.paid).length}</div>
          <div style={styles.statLabel}>Apmaksāti</div>
        </div>
      </div>

      {totalDebt > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fee2e2 0%, #fed7d7 100%)',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '30px',
          color: '#7f1d1d',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
            <div style={{fontSize: '28px'}}>⚠️</div>
            <div style={{fontWeight: 'bold', fontSize: '18px', color: '#991b1b'}}>SVARĪGI - Ir parāds!</div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px'}}>
            <div style={{background: 'rgba(255,255,255,0.6)', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fca5a5'}}>
              <div style={{color: '#991b1b', fontSize: '12px', marginBottom: '4px', fontWeight: '500'}}>Kopā parāds:</div>
              <div style={{fontSize: '20px', fontWeight: 'bold', color: '#991b1b'}}>{formatCurrency(totalDebt)}</div>
            </div>
            <div style={{background: 'rgba(255,255,255,0.6)', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fca5a5'}}>
              <div style={{color: '#991b1b', fontSize: '12px', marginBottom: '4px', fontWeight: '500'}}>Dzīvokļi ar parādu:</div>
              <div style={{fontSize: '20px', fontWeight: 'bold', color: '#991b1b'}}>{apartmentsWithDebt}</div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h2 style={{ ...styles.cardTitle, margin: 0 }}>📊 Detalizēts salīdzinājums</h2>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '500' }}
          >
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {summary.rows && summary.rows.map((row, idx) => {
            const maxVal = Math.max(row.calculated, row.invoiced, 1);
            const calcWidth = (row.calculated / maxVal) * 100;
            const invWidth = (row.invoiced / maxVal) * 100;
            const diff = row.invoiced - row.calculated;

            return (
              <div key={idx} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{row.label} <span style={{fontWeight: 'normal', fontSize: '11px', color: '#94a3b8'}}>(bez PVN)</span></span>
                  <span style={{ fontSize: '12px', color: Math.abs(diff) > 0.05 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                    {Math.abs(diff) > 0.05 ? `Starpība: ${formatCurrency(diff)}` : '✅ Sakrīt'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Aprēķinātais stabiņš */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '100px', fontSize: '11px', color: '#64748b' }}>Aprēķināts:</div>
                    <div style={{ flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${calcWidth}%`, height: '100%', background: '#94a3b8', transition: 'width 0.3s' }}></div>
                    </div>
                    <div style={{ width: '70px', textAlign: 'right', fontSize: '12px', fontWeight: '500' }}>{formatCurrency(row.calculated)}</div>
                  </div>

                  {/* Izrakstītais stabiņš */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '100px', fontSize: '11px', color: '#64748b' }}>Izrakstīts:</div>
                    <div style={{ flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${invWidth}%`, height: '100%', background: row.color, transition: 'width 0.3s' }}></div>
                    </div>
                    <div style={{ width: '70px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>{formatCurrency(row.invoiced)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#1e293b' }}>KOPĀ (bez PVN):</span>
          <div style={{ display: 'flex', gap: '20px', fontWeight: 'bold' }}>
            <div style={{ color: '#64748b', fontSize: '13px' }}>
              Aprēķināts: {formatCurrency(summary.total?.calculated)}
            </div>
            <div style={{ color: '#1e40af', fontSize: '14px' }}>
              Izrakstīts: {formatCurrency(summary.total?.invoiced)}
            </div>
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
