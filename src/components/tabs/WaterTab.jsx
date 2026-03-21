import React from 'react';
import { styles } from '../shared/styles';

export function WaterTab({
  apartments,
  meterReadings,
  waterTariffs,
  hotWaterTariffs,
  wasteTariffs,
  tariffPeriod, setTariffPeriod,
  enabledMeters, setEnabledMeters,
  waterTariffForm, setWaterTariffForm,
  hotWaterTariffForm, setHotWaterTariffForm,
  wasteTariffForm, setWasteTariffForm,
  uniqueTariffPeriods,
  saveWaterTariff,
  saveHotWaterTariff,
  saveWasteTariff,
  saveWaterMeterReading,
  saveHotWaterMeterReading,
  editMeterReading,
  deleteMeterReading,
  calculateWasteDistribution
}) {
  const [editValues, setEditValues] = React.useState({});
  const [selectedPeriod, setSelectedPeriod] = React.useState(tariffPeriod);
  const [adminEditApt, setAdminEditApt] = React.useState(null);
  const [adminAddMonth, setAdminAddMonth] = React.useState(tariffPeriod);
  const [adminAddApt, setAdminAddApt] = React.useState('');
  const [adminAddMeterType, setAdminAddMeterType] = React.useState('water');
  const [adminAddValue, setAdminAddValue] = React.useState('');

  // Filtrēt rādījumus pēc perioda
  const periodReadings = meterReadings.filter(mr => mr.period === selectedPeriod);

  // Izveidot paplašinātu mēnešu sarakstu (iepriekšējie + nākamie)
  const getAllAvailablePeriods = () => {
    const allPeriods = new Set(uniqueTariffPeriods);
    
    const [currentYear, currentMonth] = tariffPeriod.split('-');
    let year = parseInt(currentYear);
    let month = parseInt(currentMonth);
    
    for (let i = 0; i < 24; i++) {
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
      const periodStr = `${year}-${String(month).padStart(2, '0')}`;
      allPeriods.add(periodStr);
    }
    
    return Array.from(allPeriods).sort().reverse();
  };

  const allAvailablePeriods = getAllAvailablePeriods();

  return (
    <div>
      {/* ===== TARIFIEM ===== */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '30px'}}>
        {/* SKAITĪTĀJU IESPĒJOŠANA */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>⚙️ Skaitītāju Iespējošana</h2>
          <div style={styles.form}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #0ea5e9'}}>
              <label style={{fontWeight: '500', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0}}>
                <span style={{fontSize: '16px'}}>❄️</span> Aukstais ūdens
              </label>
              <input type="checkbox" checked={enabledMeters.water} onChange={(e) => setEnabledMeters({...enabledMeters, water: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
            </div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a', marginTop: '10px'}}>
              <label style={{fontWeight: '500', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: 0}}>
                <span style={{fontSize: '16px'}}>🔥</span> Siltais ūdens
              </label>
              <input type="checkbox" checked={enabledMeters.hot_water} onChange={(e) => setEnabledMeters({...enabledMeters, hot_water: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
            </div>
          </div>
        </div>

        {/* AUKSTAIS ŪDENS TARIFS */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>❄️ Aukstais ūdens - Tarifs</h2>
          <form onSubmit={saveWaterTariff} style={styles.form}>
            <div>
              <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Periods</label>
              <select value={waterTariffForm.period} onChange={(e) => {
                const newPeriod = e.target.value;
                setWaterTariffForm({...waterTariffForm, period: newPeriod});
                const existing = waterTariffs.find(w => w.period === newPeriod);
                if (existing) {
                  setWaterTariffForm({period: newPeriod, price_per_m3: existing.price_per_m3 || '', vat_rate: existing.vat_rate || 0, include_in_invoice: existing.include_in_invoice !== false});
                }
              }} style={styles.input}>
                {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
              </select>
            </div>
            <div>
              <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Cena par m³ (€)</label>
              <input type="number" step="0.01" placeholder="0.00" value={waterTariffForm.price_per_m3} onChange={(e) => setWaterTariffForm({...waterTariffForm, price_per_m3: e.target.value})} style={styles.input} />
            </div>
            <div>
              <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>PVN (%)</label>
              <input type="number" step="0.01" placeholder="0" value={waterTariffForm.vat_rate} onChange={(e) => setWaterTariffForm({...waterTariffForm, vat_rate: e.target.value})} style={styles.input} />
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
              <input type="checkbox" checked={waterTariffForm.include_in_invoice} onChange={(e) => setWaterTariffForm({...waterTariffForm, include_in_invoice: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
              <label style={{fontSize: '13px', cursor: 'pointer', margin: 0, flex: 1}}>✓ Iekļaut rēķinā</label>
            </div>
            <button type="submit" style={styles.btn}>Saglabāt Tarifu</button>
          </form>
        </div>

        {/* SILTAIS ŪDENS TARIFS */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🔥 Siltais ūdens - Tarifs</h2>
          <form onSubmit={saveHotWaterTariff} style={styles.form}>
            <div>
              <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Periods</label>
              <select value={hotWaterTariffForm.period} onChange={(e) => {
                const newPeriod = e.target.value;
                setHotWaterTariffForm({...hotWaterTariffForm, period: newPeriod});
                const existing = hotWaterTariffs.find(w => w.period === newPeriod);
                if (existing) {
                  setHotWaterTariffForm({period: newPeriod, price_per_m3: existing.price_per_m3 || '', vat_rate: existing.vat_rate || 0, include_in_invoice: existing.include_in_invoice !== false});
                }
              }} style={styles.input}>
                {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
              </select>
            </div>
            <div>
              <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Cena par m³ (€)</label>
              <input type="number" step="0.01" placeholder="0.00" value={hotWaterTariffForm.price_per_m3} onChange={(e) => setHotWaterTariffForm({...hotWaterTariffForm, price_per_m3: e.target.value})} style={styles.input} />
            </div>
            <div>
              <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>PVN (%)</label>
              <input type="number" step="0.01" placeholder="0" value={hotWaterTariffForm.vat_rate} onChange={(e) => setHotWaterTariffForm({...hotWaterTariffForm, vat_rate: e.target.value})} style={styles.input} />
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
              <input type="checkbox" checked={hotWaterTariffForm.include_in_invoice} onChange={(e) => setHotWaterTariffForm({...hotWaterTariffForm, include_in_invoice: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
              <label style={{fontSize: '13px', cursor: 'pointer', margin: 0, flex: 1}}>✓ Iekļaut rēķinā</label>
            </div>
            <button type="submit" style={styles.btn}>Saglabāt Tarifu</button>
          </form>
        </div>

        {/* ATKRITUMU TARIFS */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>♻️ Atkritumi - Tarifs</h2>
          <form onSubmit={saveWasteTariff} style={styles.form}>
            <div>
              <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Periods</label>
              <select value={wasteTariffForm.period} onChange={(e) => {
                const newPeriod = e.target.value;
                setWasteTariffForm({...wasteTariffForm, period: newPeriod});
                const existing = wasteTariffs.find(w => w.period === newPeriod);
                if (existing) {
                  setWasteTariffForm({period: newPeriod, total_amount: existing.total_amount || '', vat_rate: existing.vat_rate || 21, include_in_invoice: existing.include_in_invoice !== false});
                }
              }} style={styles.input}>
                {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</option>))}
              </select>
            </div>
            <div>
              <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Kopējā summa bez PVN (€)</label>
              <input type="number" step="0.01" placeholder="0.00" value={wasteTariffForm.total_amount} onChange={(e) => setWasteTariffForm({...wasteTariffForm, total_amount: e.target.value})} style={styles.input} />
            </div>
            <div>
              <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>PVN (%)</label>
              <input type="number" step="0.01" placeholder="0" value={wasteTariffForm.vat_rate} onChange={(e) => setWasteTariffForm({...wasteTariffForm, vat_rate: e.target.value})} style={styles.input} />
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
              <input type="checkbox" checked={wasteTariffForm.include_in_invoice} onChange={(e) => setWasteTariffForm({...wasteTariffForm, include_in_invoice: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
              <label style={{fontSize: '13px', cursor: 'pointer', margin: 0, flex: 1}}>✓ Iekļaut rēķinā</label>
            </div>
            <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#0369a1', marginBottom: '12px'}}>
              ℹ️ Summa tiks dalīta uz deklarēto personu skaitu.
            </div>
            <button type="submit" style={styles.btn}>Saglabāt Tarifu</button>
          </form>
        </div>
      </div>

      {/* ===== ATKRITUMU SADALĪJUMS ===== */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>♻️ Sadalījums - {new Date(wasteTariffForm.period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</h2>
        <div style={styles.list}>
          {(() => {
            const { distribution, total } = calculateWasteDistribution(wasteTariffs, wasteTariffForm.period);
            if (distribution.length === 0) {
              return <div style={{color: '#999', textAlign: 'center', padding: '20px'}}>Nav norādīts atkritumu tarifs</div>;
            }
            return (
              <>
                <div style={{background: '#f9fafb', padding: '12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', fontWeight: '500'}}>
                  📊 Kopā deklarēto personu: <strong>{total}</strong>
                </div>
                {distribution.map(item => (
                  <div key={item.apartment.id} style={{...styles.listItem, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginBottom: '8px'}}>
                    <div>
                      <div style={{fontWeight: '600', fontSize: '14px'}}>Dzīv. {item.apartment.number}</div>
                      <div style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>{item.declaredPersons} pers.</div>
                    </div>
                    <div style={{fontWeight: '600', color: '#003399', fontSize: '15px', textAlign: 'right'}}>€{item.shareTotal.toFixed(2)}</div>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      </div>

      {/* ===== ADMIN - PIEVIENOT/LABOT RĀDĪJUMUS ===== */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>⏮️ Admin - Pievienot/Labot Rādījumus</h2>
        <div style={{background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#92400e'}}>
          <strong>ℹ️</strong> Pievienojiet vai labojiet skaitītāju rādījumus jebkuram mēnesim
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!adminAddMonth || !adminAddApt || adminAddApt === '' || !adminAddValue) {
            alert('Aizpildiet visus laukus');
            return;
          }
          if (adminAddMeterType === 'water') {
            saveWaterMeterReading(adminAddApt, adminAddValue, adminAddMonth);
          } else if (adminAddMeterType === 'hot_water') {
            saveHotWaterMeterReading(adminAddApt, adminAddValue, adminAddMonth);
          }
          setAdminAddMonth(tariffPeriod);
          setAdminAddApt('');
          setAdminAddValue('');
        }} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'flex-end'}}>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Periods</label>
            <select value={adminAddMonth} onChange={(e) => setAdminAddMonth(e.target.value)} style={styles.input}>
              <option value="">-- Izvēlieties --</option>
              {allAvailablePeriods.map(period => (
                <option key={period} value={period}>
                  {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'short', year: 'numeric'})}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Dzīvoklis</label>
            <select value={adminAddApt} onChange={(e) => setAdminAddApt(e.target.value)} style={styles.input}>
              <option value="">-- Izvēlieties --</option>
              {apartments.sort((a, b) => parseInt(a.number) - parseInt(b.number)).map(apt => (<option key={apt.id} value={apt.id}>Dzīv. {apt.number}</option>))}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Tips</label>
            <select value={adminAddMeterType} onChange={(e) => setAdminAddMeterType(e.target.value)} style={styles.input}>
              <option value="water">❄️ Aukstais</option>
              <option value="hot_water">🔥 Siltais</option>
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Rādījums (m³)</label>
            <input type="number" step="0.01" placeholder="0.00" value={adminAddValue} onChange={(e) => setAdminAddValue(e.target.value)} style={styles.input} />
          </div>
          <button type="submit" style={{...styles.btn, padding: '10px 20px', whiteSpace: 'nowrap', height: '42px'}}>💾 Saglabāt</button>
        </form>
      </div>

      {/* ===== SKAITĪTĀJU PĀRVALDĪŠANA ===== */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📊 Skaitītāju Rādījumi - Pārvaldīšana</h2>
        
        <div style={{display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Izvēlēties mēnesi</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={styles.input}>
              {allAvailablePeriods.map(period => (
                <option key={period} value={period}>
                  {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                </option>
              ))}
            </select>
          </div>
          <div style={{fontSize: '13px', color: '#0369a1', background: '#f0f9ff', padding: '10px 14px', borderRadius: '4px', fontWeight: '500'}}>
            {periodReadings.length} rādījumi
          </div>
        </div>

        {/* AUKSTAIS ŪDENS */}
        <div style={{marginBottom: '30px'}}>
          <h3 style={{fontSize: '15px', fontWeight: '600', color: '#0369a1', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #0ea5e9', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span>❄️</span> Aukstais ūdens
          </h3>
          
          <div style={{overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
              <thead>
                <tr style={{background: '#f0f9ff', borderBottom: '2px solid #0ea5e9'}}>
                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#0369a1'}}>Dzīvoklis</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600', color: '#0369a1'}}>Vārds</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#0369a1', minWidth: '90px'}}>Iepr. (m³)</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#0369a1', minWidth: '90px'}}>Pašr. (m³)</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#0369a1', minWidth: '90px'}}>Patēr. (m³)</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600', color: '#0369a1'}}>Darbības</th>
                </tr>
              </thead>
              <tbody>
                {apartments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{padding: '20px', textAlign: 'center', color: '#999'}}>Nav dzīvokļu</td>
                  </tr>
                ) : (
                  apartments.map((apt, idx) => {
                    const currentReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === selectedPeriod);
                    
                    const [year, month] = selectedPeriod.split('-');
                    let prevMonth = parseInt(month) - 1;
                    let prevYear = parseInt(year);
                    if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
                    const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
                    const previousReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === previousPeriod);
                    
                    const currentValue = currentReading?.reading_value ? parseFloat(currentReading.reading_value) : 0;
                    const previousValue = previousReading?.reading_value ? parseFloat(previousReading.reading_value) : 0;
                    const consumption = currentValue > 0 && previousValue > 0 ? (currentValue - previousValue) : 0;

                    return (
                      <tr key={apt.id} style={{borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#fafbfc'}}>
                        <td style={{padding: '12px', fontWeight: '600', color: '#003399'}}>Dzīv. {apt.number}</td>
                        <td style={{padding: '12px', textAlign: 'center', fontSize: '12px'}}>{apt.owner_name}</td>
                        <td style={{padding: '12px', textAlign: 'right', color: '#666'}}>
                          {previousValue > 0 ? previousValue.toFixed(2) : '—'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>
                          {adminEditApt === apt.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editValues[apt.id] !== undefined ? editValues[apt.id] : (currentValue || '')}
                              onChange={(e) => setEditValues({...editValues, [apt.id]: e.target.value})}
                              style={{width: '70px', padding: '6px', border: '2px solid #0ea5e9', borderRadius: '4px', textAlign: 'right', fontSize: '13px'}}
                              autoFocus
                            />
                          ) : (
                            <span>{currentValue > 0 ? currentValue.toFixed(2) : '—'}</span>
                          )}
                        </td>
                        <td style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: consumption > 0 ? '#0369a1' : '#999'}}>
                          {consumption > 0 ? consumption.toFixed(2) : '—'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'center'}}>
                          {adminEditApt === apt.id ? (
                            <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                              <button
                                onClick={() => {
                                  if (editValues[apt.id] !== undefined) {
                                    editMeterReading(currentReading?.id, editValues[apt.id]);
                                  }
                                  setAdminEditApt(null);
                                }}
                                style={{...styles.btn, background: '#10b981', padding: '4px 8px', fontSize: '11px', margin: 0}}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setAdminEditApt(null)}
                                style={{...styles.btn, background: '#6b7280', padding: '4px 8px', fontSize: '11px', margin: 0}}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                              <button
                                onClick={() => {
                                  setAdminEditApt(apt.id);
                                  setEditValues({...editValues, [apt.id]: currentValue});
                                }}
                                style={{...styles.btn, background: '#0ea5e9', padding: '4px 8px', fontSize: '11px', margin: 0}}
                                title="Rediģēt"
                              >
                                ✎
                              </button>
                              {currentReading && (
                                <button
                                  onClick={() => deleteMeterReading(currentReading.id)}
                                  style={{...styles.btn, background: '#ef4444', padding: '4px 8px', fontSize: '11px', margin: 0}}
                                  title="Dzēst"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SILTAIS ŪDENS */}
        <div>
          <h3 style={{fontSize: '15px', fontWeight: '600', color: '#d97706', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #fde68a', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span>🔥</span> Siltais ūdens
          </h3>
          
          <div style={{overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
              <thead>
                <tr style={{background: '#fef3c7', borderBottom: '2px solid #fde68a'}}>
                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600', color: '#92400e'}}>Dzīvoklis</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600', color: '#92400e'}}>Vārds</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#92400e', minWidth: '90px'}}>Iepr. (m³)</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#92400e', minWidth: '90px'}}>Pašr. (m³)</th>
                  <th style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: '#92400e', minWidth: '90px'}}>Patēr. (m³)</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600', color: '#92400e'}}>Darbības</th>
                </tr>
              </thead>
              <tbody>
                {apartments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{padding: '20px', textAlign: 'center', color: '#999'}}>Nav dzīvokļu</td>
                  </tr>
                ) : (
                  apartments.map((apt, idx) => {
                    const currentReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'hot_water' && mr.period === selectedPeriod);
                    
                    const [year, month] = selectedPeriod.split('-');
                    let prevMonth = parseInt(month) - 1;
                    let prevYear = parseInt(year);
                    if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
                    const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
                    const previousReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'hot_water' && mr.period === previousPeriod);
                    
                    const currentValue = currentReading?.reading_value ? parseFloat(currentReading.reading_value) : 0;
                    const previousValue = previousReading?.reading_value ? parseFloat(previousReading.reading_value) : 0;
                    const consumption = currentValue > 0 && previousValue > 0 ? (currentValue - previousValue) : 0;

                    return (
                      <tr key={apt.id + '-hot'} style={{borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#fafbfc'}}>
                        <td style={{padding: '12px', fontWeight: '600', color: '#d97706'}}>Dzīv. {apt.number}</td>
                        <td style={{padding: '12px', textAlign: 'center', fontSize: '12px'}}>{apt.owner_name}</td>
                        <td style={{padding: '12px', textAlign: 'right', color: '#666'}}>
                          {previousValue > 0 ? previousValue.toFixed(2) : '—'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'right', fontWeight: '600'}}>
                          {adminEditApt === apt.id + '-hot' ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editValues[apt.id + '-hot'] !== undefined ? editValues[apt.id + '-hot'] : (currentValue || '')}
                              onChange={(e) => setEditValues({...editValues, [apt.id + '-hot']: e.target.value})}
                              style={{width: '70px', padding: '6px', border: '2px solid #f59e0b', borderRadius: '4px', textAlign: 'right', fontSize: '13px'}}
                              autoFocus
                            />
                          ) : (
                            <span>{currentValue > 0 ? currentValue.toFixed(2) : '—'}</span>
                          )}
                        </td>
                        <td style={{padding: '12px', textAlign: 'right', fontWeight: '600', color: consumption > 0 ? '#d97706' : '#999'}}>
                          {consumption > 0 ? consumption.toFixed(2) : '—'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'center'}}>
                          {adminEditApt === apt.id + '-hot' ? (
                            <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                              <button
                                onClick={() => {
                                  if (editValues[apt.id + '-hot'] !== undefined) {
                                    editMeterReading(currentReading?.id, editValues[apt.id + '-hot']);
                                  }
                                  setAdminEditApt(null);
                                }}
                                style={{...styles.btn, background: '#10b981', padding: '4px 8px', fontSize: '11px', margin: 0}}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setAdminEditApt(null)}
                                style={{...styles.btn, background: '#6b7280', padding: '4px 8px', fontSize: '11px', margin: 0}}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                              <button
                                onClick={() => {
                                  setAdminEditApt(apt.id + '-hot');
                                  setEditValues({...editValues, [apt.id + '-hot']: currentValue});
                                }}
                                style={{...styles.btn, background: '#f59e0b', padding: '4px 8px', fontSize: '11px', margin: 0}}
                                title="Rediģēt"
                              >
                                ✎
                              </button>
                              {currentReading && (
                                <button
                                  onClick={() => deleteMeterReading(currentReading.id)}
                                  style={{...styles.btn, background: '#ef4444', padding: '4px 8px', fontSize: '11px', margin: 0}}
                                  title="Dzēst"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}