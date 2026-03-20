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
  const [adminAddMonth, setAdminAddMonth] = React.useState('');
  const [adminAddApt, setAdminAddApt] = React.useState('');
  const [adminAddMeterType, setAdminAddMeterType] = React.useState('water');
  const [adminAddValue, setAdminAddValue] = React.useState('');

  // Filtrēt rādījumus pēc perioda
  const periodReadings = meterReadings.filter(mr => mr.period === selectedPeriod);

  return (
    <div>
      {/* SKAITĪTĀJU IESPĒJOŠANA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>⚙️ Skaitītāju Iespējošana</h2>
        <div style={styles.form}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
            <label style={{fontWeight: '500', fontSize: '14px', cursor: 'pointer'}}>❄️ Aukstais ūdens</label>
            <input type="checkbox" checked={enabledMeters.water} onChange={(e) => setEnabledMeters({...enabledMeters, water: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
          </div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '8px'}}>
            <label style={{fontWeight: '500', fontSize: '14px', cursor: 'pointer'}}>🔥 Siltais ūdens</label>
            <input type="checkbox" checked={enabledMeters.hot_water} onChange={(e) => setEnabledMeters({...enabledMeters, hot_water: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
          </div>
        </div>
      </div>

      {/* AUKSTAIS ŪDENS TARIFS */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>❄️ Aukstais ūdens - Tarifs</h2>
        <form onSubmit={saveWaterTariff} style={styles.form}>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500'}}>Periods</label>
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
          <input type="number" step="0.01" placeholder="Cena par m³ (€) *" value={waterTariffForm.price_per_m3} onChange={(e) => setWaterTariffForm({...waterTariffForm, price_per_m3: e.target.value})} style={styles.input} />
          <input type="number" step="0.01" placeholder="PVN (%)" value={waterTariffForm.vat_rate} onChange={(e) => setWaterTariffForm({...waterTariffForm, vat_rate: e.target.value})} style={styles.input} />
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
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500'}}>Periods</label>
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
          <input type="number" step="0.01" placeholder="Cena par m³ (€) *" value={hotWaterTariffForm.price_per_m3} onChange={(e) => setHotWaterTariffForm({...hotWaterTariffForm, price_per_m3: e.target.value})} style={styles.input} />
          <input type="number" step="0.01" placeholder="PVN (%)" value={hotWaterTariffForm.vat_rate} onChange={(e) => setHotWaterTariffForm({...hotWaterTariffForm, vat_rate: e.target.value})} style={styles.input} />
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
            <input type="checkbox" checked={hotWaterTariffForm.include_in_invoice} onChange={(e) => setHotWaterTariffForm({...hotWaterTariffForm, include_in_invoice: e.target.checked})} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
            <label style={{fontSize: '13px', cursor: 'pointer', margin: 0, flex: 1}}>✓ Iekļaut rēķinā</label>
          </div>
          <button type="submit" style={styles.btn}>Saglabāt Tarifu</button>
        </form>
      </div>

      {/* ATKRITUMU TARIFS */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>♻️ Atkritumu Izvešanas Tarifs</h2>
        <form onSubmit={saveWasteTariff} style={styles.form}>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500'}}>Periods</label>
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
          <input type="number" step="0.01" placeholder="Kopējā summa bez PVN (€) *" value={wasteTariffForm.total_amount} onChange={(e) => setWasteTariffForm({...wasteTariffForm, total_amount: e.target.value})} style={styles.input} />
          <input type="number" step="0.01" placeholder="PVN (%)" value={wasteTariffForm.vat_rate} onChange={(e) => setWasteTariffForm({...wasteTariffForm, vat_rate: e.target.value})} style={styles.input} />
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

      {/* ATKRITUMU SADALĪJUMS */}
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
                <div style={{background: '#f9fafb', padding: '12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px'}}>
                  <strong>Kopā deklarēto personu:</strong> {total}
                </div>
                {distribution.map(item => (
                  <div key={item.apartment.id} style={{...styles.listItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                    <div>
                      <div style={{fontWeight: 'bold'}}>Dzīv. {item.apartment.number}</div>
                      <div style={{fontSize: '12px', color: '#666'}}>{item.declaredPersons} pers. = €{item.shareTotal.toFixed(2)}</div>
                    </div>
                    <div style={{fontWeight: 'bold', color: '#003399'}}>€{item.shareTotal.toFixed(2)}</div>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      </div>

      {/* ===== ADMIN - IEPRIEKŠĒJO MĒNEŠU IEVADE ===== */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>⏮️ Admin - Pievienot Iepriekšējos Mēnešu Rādījumus</h2>
        <div style={{background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#92400e'}}>
          <strong>ℹ️</strong> Izmantojiet šo formu, lai pievienotu skaitītāju rādījumus iepriekšējiem mēnešiem
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!adminAddMonth || !adminAddApt || !adminAddValue) {
            alert('Aizpildiet visus laukus');
            return;
          }
          saveWaterMeterReading(adminAddApt, adminAddValue, adminAddMonth);
          setAdminAddMonth('');
          setAdminAddApt('');
          setAdminAddValue('');
        }} style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end'}}>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Periods:</label>
            <select value={adminAddMonth} onChange={(e) => setAdminAddMonth(e.target.value)} style={styles.input}>
              <option value="">-- Izvēlieties --</option>
              {uniqueTariffPeriods.map(period => (<option key={period} value={period}>{new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'short', year: 'numeric'})}</option>))}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Dzīvoklis:</label>
            <select value={adminAddApt} onChange={(e) => setAdminAddApt(e.target.value)} style={styles.input}>
              <option value="">-- Izvēlieties --</option>
              {apartments.sort((a, b) => parseInt(a.number) - parseInt(b.number)).map(apt => (<option key={apt.id} value={apt.id}>Dzīv. {apt.number}</option>))}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Tips:</label>
            <select value={adminAddMeterType} onChange={(e) => setAdminAddMeterType(e.target.value)} style={styles.input}>
              <option value="water">❄️ Aukstais</option>
              <option value="hot_water">🔥 Siltais</option>
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Rādījums (m³):</label>
            <input type="number" step="0.01" placeholder="0.00" value={adminAddValue} onChange={(e) => setAdminAddValue(e.target.value)} style={styles.input} />
          </div>
          <button type="submit" style={{...styles.btn, padding: '10px 20px', whiteSpace: 'nowrap'}}>Pievienot</button>
        </form>
      </div>

      {/* ===== SKAITĪTĀJU PĀRVALDĪŠANA ===== */}
      <div style={{...styles.card, gridColumn: '1 / -1'}}>
        <h2 style={styles.cardTitle}>📊 Skaitītāju Rādījumi - Pārvaldīšana</h2>
        
        <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-end', marginBottom: '20px'}}>
          <div>
            <label style={{fontSize: '12px', color: '#666', fontWeight: '500', display: 'block', marginBottom: '6px'}}>Izvēlēties mēnesi:</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={styles.input}>
              {uniqueTariffPeriods.map(period => (
                <option key={period} value={period}>
                  {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                </option>
              ))}
            </select>
          </div>
          <div style={{fontSize: '12px', color: '#0369a1', background: '#f0f9ff', padding: '8px 12px', borderRadius: '4px', fontWeight: '500'}}>
            {periodReadings.length} rādījumi
          </div>
        </div>

        {/* AUKSTAIS ŪDENS */}
        <div style={{marginBottom: '30px'}}>
          <h3 style={{fontSize: '16px', fontWeight: '600', color: '#003399', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0'}}>❄️ Aukstais ūdens</h3>
          
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
              <thead>
                <tr style={{background: '#f0f4f8', borderBottom: '2px solid #cbd5e1'}}>
                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Dzīvoklis</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Vārds</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Iepriekšējais (m³)</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Pašreizējais (m³)</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Patēriņš (m³)</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Darbības</th>
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
                    
                    // Aprēķināt iepriekšējo mēnesi
                    const [year, month] = selectedPeriod.split('-');
                    let prevMonth = parseInt(month) - 1;
                    let prevYear = parseInt(year);
                    if (prevMonth === 0) {
                      prevMonth = 12;
                      prevYear -= 1;
                    }
                    const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
                    const previousReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === previousPeriod);
                    
                    const currentValue = currentReading?.reading_value ? parseFloat(currentReading.reading_value) : 0;
                    const previousValue = previousReading?.reading_value ? parseFloat(previousReading.reading_value) : 0;
                    const consumption = currentValue - previousValue;

                    return (
                      <tr key={apt.id} style={{borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fafbfc' : '#fff'}}>
                        <td style={{padding: '12px', fontWeight: '600'}}>Dzīv. {apt.number}</td>
                        <td style={{padding: '12px', textAlign: 'center'}}>{apt.owner_name}</td>
                        <td style={{padding: '12px', textAlign: 'center', color: '#666'}}>
                          {previousValue > 0 ? previousValue.toFixed(2) : '-'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'center'}}>
                          {adminEditApt === apt.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editValues[apt.id] || currentValue || ''}
                              onChange={(e) => setEditValues({...editValues, [apt.id]: e.target.value})}
                              style={{width: '80px', padding: '6px', border: '2px solid #0ea5e9', borderRadius: '4px', textAlign: 'center'}}
                              autoFocus
                            />
                          ) : (
                            <span style={{fontWeight: '600'}}>{currentValue > 0 ? currentValue.toFixed(2) : '-'}</span>
                          )}
                        </td>
                        <td style={{padding: '12px', textAlign: 'center', fontWeight: '600', color: consumption > 0 ? '#0369a1' : '#999'}}>
                          {consumption > 0 ? consumption.toFixed(2) : '-'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'center'}}>
                          {adminEditApt === apt.id ? (
                            <>
                              <button
                                onClick={() => {
                                  if (editValues[apt.id] !== undefined) {
                                    editMeterReading(currentReading?.id, editValues[apt.id]);
                                  }
                                  setAdminEditApt(null);
                                  setEditValues({...editValues, [apt.id]: undefined});
                                }}
                                style={{...styles.btn, background: '#10b981', padding: '4px 8px', fontSize: '11px', marginRight: '4px'}}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setAdminEditApt(null);
                                  setEditValues({...editValues, [apt.id]: undefined});
                                }}
                                style={{...styles.btn, background: '#6b7280', padding: '4px 8px', fontSize: '11px'}}
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setAdminEditApt(apt.id);
                                  setEditValues({...editValues, [apt.id]: currentValue});
                                }}
                                style={{...styles.btn, background: '#0ea5e9', padding: '4px 8px', fontSize: '11px', marginRight: '4px'}}
                              >
                                ✎
                              </button>
                              {currentReading && (
                                <button
                                  onClick={() => deleteMeterReading(currentReading.id)}
                                  style={{...styles.btn, background: '#ef4444', padding: '4px 8px', fontSize: '11px'}}
                                >
                                  🗑️
                                </button>
                              )}
                            </>
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
          <h3 style={{fontSize: '16px', fontWeight: '600', color: '#d97706', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0'}}>🔥 Siltais ūdens</h3>
          
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
              <thead>
                <tr style={{background: '#f0f4f8', borderBottom: '2px solid #cbd5e1'}}>
                  <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Dzīvoklis</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Vārds</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Iepriekšējais (m³)</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Pašreizējais (m³)</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Patēriņš (m³)</th>
                  <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Darbības</th>
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
                    
                    // Aprēķināt iepriekšējo mēnesi
                    const [year, month] = selectedPeriod.split('-');
                    let prevMonth = parseInt(month) - 1;
                    let prevYear = parseInt(year);
                    if (prevMonth === 0) {
                      prevMonth = 12;
                      prevYear -= 1;
                    }
                    const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
                    const previousReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'hot_water' && mr.period === previousPeriod);
                    
                    const currentValue = currentReading?.reading_value ? parseFloat(currentReading.reading_value) : 0;
                    const previousValue = previousReading?.reading_value ? parseFloat(previousReading.reading_value) : 0;
                    const consumption = currentValue - previousValue;

                    return (
                      <tr key={apt.id + '-hot'} style={{borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#fafbfc' : '#fff'}}>
                        <td style={{padding: '12px', fontWeight: '600'}}>Dzīv. {apt.number}</td>
                        <td style={{padding: '12px', textAlign: 'center'}}>{apt.owner_name}</td>
                        <td style={{padding: '12px', textAlign: 'center', color: '#666'}}>
                          {previousValue > 0 ? previousValue.toFixed(2) : '-'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'center'}}>
                          {adminEditApt === apt.id + '-hot' ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editValues[apt.id + '-hot'] || currentValue || ''}
                              onChange={(e) => setEditValues({...editValues, [apt.id + '-hot']: e.target.value})}
                              style={{width: '80px', padding: '6px', border: '2px solid #0ea5e9', borderRadius: '4px', textAlign: 'center'}}
                              autoFocus
                            />
                          ) : (
                            <span style={{fontWeight: '600'}}>{currentValue > 0 ? currentValue.toFixed(2) : '-'}</span>
                          )}
                        </td>
                        <td style={{padding: '12px', textAlign: 'center', fontWeight: '600', color: consumption > 0 ? '#d97706' : '#999'}}>
                          {consumption > 0 ? consumption.toFixed(2) : '-'}
                        </td>
                        <td style={{padding: '12px', textAlign: 'center'}}>
                          {adminEditApt === apt.id + '-hot' ? (
                            <>
                              <button
                                onClick={() => {
                                  if (editValues[apt.id + '-hot'] !== undefined) {
                                    editMeterReading(currentReading?.id, editValues[apt.id + '-hot']);
                                  }
                                  setAdminEditApt(null);
                                  setEditValues({...editValues, [apt.id + '-hot']: undefined});
                                }}
                                style={{...styles.btn, background: '#10b981', padding: '4px 8px', fontSize: '11px', marginRight: '4px'}}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setAdminEditApt(null);
                                  setEditValues({...editValues, [apt.id + '-hot']: undefined});
                                }}
                                style={{...styles.btn, background: '#6b7280', padding: '4px 8px', fontSize: '11px'}}
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setAdminEditApt(apt.id + '-hot');
                                  setEditValues({...editValues, [apt.id + '-hot']: currentValue});
                                }}
                                style={{...styles.btn, background: '#f59e0b', padding: '4px 8px', fontSize: '11px', marginRight: '4px'}}
                              >
                                ✎
                              </button>
                              {currentReading && (
                                <button
                                  onClick={() => deleteMeterReading(currentReading.id)}
                                  style={{...styles.btn, background: '#ef4444', padding: '4px 8px', fontSize: '11px'}}
                                >
                                  🗑️
                                </button>
                              )}
                            </>
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