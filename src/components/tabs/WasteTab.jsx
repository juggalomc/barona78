import React from 'react';
import { styles } from '../shared/styles';

export function WasteTab({
  wasteTariffs,
  uniqueTariffPeriods,
  tariffPeriod,
  setTariffPeriod,
  wasteTariffForm,
  setWasteTariffForm,
  saveWasteTariff,
  calculateWasteDistribution
}) {
  const { distribution, total, tariff } = calculateWasteDistribution(wasteTariffs, tariffPeriod);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. SADAĻA: PERIODS UN TARIFS */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={styles.cardTitle}>♻️ Atkritumu izvešana</h2>
          <select
            value={tariffPeriod}
            onChange={(e) => {
              setTariffPeriod(e.target.value);
              setWasteTariffForm(prev => ({ ...prev, period: e.target.value }));
            }}
            style={styles.input}
          >
            {uniqueTariffPeriods.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <form onSubmit={saveWasteTariff} style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d', marginBottom: '10px', marginTop: 0 }}>Tarifa iestatījumi ({tariffPeriod})</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Kopējā rēķina summa (€ bez PVN)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Kopā €"
                value={wasteTariffForm.total_amount}
                onChange={(e) => setWasteTariffForm({ ...wasteTariffForm, total_amount: e.target.value })}
                style={{ ...styles.input, borderColor: '#86efac' }}
              />
            </div>
            <div style={{ width: '100px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>PVN (%)</label>
              <input
                type="number"
                step="0.01"
                placeholder="%"
                value={wasteTariffForm.vat_rate}
                onChange={(e) => setWasteTariffForm({ ...wasteTariffForm, vat_rate: e.target.value })}
                style={{ ...styles.input, borderColor: '#86efac' }}
              />
            </div>
            <button type="submit" style={{ ...styles.btn, background: '#16a34a', height: '42px' }}>Saglabāt</button>
          </div>
        </form>
      </div>

      {/* 2. SADAĻA: SADALĪJUMS */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📊 Sadalījums pa dzīvokļiem</h2>
        
        {!tariff ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Šim periodam nav ievadīts tarifs. Ievadiet summu augstāk.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '15px', fontSize: '13px', color: '#333', background: '#f9fafb', padding: '10px', borderRadius: '6px' }}>
              Kopā deklarētas personas: <strong>{total}</strong> • 
              Maksa par personu: <strong>€{total > 0 ? (parseFloat(tariff.total_amount) / total).toFixed(4) : '0.0000'}</strong> (bez PVN)
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Dzīvoklis</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Personas</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Summa (bez PVN)</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>PVN</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>Kopā</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.map((item, index) => (
                    <tr key={item.apartment.id} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ padding: '10px' }}><strong>{item.apartment.number}</strong> <span style={{color:'#666', fontSize:'11px'}}>({item.apartment.owner_name})</span></td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{item.declaredPersons}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>€{item.shareAmount.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#666' }}>€{item.shareVat.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>€{item.shareTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
