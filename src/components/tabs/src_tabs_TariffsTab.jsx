import React from 'react';
import { TOTAL_AREA } from '../shared/constants';
import { styles } from '../shared/styles';

export function TariffsTab({
  tariffs,
  tariffPeriod, setTariffPeriod,
  tariffForm, setTariffForm,
  editingTariff, setEditingTariff,
  editForm, setEditForm,
  copySourceMonth, setCopySourceMonth,
  selectedTariffsToCopy, setSelectedTariffsToCopy,
  uniqueTariffPeriods,
  addTariff,
  startEditTariff,
  saveEditTariff,
  deleteTariff,
  copySelectedTariffs
}) {
  return (
    <div style={styles.twoCol}>
      {/* PIEVIENOT TARIFU */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>➕ Pievienot tarifu</h2>
        <form onSubmit={addTariff} style={styles.form}>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500'}}>Periods</label>
            <input type="month" value={tariffPeriod} onChange={(e) => setTariffPeriod(e.target.value)} style={styles.input} />
          </div>
          <input type="text" placeholder="Nosaukums *" value={tariffForm.name} onChange={(e) => setTariffForm({...tariffForm, name: e.target.value})} style={styles.input} />
          <input type="number" step="0.01" placeholder="Summa mājai (€) *" value={tariffForm.total_amount} onChange={(e) => setTariffForm({...tariffForm, total_amount: e.target.value})} style={styles.input} />
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500'}}>PVN (%) - 0 ja bez PVN</label>
            <input type="number" step="0.01" placeholder="PVN %" value={tariffForm.vat_rate} onChange={(e) => setTariffForm({...tariffForm, vat_rate: e.target.value})} style={styles.input} />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#f9fafb', borderRadius: '4px'}}>
            <input type="checkbox" checked={tariffForm.include_in_invoice} onChange={(e) => setTariffForm({...tariffForm, include_in_invoice: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
            <label style={{fontSize: '13px', color: '#333', cursor: 'pointer', margin: 0}}>Iekļaut rēķinā</label>
          </div>
          <button type="submit" style={styles.btn}>Pievienot</button>
        </form>
      </div>

      {/* TARIFI PA MĒNEŠIEM */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>💰 Tarifi pa mēnešiem</h2>
        
        {copySourceMonth && (
          <div style={{background: '#fef3c7', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px'}}>
            <div style={{marginBottom: '10px'}}>📋 Kopēšanas režīms - atlasiet tarifus no <strong>{new Date(copySourceMonth + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</strong></div>
            <button onClick={() => copySelectedTariffs(tariffs, copySourceMonth, tariffPeriod)} style={{...styles.btn, fontSize: '12px', padding: '8px 12px', marginRight: '8px'}}>✓ Kopēt atlasītos</button>
            <button onClick={() => {setCopySourceMonth(null); setSelectedTariffsToCopy({});}} style={{background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>✕ Atcelt</button>
          </div>
        )}

        {uniqueTariffPeriods.map(period => {
          const periodTariffs = tariffs.filter(t => t.period === period);

          return (
            <div key={period} style={{marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <div style={{fontWeight: 'bold', fontSize: '14px'}}>📅 {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</div>
                <button onClick={() => setCopySourceMonth(copySourceMonth === period ? null : period)} style={{...styles.btnSmall, fontSize: '12px', padding: '4px 8px', background: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontWeight: '500'}} title="Kopēt tarifus">📋 {copySourceMonth === period ? 'Atcelt' : 'Kopēt'}</button>
              </div>
              
              {periodTariffs.map(tar => {
                const pricePerSqm = parseFloat(tar.total_amount) / TOTAL_AREA;
                const isEditing = editingTariff === tar.id;

                return (
                  <div key={tar.id} style={{...styles.listItem, marginBottom: '8px', display: 'flex', gap: '8px'}}>
                    {copySourceMonth === period && (
                      <input type="checkbox" checked={selectedTariffsToCopy[tar.id] || false} onChange={(e) => setSelectedTariffsToCopy({...selectedTariffsToCopy, [tar.id]: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer', minWidth: '18px'}} />
                    )}
                    
                    {isEditing ? (
                      <div style={{flex: 1, display: 'flex', gap: '8px', flexDirection: 'column'}}>
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                          <input type="number" step="0.01" value={editForm.total_amount} onChange={(e) => setEditForm({...editForm, total_amount: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                          <input type="number" step="0.01" placeholder="PVN %" value={editForm.vat_rate} onChange={(e) => setEditForm({...editForm, vat_rate: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: '#f9fafb', borderRadius: '4px'}}>
                          <input type="checkbox" checked={editForm.include_in_invoice !== false} onChange={(e) => setEditForm({...editForm, include_in_invoice: e.target.checked})} style={{width: '16px', height: '16px', cursor: 'pointer'}} />
                          <label style={{fontSize: '12px', color: '#333', cursor: 'pointer', margin: 0}}>Iekļaut rēķinā</label>
                        </div>
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button onClick={() => saveEditTariff(tar.id)} style={{...styles.btn, fontSize: '11px', padding: '6px 12px', flex: 1}}>✓ Saglabāt</button>
                          <button onClick={() => setEditingTariff(null)} style={{background: '#e5e7eb', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flex: 1}}>Atcelt</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{flex: 1}}>
                        <div style={{fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                          {tar.name}
                          <span style={{fontSize: '10px', padding: '2px 6px', borderRadius: '3px', backgroundColor: tar.include_in_invoice !== false ? '#dcfce7' : '#fee2e2', color: tar.include_in_invoice !== false ? '#166534' : '#991b1b', fontWeight: '500'}}>
                            {tar.include_in_invoice !== false ? '✓ Iekļaut' : '✕ Neiekļaut'}
                          </span>
                        </div>
                        <div style={{fontSize: '12px', color: '#666'}}>
                          €{parseFloat(tar.total_amount).toFixed(2)} • €{pricePerSqm.toFixed(4)}/m²
                          {tar.vat_rate > 0 && ` • PVN: ${tar.vat_rate}%`}
                        </div>
                      </div>
                    )}
                    
                    {!isEditing && (
                      <div style={{display: 'flex', gap: '4px'}}>
                        <button onClick={() => startEditTariff(tar)} style={{...styles.btnSmall, padding: '4px 8px'}} title="Rediģēt">✏️</button>
                        <button onClick={() => deleteTariff(tar.id)} style={{...styles.btnSmall, padding: '4px 8px'}} title="Dzēst">🗑️</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
