import React from 'react';

export function WaterTab({
  apartments,
  meterReadings,
  waterTariffs,
  hotWaterTariffs,
  uniqueTariffPeriods,
  tariffPeriod,
  setTariffPeriod,
  waterTariffForm,
  setWaterTariffForm,
  hotWaterTariffForm,
  setHotWaterTariffForm,
  saveWaterTariff,
  saveHotWaterTariff,
  saveWaterMeterReading,
  saveHotWaterMeterReading,
  getLastReading,
  settings,
  updateSetting,
  syncWaterConsumption
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. SADAĻA: PERIODS UN IESTATĪJUMI */}
      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '5px' }}>📅 Izvēlētais periods:</label>
          <select
            value={tariffPeriod}
            onChange={(e) => setTariffPeriod(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: '150px' }}
          >
            {uniqueTariffPeriods.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => syncWaterConsumption(meterReadings)}
          title="Pārrēķināt un saglabāt patēriņu visiem dzīvokļiem šajā periodā"
          style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          🔄 Sinhronizēt patēriņu
        </button>

        <div style={{ display: 'flex', gap: '20px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '5px', color: '#475569' }}>Iesniegšana no (datums):</label>
            <input 
              type="number" 
              min="1" 
              max="31" 
              defaultValue={settings?.meter_reading_start_date || 25}
              onBlur={(e) => updateSetting('meter_reading_start_date', e.target.value)}
              style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '5px', color: '#475569' }}>Iesniegšana līdz (datums):</label>
            <input 
              type="number" 
              min="1" 
              max="31" 
              defaultValue={settings?.meter_reading_end_date || 27}
              onBlur={(e) => updateSetting('meter_reading_end_date', e.target.value)}
              style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      {/* 2. SADAĻA: TARIFI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        {/* Aukstais ūdens */}
        <form onSubmit={saveWaterTariff} style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1', marginBottom: '10px', marginTop: 0 }}>❄️ Aukstais ūdens</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              step="0.0001"
              placeholder="Cena €/m³"
              value={waterTariffForm.price_per_m3}
              onChange={(e) => setWaterTariffForm({ ...waterTariffForm, price_per_m3: e.target.value })}
              style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #7dd3fc' }}
            />
            <input
              type="number"
              step="0.01"
              placeholder="PVN %"
              value={waterTariffForm.vat_rate}
              onChange={(e) => setWaterTariffForm({ ...waterTariffForm, vat_rate: e.target.value })}
              style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #7dd3fc' }}
            />
            <button type="submit" style={{ background: '#0284c7', color: 'white', border: 'none', borderRadius: '4px', padding: '0 15px', cursor: 'pointer' }}>Saglabāt</button>
          </div>
        </form>

        {/* Siltais ūdens */}
        <form onSubmit={saveHotWaterTariff} style={{ background: '#fff7ed', padding: '15px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#c2410c', marginBottom: '10px', marginTop: 0 }}>🔥 Siltais ūdens</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              step="0.0001"
              placeholder="Cena €/m³"
              value={hotWaterTariffForm.price_per_m3}
              onChange={(e) => setHotWaterTariffForm({ ...hotWaterTariffForm, price_per_m3: e.target.value })}
              style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #fdba74' }}
            />
            <input
              type="number"
              step="0.01"
              placeholder="PVN %"
              value={hotWaterTariffForm.vat_rate}
              onChange={(e) => setHotWaterTariffForm({ ...hotWaterTariffForm, vat_rate: e.target.value })}
              style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #fdba74' }}
            />
            <button type="submit" style={{ background: '#ea580c', color: 'white', border: 'none', borderRadius: '4px', padding: '0 15px', cursor: 'pointer' }}>Saglabāt</button>
          </div>
        </form>

        {/* Ūdens starpība */}
        <form onSubmit={saveWaterTariff} style={{ background: '#f5f3ff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#6d28d9', marginBottom: '10px', marginTop: 0 }}>📊 Patēriņa starpība (neiesniegtajiem)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Aukstā ūdens starpība */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', width: '25px' }}>❄️</span>
              <input
                type="number"
                step="0.01"
                placeholder="Aukstā ū. m³"
                value={waterTariffForm.diff_m3}
                onChange={(e) => setWaterTariffForm({ ...waterTariffForm, diff_m3: e.target.value })}
                style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #c4b5fd', fontSize: '13px' }}
              />
              <input
                type="number"
                step="0.0001"
                placeholder="€/m³"
                value={waterTariffForm.diff_price}
                onChange={(e) => setWaterTariffForm({ ...waterTariffForm, diff_price: e.target.value })}
                style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #c4b5fd', fontSize: '13px' }}
              />
              <button onClick={saveWaterTariff} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', padding: '0 10px', cursor: 'pointer', height: '31px', fontSize: '12px' }}>Saglabāt</button>
            </div>

            {/* Siltā ūdens starpība */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', width: '25px' }}>🔥</span>
              <input
                type="number"
                step="0.01"
                placeholder="Siltā ū. m³"
                value={hotWaterTariffForm.diff_m3}
                onChange={(e) => setHotWaterTariffForm({ ...hotWaterTariffForm, diff_m3: e.target.value })}
                style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #c4b5fd', fontSize: '13px' }}
              />
              <input
                type="number"
                step="0.0001"
                placeholder="€/m³"
                value={hotWaterTariffForm.diff_price}
                onChange={(e) => setHotWaterTariffForm({ ...hotWaterTariffForm, diff_price: e.target.value })}
                style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #c4b5fd', fontSize: '13px' }}
              />
              <button onClick={saveHotWaterTariff} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', padding: '0 10px', cursor: 'pointer', height: '31px', fontSize: '12px' }}>Saglabāt</button>
            </div>
          </div>
          
          <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '8px' }}>
            ℹ️ Tiks sadalīts uz dzīvokļiem, kuri nav nodevuši rādījumus {tariffPeriod}.
          </div>
        </form>
      </div>

      {/* 3. SADAĻA: TABULA AR RĀDĪJUMIEM */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 10 }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', minWidth: '50px' }}>Dz.</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', minWidth: '150px' }}>Īpašnieks</th>
                
                {/* AUKSTAIS ŪDENS GALVENE */}
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1' }} colSpan="3">
                  ❄️ Aukstais Ūdens
                </th>

                {/* SILTAIS ŪDENS GALVENE */}
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #f97316', background: '#ffedd5', color: '#c2410c' }} colSpan="3">
                  🔥 Siltais Ūdens
                </th>
              </tr>
              <tr>
                {/* Sub-header for columns */}
                <th style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}></th>
                <th style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}></th>
                
                {/* Aukstais sub-cols */}
                <th style={{ padding: '8px', fontSize: '11px', background: '#f0f9ff', color: '#64748b', textAlign: 'right' }}>Iepriekš</th>
                <th style={{ padding: '8px', fontSize: '11px', background: '#f0f9ff', color: '#0369a1', fontWeight: 'bold', textAlign: 'center' }}>Tagad</th>
                <th style={{ padding: '8px', fontSize: '11px', background: '#f0f9ff', color: '#64748b', textAlign: 'right' }}>Patēriņš</th>

                {/* Siltais sub-cols */}
                <th style={{ padding: '8px', fontSize: '11px', background: '#fff7ed', color: '#64748b', textAlign: 'right' }}>Iepriekš</th>
                <th style={{ padding: '8px', fontSize: '11px', background: '#fff7ed', color: '#c2410c', fontWeight: 'bold', textAlign: 'center' }}>Tagad</th>
                <th style={{ padding: '8px', fontSize: '11px', background: '#fff7ed', color: '#64748b', textAlign: 'right' }}>Patēriņš</th>
              </tr>
            </thead>
            <tbody>
              {apartments.map((apt, index) => {
                // AUKSTAIS ŪDENS DATI
                const coldReadingObj = meterReadings.find(mr => String(mr.apartment_id) === String(apt.id) && mr.meter_type === 'water' && mr.period === tariffPeriod);
                const coldCurrent = coldReadingObj ? coldReadingObj.reading_value : '';
                
                const coldLastObj = getLastReading(apt.id, 'water', tariffPeriod, meterReadings);
                const coldPrev = coldLastObj ? coldLastObj.reading_value : '';
                const coldDiff = (coldCurrent !== '' && coldPrev !== '') ? (coldCurrent - coldPrev).toFixed(2) : '-';

                // SILTAIS ŪDENS DATI
                const hotReadingObj = meterReadings.find(mr => String(mr.apartment_id) === String(apt.id) && mr.meter_type === 'hot_water' && mr.period === tariffPeriod);
                const hotCurrent = hotReadingObj ? hotReadingObj.reading_value : '';

                const hotLastObj = getLastReading(apt.id, 'hot_water', tariffPeriod, meterReadings);
                const hotPrev = hotLastObj ? hotLastObj.reading_value : '';
                const hotDiff = (hotCurrent !== '' && hotPrev !== '') ? (hotCurrent - hotPrev).toFixed(2) : '-';

                const rowBg = index % 2 === 0 ? 'white' : '#f8fafc';

                return (
                  <tr key={apt.id} style={{ backgroundColor: rowBg, borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#334155' }}>{apt.number}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>{apt.owner_name}</td>

                    {/* AUKSTAIS ŪDENS IEVADE */}
                    <td style={{ padding: '10px', textAlign: 'right', color: '#94a3b8', fontSize: '12px', background: '#f0f9ff' }}>
                      {coldPrev !== '' ? coldPrev : '—'}
                    </td>
                    <td style={{ padding: '5px', textAlign: 'center', background: '#f0f9ff' }}>
                      <input 
                        type="number" 
                        step="0.01"
                        defaultValue={coldCurrent} // Izmantojam defaultValue, lai nepārlādētu tabulu uz katru taustiņu
                        onBlur={(e) => saveWaterMeterReading(apt.id, e.target.value, tariffPeriod)}
                        placeholder="m³"
                        style={{ 
                          width: '70px', 
                          padding: '6px', 
                          borderRadius: '4px', 
                          border: '1px solid #bae6fd', 
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }} 
                      />
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: coldDiff > 0 ? '#0284c7' : '#cbd5e1', background: '#f0f9ff' }}>
                      {coldDiff}
                    </td>

                    {/* SILTAIS ŪDENS IEVADE */}
                    <td style={{ padding: '10px', textAlign: 'right', color: '#94a3b8', fontSize: '12px', background: '#fff7ed' }}>
                      {hotPrev !== '' ? hotPrev : '—'}
                    </td>
                    <td style={{ padding: '5px', textAlign: 'center', background: '#fff7ed' }}>
                      <input 
                        type="number" 
                        step="0.01"
                        defaultValue={hotCurrent}
                        onBlur={(e) => saveHotWaterMeterReading(apt.id, e.target.value, tariffPeriod)}
                        placeholder="m³"
                        style={{ 
                          width: '70px', 
                          padding: '6px', 
                          borderRadius: '4px', 
                          border: '1px solid #fdba74', 
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }} 
                      />
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: hotDiff > 0 ? '#ea580c' : '#cbd5e1', background: '#fff7ed' }}>
                      {hotDiff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
          Kopā reģistrēti dzīvokļi: {apartments.length}
        </div>
      </div>
    </div>
  );
}