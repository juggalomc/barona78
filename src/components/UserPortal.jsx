import React, { useState, useEffect } from 'react';
import { Toast } from './shared/Toast';
import { calculateBaseAmount } from '../utils/invoiceCalculations';
import { 
  Building2, 
  Home, 
  FileText, 
  Droplets, 
  Flame, 
  Eye, 
  Download, 
  KeyRound, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Printer, 
  X, 
  CreditCard,
  Copy,
  Check
} from 'lucide-react';

export function UserPortal({ 
  userApartment, 
  userInvoices, 
  meterReadings, 
  onLogout, 
  onDownloadPDF, 
  onViewAsHTML, 
  onSaveWaterMeterReading, 
  onSaveHotWaterMeterReading, 
  toast, 
  onCloseToast, 
  settings, 
  showToast, 
  onChangePassword 
}) {
  const today = new Date();
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const getInvoiceStatus = (invoice) => {
    if (invoice.paid) {
      return { status: 'Apmaksāts', color: '#10b981', bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 };
    }
    if (invoice.paid_amount > 0) {
      return { status: 'Daļēji apmaksāts', color: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', icon: Clock };
    }
    const dueDate = new Date(invoice.due_date);
    const todayDate = new Date();
    if (todayDate > dueDate) {
      return { status: 'Kavēts', color: '#ef4444', bg: '#fee2e2', text: '#b91c1c', icon: AlertTriangle };
    } else {
      return { status: 'Gaida apmaksu', color: '#f59e0b', bg: '#fef3c7', text: '#b45309', icon: Clock };
    }
  };

  const findLastReading = (meterType) => {
    const relevantReadings = meterReadings
      .filter(mr => 
        mr.apartment_id === userApartment?.id && 
        mr.meter_type === meterType && 
        mr.period < currentPeriod
      )
      .sort((a, b) => b.period.localeCompare(a.period));

    return relevantReadings.length > 0 ? relevantReadings[0] : null;
  };

  // Ūdens rādījumi
  const coldCurrentReading = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'water' && mr.period === currentPeriod)?.reading_value || '';
  const hotCurrentReading = meterReadings.find(mr => mr.apartment_id === userApartment?.id && mr.meter_type === 'hot_water' && mr.period === currentPeriod)?.reading_value || '';

  const lastColdReading = findLastReading('water');
  const coldPrevious = lastColdReading?.reading_value || '';
  const coldPreviousPeriod = lastColdReading ? new Date(lastColdReading.period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'}) : 'nav datos';
  const lastHotReading = findLastReading('hot_water');
  const hotPrevious = lastHotReading?.reading_value || '';
  const hotPreviousPeriod = lastHotReading ? new Date(lastHotReading.period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'}) : 'nav datos';

  const [coldCurrent, setColdCurrent] = useState(coldCurrentReading);
  const [hotCurrent, setHotCurrent] = useState(hotCurrentReading);
  const [copiedIban, setCopiedIban] = useState(false);

  useEffect(() => {
    setColdCurrent(coldCurrentReading);
  }, [coldCurrentReading]);

  useEffect(() => {
    setHotCurrent(hotCurrentReading);
  }, [hotCurrentReading]);

  const coldConsumption = (coldCurrent && coldPrevious) ? (parseFloat(coldCurrent) - parseFloat(coldPrevious)).toFixed(2) : '—';
  const hotConsumption = (hotCurrent && hotPrevious) ? (parseFloat(hotCurrent) - parseFloat(hotPrevious)).toFixed(2) : '—';

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

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState(null);

  const totalDebt = userInvoices.filter(i => !i.paid).reduce((sum, inv) => sum + (inv.amount - (inv.paid_amount || 0)), 0);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Paroles nesakrīt!', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showToast('Parolei jābūt vismaz 4 simbolus garai', 'error');
      return;
    }
    onChangePassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordChange(false);
  };

  const handleCopyIban = () => {
    const iban = settings?.payment_iban || 'LV62HABA0551064112797';
    navigator.clipboard?.writeText(iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
    showToast('IBAN nokopēts starpliktuvē');
  };

  const isLoading = !userApartment && userInvoices.length === 0;
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '15px', color: '#64748b' }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>Ielādē iedzīvotāja datus...</div>
        <div style={{ fontSize: '13px' }}>Lūdzu, uzgaidiet mirkli</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* TOP HERO BAR */}
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '24px 28px',
          borderRadius: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#1e293b',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa'
            }}>
              <Home size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>
                  Dzīvoklis Nr. {userApartment?.number}
                </h1>
                <span style={{ fontSize: '11.5px', background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '6px' }}>
                  Barona 78
                </span>
              </div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13.5px' }}>
                Īpašnieks: <span style={{ color: '#f1f5f9', fontWeight: '500' }}>{userApartment?.owner_name || 'Nav norādīts'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>Kopējais statuss:</div>
              <div style={{
                fontSize: '22px',
                fontWeight: '700',
                color: totalDebt > 0 ? '#f87171' : '#34d399',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {totalDebt === 0 ? 'Viss apmaksāts' : `Parāds: €${totalDebt.toFixed(2)}`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'background 0.15s'
                }}
              >
                <KeyRound size={15} />
                <span>Mainīt paroli</span>
              </button>

              <button
                onClick={onLogout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'background 0.15s'
                }}
              >
                <LogOut size={15} />
                <span>Izrakstīties</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-COLUMN GRID: INVOICES & WATER READINGS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          
          {/* RĒĶINU VĒSTURE */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Rēķinu vēsture</h2>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Jūsu dzīvokļa rēķini un maksājumu statuss</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {userInvoices.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13.5px' }}>
                  Nav reģistrētu rēķinu
                </div>
              ) : (
                userInvoices.map(inv => {
                  const status = getInvoiceStatus(inv);
                  const StatusIcon = status.icon;
                  const remainingToPay = inv.amount - (inv.paid_amount || 0);

                  return (
                    <div 
                      key={inv.id} 
                      style={{
                        padding: '14px 16px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                            Nr. {inv.invoice_number}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: status.bg,
                            color: status.text
                          }}>
                            <StatusIcon size={12} />
                            {status.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Periods: <strong style={{ color: '#334155' }}>{inv.period}</strong> • Termiņš: {new Date(inv.due_date).toLocaleDateString('lv-LV')}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <div style={{
                          fontWeight: '700',
                          fontSize: '15px',
                          color: inv.paid ? '#15803d' : '#b91c1c',
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {inv.paid ? `€${inv.amount.toFixed(2)}` : `€${remainingToPay.toFixed(2)}`}
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              padding: '5px 10px',
                              background: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            <Eye size={13} />
                            <span>Skatīt</span>
                          </button>

                          <button
                            onClick={() => onDownloadPDF(inv)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              padding: '5px 10px',
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            <Download size={13} />
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Administratora piezīme */}
              {settings?.user_portal_info && (
                <div style={{
                  marginTop: '12px',
                  padding: '14px 16px',
                  background: '#eff6ff',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                  color: '#1e40af',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}>
                  {settings.user_portal_info}
                </div>
              )}
            </div>
          </div>

          {/* ŪDENS SKAITĪTĀJU RĀDĪJUMI */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Skaitītāju rādījumi</h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Periods: {new Date(currentPeriod + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: '500' }}>
                Iesniegšana: {startDay}.–{endDay}. datums
              </div>
            </div>

            {!isSubmissionAllowed && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 14px',
                background: '#fffbeb',
                border: '1px solid #fef08a',
                borderRadius: '8px',
                color: '#92400e',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Clock size={16} style={{ color: '#d97706', shrink: 0 }} />
                <span>Rādījumus iespējams nodot katra mēneša no {startDay}. līdz {endDay}. datumam.</span>
              </div>
            )}

            {/* AUKSTAIS ŪDENS */}
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#0284c7', fontWeight: '700', fontSize: '13.5px' }}>
                <Droplets size={16} />
                <span>Aukstais ūdens (m³)</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ievadiet rādījumu"
                  value={coldCurrent}
                  onChange={(e) => setColdCurrent(e.target.value)}
                  onBlur={(e) => handleColdBlur(e.target.value)}
                  disabled={!isSubmissionAllowed}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontVariantNumeric: 'tabular-nums',
                    background: isSubmissionAllowed ? '#ffffff' : '#f1f5f9'
                  }}
                />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>m³</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px' }}>
                <span>Iepriekšējais ({coldPreviousPeriod}):</span>
                <strong style={{ color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                  {coldPrevious ? `${coldPrevious} m³` : 'nav datos'}
                </strong>
              </div>

              {coldConsumption !== '—' && (
                <div style={{ marginTop: '8px', padding: '6px 10px', background: '#dcfce7', borderRadius: '6px', fontSize: '12px', color: '#15803d', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Aprēķinātais patēriņš:</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{coldConsumption} m³</span>
                </div>
              )}
            </div>

            {/* SILTAIS ŪDENS */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#d97706', fontWeight: '700', fontSize: '13.5px' }}>
                <Flame size={16} />
                <span>Karstais ūdens (m³)</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ievadiet rādījumu"
                  value={hotCurrent}
                  onChange={(e) => setHotCurrent(e.target.value)}
                  onBlur={(e) => handleHotBlur(e.target.value)}
                  disabled={!isSubmissionAllowed}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontVariantNumeric: 'tabular-nums',
                    background: isSubmissionAllowed ? '#ffffff' : '#f1f5f9'
                  }}
                />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>m³</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px' }}>
                <span>Iepriekšējais ({hotPreviousPeriod}):</span>
                <strong style={{ color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                  {hotPrevious ? `${hotPrevious} m³` : 'nav datos'}
                </strong>
              </div>

              {hotConsumption !== '—' && (
                <div style={{ marginTop: '8px', padding: '6px 10px', background: '#fff1f2', borderRadius: '6px', fontSize: '12px', color: '#9f1239', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Aprēķinātais patēriņš:</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{hotConsumption} m³</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PAYMENT REQUISITES CARD */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Rekvizīti rēķinu apmaksai</h2>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Bankas pārskaitījuma dati rēķinu apmaksai</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '13.5px' }}>
            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '11.5px', marginBottom: '4px' }}>Maksājuma saņēmējs</div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{settings?.building_name || 'BIEDRĪBA "BARONA 78"'}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Reģ. Nr. {settings?.building_code || '40008325768'}</div>
            </div>

            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '11.5px', marginBottom: '4px' }}>Saņēmēja banka</div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{settings?.payment_bank || 'Swedbank AS'}</div>
            </div>

            <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '11.5px', marginBottom: '4px' }}>Konta numurs (IBAN)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '14px', color: '#2563eb' }}>
                  {settings?.payment_iban || 'LV62HABA0551064112797'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyIban}
                  title="Kopēt IBAN"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedIban ? '#16a34a' : '#64748b',
                    padding: '2px'
                  }}
                >
                  {copiedIban ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: '#fffbeb',
            borderRadius: '8px',
            border: '1px solid #fef08a',
            color: '#92400e',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Clock size={16} style={{ color: '#d97706', shrink: 0 }} />
            <span>Veicot pārskaitījumu, <strong>maksājuma mērķī obligāti norādiet rēķina numuru un dzīvokļa numuru</strong>!</span>
          </div>
        </div>

        {/* PASSWORD CHANGE MODAL */}
        {showPasswordChange && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div style={{
              background: '#ffffff',
              padding: '28px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '360px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                Mainīt paroli
              </h3>
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Jaunā parole
                  </label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Atkārtot jauno paroli
                  </label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordChange(false)} 
                    style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                  >
                    Atcelt
                  </button>
                  <button 
                    type="submit" 
                    style={{ padding: '8px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    Saglabāt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INVOICE PREVIEW MODAL */}
        {viewingInvoice && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}>
              {/* Modal Top Bar */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>
                  Rēķina apskate: Nr. {viewingInvoice.invoice_number}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => window.print()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                  >
                    <Printer size={14} />
                    <span>Drukāt</span>
                  </button>
                  <button
                    onClick={() => setViewingInvoice(null)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    <X size={14} />
                    <span>Aizvērt</span>
                  </button>
                </div>
              </div>

              {/* Invoice Body */}
              <div style={{ padding: '36px', overflowY: 'auto', flex: 1, color: '#0f172a', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e3a8a', letterSpacing: '-0.02em' }}>
                      {settings?.building_name || 'BARONA 78'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{settings?.building_address || 'Krišjāņa Barona iela 78, Rīga'}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Reģ. Nr. {settings?.building_code || '40008325768'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                      RĒĶINS Nr. {viewingInvoice.invoice_number}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Datums: {new Date(viewingInvoice.created_at || Date.now()).toLocaleDateString('lv-LV')}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626' }}>
                      Apmaksas termiņš: {new Date(viewingInvoice.due_date).toLocaleDateString('lv-LV')}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>
                    Maksātājs:
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '14.5px' }}>Dzīvoklis Nr. {userApartment?.number}</div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>{userApartment?.owner_name}</div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>Periods: {viewingInvoice.period}</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #0f172a' }}>
                      <th style={{ textAlign: 'left', padding: '10px 6px', fontSize: '13px', color: '#0f172a' }}>Pakalpojums</th>
                      <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '13px', color: '#0f172a' }}>Summa (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 6px', fontSize: '13.5px' }}>Rēķina summa par periodu {viewingInvoice.period}</td>
                      <td style={{ padding: '12px 6px', textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                        €{viewingInvoice.amount.toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                      <td style={{ padding: '8px 6px', fontSize: '12.5px', color: '#475569' }}>Summa bez parāda/pārmaksas</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                        €{calculateBaseAmount(viewingInvoice).toFixed(2)}
                      </td>
                    </tr>
                    {viewingInvoice.paid_amount > 0 && (
                      <tr style={{ color: '#16a34a', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 6px', fontSize: '12.5px' }}>Veiktā samaksa</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                          -€{viewingInvoice.paid_amount.toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {viewingInvoice.previous_debt_amount > 0 && (
                      <tr style={{ color: '#dc2626', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 6px', fontSize: '12.5px' }}>Iepriekšējais parāds</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                          +€{viewingInvoice.previous_debt_amount.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ textAlign: 'right', padding: '16px 6px', fontWeight: '700', fontSize: '15px' }}>
                        {viewingInvoice.paid ? 'APMAKSĀTS:' : 'ATLIKUMS APMAKSAI:'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 6px', fontWeight: '800', fontSize: '20px', color: '#1d4ed8', fontVariantNumeric: 'tabular-nums' }}>
                        €{(viewingInvoice.amount - (viewingInvoice.paid_amount || 0)).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div style={{ fontSize: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '18px', color: '#475569', lineHeight: '1.6' }}>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>MAKSĀJUMA REKVIZĪTI:</div>
                  <div>Saņēmējs: <strong>{settings?.building_name}</strong></div>
                  <div>Banka: <strong>{settings?.payment_bank}</strong></div>
                  <div>IBAN: <strong style={{ fontFamily: 'monospace', fontSize: '13px' }}>{settings?.payment_iban}</strong></div>
                  <div style={{ marginTop: '8px', color: '#92400e', fontWeight: '600' }}>
                    Mērķī obligāti norādīt: Rēķins Nr. {viewingInvoice.invoice_number}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={onCloseToast} />}
    </div>
  );
}