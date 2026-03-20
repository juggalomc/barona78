import React from 'react';
import { Toast } from './shared/Toast';

export function UserPortal({ userApartment, userInvoices, meterReadings, waterTariffs, hotWaterTariffs, onLogout, onDownloadPDF, onSaveWaterMeterReading, onSaveHotWaterMeterReading, toast, onCloseToast, currentPeriod }) {
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

  const coldCurrent = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'water' && mr.period === currentPeriod)?.reading_value || '';
  const coldPrevious = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'water' && mr.period === previousPeriod)?.reading_value || '';
  const hotCurrent = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'hot_water' && mr.period === currentPeriod)?.reading_value || '';
  const hotPrevious = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'hot_water' && mr.period === previousPeriod)?.reading_value || '';

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
                      <button onClick={() => onDownloadPDF(inv)} style={{ fontSize: '12px', marginTop: '8px', padding: '4px 8px', background: '#003399', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📥 PDF</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2>💧 Skaitītāju Rādījumi</h2>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>{new Date(currentPeriod + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</p>
          
          {/* Aukstais ūdens */}
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #e0f2fe' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>❄️ Aukstais ūdens</label>
            {waterTariffs.find(w => w.period === currentPeriod) ? (
              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Skaitītāja rādījums (m³)"
                  value={meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'water' && mr.period === currentPeriod)?.reading_value || ''}
                  onChange={(e) => onSaveWaterMeterReading(userApartment?.id, e.target.value, currentPeriod)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                />
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  Cena: €{parseFloat(waterTariffs.find(w => w.period === currentPeriod)?.price_per_m3 || 0).toFixed(4)}/m³
                </div>
              </div>
            ) : (
              <p style={{ color: '#999', fontSize: '12px' }}>Tarifs nav norādīts</p>
            )}
          </div>

          {/* Siltais ūdens */}
          <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>🔥 Siltais ūdens</label>
            {hotWaterTariffs.find(w => w.period === currentPeriod) ? (
              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Skaitītāja rādījums (m³)"
                  value={meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'hot_water' && mr.period === currentPeriod)?.reading_value || ''}
                  onChange={(e) => onSaveHotWaterMeterReading(userApartment?.id, e.target.value, currentPeriod)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                />
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  Cena: €{parseFloat(hotWaterTariffs.find(w => w.period === currentPeriod)?.price_per_m3 || 0).toFixed(4)}/m³
                </div>
              </div>
            ) : (
              <p style={{ color: '#999', fontSize: '12px' }}>Tarifs nav norādīts</p>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={onCloseToast} />}
    </div>
  );
}
