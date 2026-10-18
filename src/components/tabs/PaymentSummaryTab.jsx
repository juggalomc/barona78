import React, { useState } from 'react';
import { calculatePositionPayments } from '../../utils/summaryCalculations';
import { CreditCard, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';

const styles = {
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
    border: '1px solid #e2e8f0',
    marginBottom: '24px'
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  input: {
    padding: '9px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '13.5px',
    color: '#0f172a',
    background: '#ffffff',
    fontWeight: '500'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13.5px'
  },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '12.5px'
  },
  td: {
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9',
    color: '#1e293b'
  }
};

export function PaymentSummaryTab({ invoices, uniqueTariffPeriods }) {
  const [period, setPeriod] = useState(uniqueTariffPeriods[0] || '');
  const data = calculatePositionPayments(period, invoices);

  const totalInvoiced = data.reduce((sum, row) => sum + row.invoiced, 0);
  const totalPaid = data.reduce((sum, row) => sum + row.paid, 0);
  const overallPct = totalInvoiced > 0 ? (totalPaid / totalInvoiced * 100).toFixed(1) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top summary card */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 style={styles.title}>
              <CreditCard size={18} style={{ color: '#2563eb' }} />
              Maksājumu saņemšana pa pozīcijām
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Aprēķinātie un faktiski saņemtie maksājumi par izvēlēto mēnesi
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={15} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Periods:</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={styles.input}>
              {uniqueTariffPeriods.map(p => (
                <option key={p} value={p}>
                  {new Date(p + '-01').toLocaleDateString('lv-LV', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick summary stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>Kopā izrakstīts</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              €{totalInvoiced.toFixed(2)}
            </div>
          </div>

          <div style={{ padding: '14px 18px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px', fontWeight: '500' }}>Faktiski saņemts</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
              €{totalPaid.toFixed(2)}
            </div>
          </div>

          <div style={{ padding: '14px 18px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px', fontWeight: '500' }}>Apmaksas procents</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>
              {overallPct}%
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={styles.table}>
            <thead style={{ background: '#f8fafc' }}>
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
                const isComplete = parseFloat(pct) >= 99.9;

                return (
                  <tr key={i} style={{ transition: 'background 0.15s' }}>
                    <td style={{ ...styles.td, fontWeight: '600', color: '#0f172a' }}>{row.name}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      €{row.invoiced.toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#15803d', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                      €{row.paid.toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: isComplete ? '#dcfce7' : '#fee2e2',
                        color: isComplete ? '#15803d' : '#b91c1c',
                        fontSize: '12px',
                        fontWeight: '600',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#f8fafc', fontWeight: '700', borderTop: '2px solid #e2e8f0' }}>
                <td style={{ ...styles.td, color: '#0f172a' }}>KOPĀ</td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  €{totalInvoiced.toFixed(2)}
                </td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                  €{totalPaid.toFixed(2)}
                </td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {overallPct}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}