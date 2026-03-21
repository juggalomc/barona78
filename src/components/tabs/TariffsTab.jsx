import React, { useState, useEffect } from 'react';
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
  const [targetMonth, setTargetMonth] = useState('');

  useEffect(() => {
    if (copySourceMonth) {
      // Pēc noklusējuma piedāvājam nākamo mēnesi
      const [y, m] = copySourceMonth.split('-').map(Number);
      const nextDate = new Date(y, m, 1); // JS mēneši Date objektā sākas no 0, bet šeit m ir 1-based no split, tāpēc tas efektīvi ir +1 mēnesis
      const nextMonthStr = nextDate.toISOString().slice(0, 7);
      setTargetMonth(nextMonthStr);
    }
  }, [copySourceMonth]);

  const handleCopyExecute = () => {
    if (!targetMonth) {
      alert('Izvēlieties mērķa mēnesi');
      return;
    }
    copySelectedTariffs(tariffs, copySourceMonth, targetMonth);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
      {/* PIEVIENOT TARIFU */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ ...styles.cardTitle, margin: 0 }}>➕ Pievienot jaunu tarifu</h2>
        </div>
        
        <form onSubmit={addTariff} style={{ ...styles.form, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Periods</label>
            <input type="month" value={tariffPeriod} onChange={(e) => setTariffPeriod(e.target.value)} style={{ ...styles.input, width: '100%' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Nosaukums *</label>
            <input type="text" placeholder="Piem., Apsaimniekošana" value={tariffForm.name} onChange={(e) => setTariffForm({...tariffForm, name: e.target.value})} style={{ ...styles.input, width: '100%' }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>{tariffForm.is_per_m2 ? 'Cena par m² (€) *' : 'Summa mājai (€) *'}</label>
               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <input type="checkbox" checked={tariffForm.is_per_m2} onChange={(e) => setTariffForm({...tariffForm, is_per_m2: e.target.checked})} style={{ width: '12px', height: '12px', cursor: 'pointer' }} />
                 <span style={{ fontSize: '10px', color: '#666' }}>Ievadīt m² cenu</span>
               </div>
            </div>
            {tariffForm.is_per_m2 ? (
              <input type="number" step="0.0001" placeholder="0.0000" value={tariffForm.price_per_m2} onChange={(e) => setTariffForm({...tariffForm, price_per_m2: e.target.value})} style={{ ...styles.input, width: '100%' }} />
            ) : (
              <input type="number" step="0.01" placeholder="0.00" value={tariffForm.total_amount} onChange={(e) => setTariffForm({...tariffForm, total_amount: e.target.value})} style={{ ...styles.input, width: '100%' }} />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>PVN (%)</label>
            <input type="number" step="0.01" placeholder="0" value={tariffForm.vat_rate} onChange={(e) => setTariffForm({...tariffForm, vat_rate: e.target.value})} style={{ ...styles.input, width: '100%' }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '42px' }}>
             <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', height: '100%', boxSizing: 'border-box' }}>
              <input type="checkbox" checked={tariffForm.include_in_invoice} onChange={(e) => setTariffForm({...tariffForm, include_in_invoice: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
              <label style={{fontSize: '13px', color: '#333', cursor: 'pointer', margin: 0, whiteSpace: 'nowrap'}}>Iekļaut rēķinā</label>
            </div>
            <button type="submit" style={{ ...styles.btn, background: '#10b981', height: '100%' }}>➕ Pievienot</button>
          </div>
        </form>
      </div>

      {/* TARIFI PA MĒNEŠIEM */}
      <div style={styles.card}>
        <h2 style={{ ...styles.cardTitle, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>💰 Tarifi pa mēnešiem</h2>
        
        {copySourceMonth && (
          <div style={{ position: 'sticky', top: '20px', zIndex: 50, background: '#fffbeb', padding: '20px', borderRadius: '8px', border: '1px solid #fcd34d', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Kopēšanas režīms
              </div>
              <button onClick={() => {setCopySourceMonth(null); setSelectedTariffsToCopy({});}} style={{background: 'transparent', color: '#92400e', border: 'none', cursor: 'pointer', fontSize: '20px'}}>✕</button>
            </div>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
               <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>No perioda:</div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', padding: '8px', background: 'white', border: '1px solid #fed7aa', borderRadius: '4px' }}>
                    {new Date(copySourceMonth + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                  </div>
               </div>
               <div style={{ fontSize: '20px', color: '#d97706' }}>➔</div>
               <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>Uz periodu:</div>
                  <input 
                    type="month" 
                    value={targetMonth} 
                    onChange={(e) => setTargetMonth(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #f59e0b', fontSize: '14px', fontWeight: 'bold' }}
                  />
               </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
               <div style={{ fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
                 👇 Atzīmējiet zemāk tarifus, kurus vēlaties kopēt
               </div>
               <button onClick={() => {setCopySourceMonth(null); setSelectedTariffsToCopy({});}} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #92400e', background: 'transparent', color: '#92400e', cursor: 'pointer', fontWeight: '600' }}>Atcelt</button>
               <button onClick={handleCopyExecute} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#d97706', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>✓ Kopēt atlasītos</button>
            </div>
          </div>
        )}

        {uniqueTariffPeriods.map(period => {
          const periodTariffs = tariffs.filter(t => t.period === period);
          const isSource = copySourceMonth === period;

          return (
            <div key={period} style={{ marginBottom: '20px', background: isSource ? '#fffbeb' : 'transparent', borderRadius: '8px', padding: isSource ? '15px' : '0', border: isSource ? '1px dashed #f59e0b' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: isSource ? 'none' : '1px solid #e2e8f0', paddingBottom: isSource ? '0' : '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>📅</span>
                  {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                  <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>{periodTariffs.length} tarifi</span>
                </div>
                {!copySourceMonth && (
                  <button onClick={() => setCopySourceMonth(period)} style={{ fontSize: '12px', padding: '6px 12px', background: 'white', color: '#4f46e5', border: '1px solid #e0e7ff', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>📋</span> Kopēt šī mēneša tarifus
                  </button>
                )}
                {copySourceMonth && copySourceMonth !== period && (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>-</div>
                )}
              </div>
              
              {periodTariffs.map(tar => {
                const pricePerSqm = parseFloat(tar.total_amount) / TOTAL_AREA;
                const isEditing = editingTariff === tar.id;
                const isSelected = selectedTariffsToCopy[tar.id] || false;

                return (
                  <div 
                    key={tar.id} 
                    style={{
                      ...styles.listItem, 
                      marginBottom: '8px', 
                      display: 'flex', 
                      gap: '12px',
                      background: isEditing ? '#f8fafc' : 'white',
                      border: isSelected ? '1px solid #f59e0b' : styles.listItem.border,
                      backgroundColor: isSelected ? '#ffffff' : styles.listItem.backgroundColor,
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      if (copySourceMonth === period) {
                        setSelectedTariffsToCopy({...selectedTariffsToCopy, [tar.id]: !isSelected});
                      }
                    }}
                  >
                    {copySourceMonth === period && (
                      <div style={{ display: 'flex', alignItems: 'center', paddingRight: '10px', borderRight: '1px solid #e2e8f0' }}>
                         <input 
                           type="checkbox" 
                           checked={isSelected} 
                           onChange={() => {}} // handled by parent onClick
                           style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#d97706' }} 
                         />
                      </div>
                    )}
                    
                    {isEditing ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', padding: '5px' }} onClick={(e) => e.stopPropagation()}>
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                        
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px'}}>
                           <input type="checkbox" checked={editForm.is_per_m2} onChange={(e) => setEditForm({...editForm, is_per_m2: e.target.checked})} id={`edit-m2-${tar.id}`} style={{ width: '14px', height: '14px' }} />
                           <label htmlFor={`edit-m2-${tar.id}`} style={{ fontSize: '11px', color: '#666', cursor: 'pointer' }}>Rediģēt m² cenu</label>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                          {editForm.is_per_m2 ? (
                             <input type="number" step="0.0001" placeholder="€/m²" value={editForm.price_per_m2} onChange={(e) => setEditForm({...editForm, price_per_m2: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                          ) : (
                             <input type="number" step="0.01" placeholder="Kopā €" value={editForm.total_amount} onChange={(e) => setEditForm({...editForm, total_amount: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                          )}
                          
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
                        <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', marginBottom: '4px' }}>
                          {tar.name}
                          {tar.include_in_invoice === false && (
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: '600' }}>
                              ✕ Neiekļaut rēķinā
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', gap: '15px' }}>
                          <span><strong>€{parseFloat(tar.total_amount).toFixed(2)}</strong> <span style={{fontSize:'11px'}}>kopā</span></span>
                          <span style={{ color: '#94a3b8' }}>|</span>
                          <span><strong>€{pricePerSqm.toFixed(4)}</strong><span style={{fontSize:'11px'}}>/m²</span></span>
                          {tar.vat_rate > 0 && (
                            <>
                              <span style={{ color: '#94a3b8' }}>|</span>
                              <span style={{ color: '#64748b' }}>PVN: {tar.vat_rate}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!isEditing && !copySourceMonth && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); startEditTariff(tar); }} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '4px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} title="Rediģēt">✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); deleteTariff(tar.id); }} style={{ background: 'white', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} title="Dzēst">🗑️</button>
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
