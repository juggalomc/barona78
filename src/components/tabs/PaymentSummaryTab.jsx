import React, { useState } from 'react';
import { calculatePositionPayments } from '../../utils/summaryCalculations';

const styles = {
  card: { background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '1px solid #e2e8f0' },
  title: { fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '15px' },
  input: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', marginBottom: '15px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#64748b' },
  td: { padding: '12px', borderBottom: '1px solid #f1f5f9' }
};

export function PaymentSummaryTab({ invoices, uniqueTariffPeriods }) {
  const [period, setPeriod] = useState(uniqueTariffPeriods[0] || '');
  const data = calculatePositionPayments(period, invoices);

  const totalInvoiced = data.reduce((sum, row) => sum + row.invoiced, 0);
  const totalPaid = data.reduce((sum, row) => sum + row.paid, 0);

  return (
    <div style={{ padding: '20px' }}>
      <div style={styles.card}>
        <h2 style={styles.title}>📊 Maksājumu saņemšana pa pozīcijām</h2>
        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Izvēlēties periodu</label>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={styles.input}>
          {uniqueTariffPeriods.map(p => (
            <option key={p} value={p}>{new Date(p + '-01').toLocaleDateString('lv-LV', { month: 'long', year: 'numeric' })}</option>
          ))}
        </select>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Pozīcija</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Kopā izrakstīts (ar PVN)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Faktiski apmaksāts</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Procents</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const pct = row.invoiced > 0 ? (row.paid / row.invoiced * 100).toFixed(1) : 0;
                return (
                  <tr key={i}>
                    <td style={{ ...styles.td, fontWeight: '600' }}>{row.name}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>€{row.invoiced.toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>€{row.paid.toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', background: parseFloat(pct) === 100 ? '#dcfce7' : '#fee2e2', color: parseFloat(pct) === 100 ? '#166534' : '#991b1b', fontSize: '12px' }}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                <td style={styles.td}>KOPĀ</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>€{totalInvoiced.toFixed(2)}</td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#10b981' }}>€{totalPaid.toFixed(2)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  {totalInvoiced > 0 ? (totalPaid / totalInvoiced * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}