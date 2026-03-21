import React, { useState, useEffect } from 'react';
import { Toast } from './shared/Toast';

export function UserPortal({ userApartment, userInvoices, meterReadings, waterTariffs, hotWaterTariffs, onLogout, onDownloadPDF, onViewAsHTML, onSaveWaterMeterReading, onSaveHotWaterMeterReading, toast, onCloseToast, currentPeriod, settings, showToast }) {
  const getInvoiceStatus = (invoice) => {
    if (invoice.paid) {
      return { status: 'Apmaksāts', color: '#10b981', emoji: '✓' };
    }
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    if (today > dueDate) {
      return { status: 'Parāds', color: '#ef4444', emoji: '⚠️' };
    } else {
      return { status: 'Gaida atmaksu', color: '#f59e0b', emoji: '⏳' };
    }
  };

  const [year, month] = currentPeriod.split('-');
  let prevMonth = parseInt(month, 10) - 1;
  let prevYear = parseInt(year, 10);
  if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
  const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  // Ūdens rādījumi
  const coldCurrentReading = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'water' && mr.period === currentPeriod)?.reading_value || '';
  const coldPrevious = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'water' && mr.period === previousPeriod)?.reading_value || '';
  const hotCurrentReading = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'hot_water' && mr.period === currentPeriod)?.reading_value || '';
  const hotPrevious = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'hot_water' && mr.period === previousPeriod)?.reading_value || '';

  const [coldCurrent, setColdCurrent] = useState(coldCurrentReading);
  const [hotCurrent, setHotCurrent] = useState(hotCurrentReading);

  useEffect(() => {
    setColdCurrent(coldCurrentReading);
  }, [coldCurrentReading]);

  useEffect(() => {
    setHotCurrent(hotCurrentReading);
  }, [hotCurrentReading]);

  // Aprēķināt patēriņu
  const coldConsumption = (coldCurrent && coldPrevious) ? (parseFloat(coldCurrent) - parseFloat(coldPrevious)).toFixed(2) : '—';
  const hotConsumption = (hotCurrent && hotPrevious) ? (parseFloat(hotCurrent) - parseFloat(hotPrevious)).toFixed(2) : '—';

  // Aprēķināt cenas
  const waterTariff = waterTariffs.find(w => w.period === currentPeriod);
  const hotWaterTariff = hotWaterTariffs.find(w => w.period === currentPeriod);

  const coldPrice = (coldConsumption !== '—' && waterTariff) ? (parseFloat(coldConsumption) * parseFloat(waterTariff.price_per_m3 || 0)).toFixed(2) : '—';
  const hotPrice = (hotConsumption !== '—' && hotWaterTariff) ? (parseFloat(hotConsumption) * parseFloat(hotWaterTariff.price_per_m3 || 0)).toFixed(2) : '—';

  const todayDate = new Date();
  const currentDay = todayDate.getDate();
  const startDay = parseInt(settings?.meter_reading_start_date) || 25;
  const endDay = parseInt(settings?.meter_reading_end_date) || 27;
  const isSubmissionAllowed = currentDay >= startDay && currentDay <= endDay;

  const handleColdBlur = (val) => {
    if (val !== '' && coldPrevious !== '') {
      const current = parseFloat(val);
      const prev = parseFloat(coldPrevious);
      if (!isNaN(current) && !isNaN(prev) && current < prev) {
        showToast('Kļūda: Rādījums nevar būt mazāks par iepriekšējo mēnesi', 'error');
        setColdCurrent(coldCurrentReading);
        return;
      }
    }
    onSaveWaterMeterReading(userApartment?.id, val, currentPeriod);
  };

  const handleHotBlur = (val) => {
    if (val !== '' && hotPrevious !== '') {
      const current = parseFloat(val);
      const prev = parseFloat(hotPrevious);
      if (!isNaN(current) && !isNaN(prev) && current < prev) {
        showToast('Kļūda: Rādījums nevar būt mazāks par iepriekšējo mēnesi', 'error');
        setHotCurrent(hotCurrentReading);
        return;
      }
    }
    onSaveHotWaterMeterReading(userApartment?.id, val, currentPeriod);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: '#003399', color: 'white', padding: '30px', borderRadius: '8px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>🏠 Dzīvoklis {userApartment?.number}</h1>
          <p style={{ margin: '5px 0 0 0', color: '#ddd', fontSize: '14px' }}>{userApartment?.owner_name}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '4px' }}>Kopā apmaksāt:</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ade80' }}>€{userInvoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}</div>
            <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>Parāds: €{userInvoices.filter(i => !i.paid && new Date(i.due_date) <= new Date()).reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}</div>
          </div>
          <button onClick={onLogout} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Izrakstīties</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* RĒĶINI */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2>📄 Rēķinu vēsture</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {userInvoices.length === 0 ? (
              <p style={{ color: '#999' }}>Nav rēķinu</p>
            ) : (
              userInvoices.map(inv => {
                const status = getInvoiceStatus(inv);
                return (
                  <div key={inv.id} style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Rēķins {inv.invoice_number}
                        <span style={{fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '4px', backgroundColor: status.color, color: 'white'}}>{status.emoji} {status.status}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{inv.period} • Termiņš: {new Date(inv.due_date).toLocaleDateString('lv-LV')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: inv.paid ? '#10b981' : '#ef4444' }}>€{inv.amount.toFixed(2)}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={() => onViewAsHTML(inv)} style={{ fontSize: '12px', padding: '4px 8px', background: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>👁️ Skatīt</button>
                        <button onClick={() => onDownloadPDF(inv)} style={{ fontSize: '12px', padding: '4px 8px', background: '#003399', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📥 PDF</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ŪDENS SKAITĪTĀJI */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2>💧 Skaitītāju Rādījumi</h2>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>{new Date(currentPeriod + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</p>
          
          {!isSubmissionAllowed && (
            <div style={{ marginBottom: '15px', padding: '10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> <strong>Rādījumus var iesniegt tikai no {startDay}. līdz {endDay}. datumam.</strong>
            </div>
          )}

          {/* AUKSTAIS ŪDENS */}
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #e0f2fe' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#003399', marginBottom: '12px' }}>❄️ Aukstais ūdens</label>
            
            {/* Rādījumu ievade */}
            <div style={{ marginBottom: '10px' }}>
              <input
                type="number"
                step="0.01"
                placeholder="Skaitītāja rādījums (m³)"
                value={coldCurrent}
                onChange={(e) => setColdCurrent(e.target.value)}
                onBlur={(e) => handleColdBlur(e.target.value)}
                disabled={!isSubmissionAllowed}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', marginBottom: '8px' }}
              />
              <div style={{ fontSize: '11px', color: '#0369a1', background: '#dbeafe', padding: '8px', borderRadius: '4px' }}>
                📊 <strong>Iepriekšējais mēnesis:</strong> {coldPrevious ? `${coldPrevious} m³` : 'nav datos'}
              </div>
            </div>

            {/* Aprēķinātais patēriņš */}
            {coldConsumption !== '—' && (
              <div style={{ padding: '10px', background: '#ecfdf5', borderRadius: '4px', border: '1px solid #d1fae5', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#065f46', fontWeight: '600' }}>
                  ✓ Aprēķinātais patēriņš: <strong>{coldConsumption} m³</strong>
                </div>
                {coldPrice !== '—' && (
                  <div style={{ fontSize: '12px', color: '#065f46', marginTop: '4px' }}>
                    Paredzamā summa: <strong>€{coldPrice}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SILTAIS ŪDENS */}
          <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#d97706', marginBottom: '12px' }}>🔥 Siltais ūdens</label>
            
            {/* Rādījumu ievade */}
            <div style={{ marginBottom: '10px' }}>
              <input
                type="number"
                step="0.01"
                placeholder="Skaitītāja rādījums (m³)"
                value={hotCurrent}
                onChange={(e) => setHotCurrent(e.target.value)}
                onBlur={(e) => handleHotBlur(e.target.value)}
                disabled={!isSubmissionAllowed}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', marginBottom: '8px' }}
              />
              <div style={{ fontSize: '11px', color: '#92400e', background: '#fed7aa', padding: '8px', borderRadius: '4px' }}>
                📊 <strong>Iepriekšējais mēnesis:</strong> {hotPrevious ? `${hotPrevious} m³` : 'nav datos'}
              </div>
            </div>

            {/* Aprēķinātais patēriņš */}
            {hotConsumption !== '—' && (
              <div style={{ padding: '10px', background: '#ffe4e6', borderRadius: '4px', border: '1px solid #fecdd3' }}>
                <div style={{ fontSize: '12px', color: '#9f1239', fontWeight: '600' }}>
                  ✓ Aprēķinātais patēriņš: <strong>{hotConsumption} m³</strong>
                </div>
                {hotPrice !== '—' && (
                  <div style={{ fontSize: '12px', color: '#9f1239', marginTop: '4px' }}>
                    Paredzamā summa: <strong>€{hotPrice}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REKVIZĪTI */}
      <div style={{ marginTop: '20px', background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#333' }}>💳 Rekvizīti apmaksai</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', fontSize: '14px' }}>
          <div>
            <div style={{ color: '#666', fontSize: '12px', marginBottom: '2px' }}>Saņēmējs</div>
            <div style={{ fontWeight: 'bold' }}>{settings?.building_name || 'BIEDRĪBA "BARONA 78"'}</div>
            <div style={{ fontSize: '12px', color: '#4b5563' }}>Reģ. Nr. {settings?.building_code || '40008325768'}</div>
          </div>
          
          <div>
            <div style={{ color: '#666', fontSize: '12px', marginBottom: '2px' }}>Banka</div>
            <div style={{ fontWeight: 'bold' }}>{settings?.payment_bank || 'Habib Bank'}</div>
          </div>

          <div>
            <div style={{ color: '#666', fontSize: '12px', marginBottom: '2px' }}>IBAN</div>
            <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '15px', color: '#003399' }}>{settings?.payment_iban || 'LV62HABA0551064112797'}</div>
          </div>
        </div>

        <div style={{ marginTop: '15px', padding: '12px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fcd34d', color: '#92400e', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>ℹ️</span>
          <strong>Lūdzam, veicot apmaksu, maksājuma mērķī obligāti norādīt rēķina numuru!</strong>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={onCloseToast} />}
    </div>
  );
}