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
  return (
    <div style={styles.twoCol}>
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
        <h2 style={styles.cardTitle}>❄️ Aukstais ūdens</h2>
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
        <h2 style={styles.cardTitle}>🔥 Siltais ūdens</h2>
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

      {/* AUKSTAIS ŪDENS PATĒRIŅŠ */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>❄️ Skaitītāja Rādījumi - {new Date(tariffPeriod + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</h2>
        <div style={styles.list}>
          {apartments.map(apt => {
            const waterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === tariffPeriod);
            const waterTariff = waterTariffs.find(w => w.period === tariffPeriod);
            const consumptionValue = waterReading?.reading_value || '';
            const amount = consumptionValue ? parseFloat(consumptionValue) * parseFloat(waterTariff?.price_per_m3 || 0) : 0;
            const vatAmount = amount * parseFloat(waterTariff?.vat_rate || 0) / 100;
            const totalAmount = amount + vatAmount;

            return (
              <div key={apt.id} style={{...styles.listItem, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap'}}>
                <div style={{marginBottom: '8px', flex: '0 0 100%'}}>
                  <div style={{fontWeight: 'bold'}}>Dzīv. {apt.number}</div>
                  <div style={{fontSize: '12px', color: '#666'}}>€{totalAmount.toFixed(2)}</div>
                </div>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center', flex: '1 1 auto'}}>
                  <input type="number" step="0.01" placeholder="Skaitītāja rādījums" value={consumptionValue} onChange={(e) => saveWaterMeterReading(apt.id, e.target.value, tariffPeriod)} style={{...styles.input, flex: 1, padding: '8px'}} />
                  <span style={{fontSize: '12px', color: '#666', minWidth: '50px'}}>m³</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SILTAIS ŪDENS SKAITĪTĀJA RĀDĪJUMI */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🔥 Skaitītāja Rādījumi - {new Date(tariffPeriod + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</h2>
        <div style={styles.list}>
          {apartments.map(apt => {
            const hotWaterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'hot_water' && mr.period === tariffPeriod);
            const hotWaterTariff = hotWaterTariffs.find(w => w.period === tariffPeriod);
            const consumptionValue = hotWaterReading?.reading_value || '';
            const amount = consumptionValue ? parseFloat(consumptionValue) * parseFloat(hotWaterTariff?.price_per_m3 || 0) : 0;
            const vatAmount = amount * parseFloat(hotWaterTariff?.vat_rate || 0) / 100;
            const totalAmount = amount + vatAmount;

            return (
              <div key={apt.id + '-hot'} style={{...styles.listItem, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap'}}>
                <div style={{marginBottom: '8px', flex: '0 0 100%'}}>
                  <div style={{fontWeight: 'bold'}}>Dzīv. {apt.number}</div>
                  <div style={{fontSize: '12px', color: '#666'}}>€{totalAmount.toFixed(2)}</div>
                </div>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center', flex: '1 1 auto'}}>
                  <input type="number" step="0.01" placeholder="Skaitītāja rādījums" value={consumptionValue} onChange={(e) => saveHotWaterMeterReading(apt.id, e.target.value, tariffPeriod)} style={{...styles.input, flex: 1, padding: '8px'}} />
                  <span style={{fontSize: '12px', color: '#666', minWidth: '50px'}}>m³</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SKAITĪTĀJA RĀDĪJUMU PĀRVALDĪŠANA */}
      <div style={{...styles.card, gridColumn: '1 / -1'}}>
        <h2 style={styles.cardTitle}>⚙️ Skaitītāja Rādījumu Pārvaldīšana</h2>
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
            <thead>
              <tr style={{background: '#f0f4f8', borderBottom: '2px solid #cbd5e1'}}>
                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Dzīvojamā Vienība</th>
                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Tips</th>
                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600'}}>Periods</th>
                <th style={{padding: '10px', textAlign: 'center', fontWeight: '600'}}>Rādījums (m³)</th>
                <th style={{padding: '10px', textAlign: 'center', fontWeight: '600'}}>Darbības</th>
              </tr>
            </thead>
            <tbody>
              {meterReadings.filter(mr => mr.meter_type === 'water' || mr.meter_type === 'hot_water').length === 0 ? (
                <tr>
                  <td colSpan="5" style={{padding: '20px', textAlign: 'center', color: '#999'}}>
                    Nav reģistrētu skaitītāja rādījumu
                  </td>
                </tr>
              ) : (
                meterReadings.filter(mr => mr.meter_type === 'water' || mr.meter_type === 'hot_water').map((reading) => {
                  const apartment = apartments.find(a => a.id === reading.apartment_id);
                  const [isEditing, setIsEditing] = React.useState(false);
                  const [editValue, setEditValue] = React.useState(reading.reading_value);
                  const meterTypeLabel = reading.meter_type === 'water' ? '❄️ Aukstais' : '🔥 Siltais';

                  return (
                    <tr key={reading.id} style={{borderBottom: '1px solid #e2e8f0', background: reading.id % 2 === 0 ? '#fafbfc' : '#fff'}}>
                      <td style={{padding: '10px'}}>
                        <strong>Dzīv. {apartment?.number || 'N/A'}</strong>
                        {apartment && <div style={{fontSize: '11px', color: '#666'}}>{apartment.owner_name} {apartment.owner_surname}</div>}
                      </td>
                      <td style={{padding: '10px'}}>
                        <span style={{fontSize: '12px', fontWeight: '500'}}>{meterTypeLabel}</span>
                      </td>
                      <td style={{padding: '10px'}}>
                        {new Date(reading.period + '-01').toLocaleDateString('lv-LV', {month: 'short', year: 'numeric'})}
                      </td>
                      <td style={{padding: '10px', textAlign: 'center'}}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            style={{width: '80px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center'}}
                          />
                        ) : (
                          <strong>{reading.reading_value}</strong>
                        )}
                      </td>
                      <td style={{padding: '10px', textAlign: 'center'}}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => {
                                editMeterReading(reading.id, editValue);
                                setIsEditing(false);
                              }}
                              style={{...styles.btn, background: '#10b981', padding: '4px 8px', fontSize: '11px', marginRight: '4px'}}
                            >
                              ✓ Saglabāt
                            </button>
                            <button
                              onClick={() => setIsEditing(false)}
                              style={{...styles.btn, background: '#6b7280', padding: '4px 8px', fontSize: '11px'}}
                            >
                              ✕ Atcelt
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setIsEditing(true)}
                              style={{...styles.btn, background: '#0ea5e9', padding: '4px 8px', fontSize: '11px', marginRight: '4px'}}
                            >
                              ✎ Labot
                            </button>
                            <button
                              onClick={() => deleteMeterReading(reading.id)}
                              style={{...styles.btn, background: '#ef4444', padding: '4px 8px', fontSize: '11px'}}
                            >
                              🗑️ Dzēst
                            </button>
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
  );
}
