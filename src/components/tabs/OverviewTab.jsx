import React from 'react';
import { styles } from '../shared/styles';

export function OverviewTab({ apartments, tariffs, invoices }) {
  const totalDebt = invoices
    .filter(inv => !inv.paid)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

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
