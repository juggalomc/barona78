import React, { useState, useMemo } from 'react';
import { styles } from '../shared/styles';
import { calculateMonthlySummary } from '../../utils/summaryCalculations';
import { 
  Building2, 
  Receipt, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  AlertCircle,
  Calendar,
  Check
} from 'lucide-react';

export function OverviewTab({ apartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs, waterConsumption }) {
  // Aprēķinām reālo kopējo parādu, ņemot vērā jau samaksātās summas
  const { totalDebt, apartmentsWithDebt } = useMemo(() => {
    let debt = 0;
    const apts = new Set();
    
    apartments.forEach(apt => {
      const aptInvoices = invoices.filter(inv => inv.apartment_id === apt.id && !inv.paid);
      if (aptInvoices.length === 0) return;
      
      // Ņemam jaunāko rēķinu katram dzīvokļu
      const latest = aptInvoices.reduce((prev, curr) => prev.period > curr.period ? prev : curr);
      
      // Aprēķinām reālo parādu: summa - samaksāts
      const realDebt = (parseFloat(latest.amount) || 0) - (parseFloat(latest.paid_amount) || 0);
      if (realDebt > 0.01) {
        debt += realDebt;
        apts.add(apt.id);
      }
    });
    
    return { totalDebt: debt, apartmentsWithDebt: apts.size };
  }, [apartments, invoices]);

  // Iegūstam visus unikālos periodus no rēķiniem sakārtotā secībā
  const periods = useMemo(() => {
    const p = [...new Set(invoices.map(inv => inv.period))].sort().reverse();
    return p.length > 0 ? p : [new Date().toISOString().slice(0, 7)];
  }, [invoices]);

  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);

  const summary = useMemo(() => 
    calculateMonthlySummary(selectedPeriod, invoices, apartments, tariffs, wasteTariffs, waterTariffs, hotWaterTariffs, waterConsumption),
    [selectedPeriod, invoices, apartments, tariffs, wasteTariffs, waterTariffs, hotWaterTariffs, waterConsumption]
  );

  const formatCurrency = (val) => `€${(val || 0).toFixed(2)}`;

  const paidCount = invoices.filter(i => i.paid).length;
  const pendingCount = invoices.filter(i => !i.paid && new Date(i.due_date) > new Date()).length;
  const overdueCount = invoices.filter(i => !i.paid && new Date(i.due_date) <= new Date()).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI METRIC CARDS */}
      <div style={styles.statsGrid}>
        {/* Dzīvokļi */}
        <div style={styles.stat}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={styles.statLabel}>Dzīvokļi ēkā</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={styles.statValue}>{apartments.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Kopējais dzīvokļu skaits</div>
        </div>

        {/* Tarifi */}
        <div style={styles.stat}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={styles.statLabel}>Aktīvie tarifi</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div style={styles.statValue}>{tariffs.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Pakalpojumu pozīcijas</div>
        </div>

        {/* Rēķini */}
        <div style={styles.stat}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={styles.statLabel}>Kopā rēķini</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={styles.statValue}>{invoices.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Izrakstīto rēķinu arhīvs</div>
        </div>

        {/* Apmaksāti */}
        <div style={styles.stat}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={styles.statLabel}>Apmaksāti rēķini</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ ...styles.statValue, color: '#15803d' }}>{paidCount}</div>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '500' }}>
            {invoices.length > 0 ? `${((paidCount / invoices.length) * 100).toFixed(0)}% no visiem rēķiniem` : '—'}
          </div>
        </div>
      </div>

      {/* PARĀDU BRĪDINĀJUMA KARTĪTE */}
      {totalDebt > 0 && (
        <div style={{
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: '12px',
          padding: '20px 24px',
          color: '#881337',
          boxShadow: '0 1px 3px rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#9f1239' }}>Aktīvais ēkas parāds</div>
                <div style={{ fontSize: '13px', color: '#be123c' }}>Iedzīvotāju neapmaksātie rēķini no iepriekšējiem periodiem</div>
              </div>
            </div>
            <div style={{ padding: '4px 12px', background: '#ffe4e6', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#9f1239' }}>
              Prasa uzmanību
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
              <div style={{ color: '#9f1239', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Kopējā parāda summa</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#9f1239', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(totalDebt)}
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
              <div style={{ color: '#9f1239', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Dzīvokļi ar parādu</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#9f1239', fontVariantNumeric: 'tabular-nums' }}>
                {apartmentsWithDebt} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#be123c' }}>no {apartments.length} dzīvokļiem</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETALIZĒTS MĒNEŠA SALĪDZINĀJUMS */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 style={{ ...styles.cardTitle, margin: 0 }}>
              <Calendar size={18} style={{ color: '#2563eb' }} />
              Detalizēts mēneša salīdzinājums
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Aprēķinātie pakalpojumi pret faktiski izrakstītajiem rēķiniem
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Periods:</span>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontWeight: '600',
                fontSize: '13.5px',
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {summary.rows && summary.rows.map((row, idx) => {
            const maxVal = Math.max(row.calculated, row.invoiced, 1);
            const calcWidth = Math.min((row.calculated / maxVal) * 100, 100);
            const invWidth = Math.min((row.invoiced / maxVal) * 100, 100);
            const diff = row.invoiced - row.calculated;
            const matches = Math.abs(diff) <= 0.05;

            return (
              <div key={idx} style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{row.label}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>bez PVN</span>
                  </div>
                  <div>
                    {matches ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#15803d', fontWeight: '600', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                        <Check size={13} /> Sakrīt
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#b91c1c', fontWeight: '600', background: '#fee2e2', padding: '2px 8px', borderRadius: '6px', fontVariantNumeric: 'tabular-nums' }}>
                        Starpība: {formatCurrency(diff)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Aprēķinātais stabiņš */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '90px', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Aprēķināts:</div>
                    <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${calcWidth}%`, height: '100%', background: '#94a3b8', borderRadius: '9999px', transition: 'width 0.3s' }}></div>
                    </div>
                    <div style={{ width: '85px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(row.calculated)}
                    </div>
                  </div>

                  {/* Izrakstītais stabiņš */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '90px', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Izrakstīts:</div>
                    <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${invWidth}%`, height: '100%', background: row.color || '#2563eb', borderRadius: '9999px', transition: 'width 0.3s' }}></div>
                    </div>
                    <div style={{ width: '85px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(row.invoiced)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* KOPSUMMAS RULLIS */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14.5px' }}>KOPĀ PERIODĀ (bez PVN):</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ color: '#64748b', fontSize: '13.5px' }}>
              Aprēķināts: <span style={{ fontWeight: '600', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(summary.total?.calculated)}</span>
            </div>
            <div style={{ color: '#2563eb', fontSize: '15px' }}>
              Izrakstīts: <span style={{ fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(summary.total?.invoiced)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RĒĶINU STATUSA PĀRSKATS */}
      <div style={styles.card}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ ...styles.cardTitle, margin: 0 }}>
            <FileText size={18} style={{ color: '#2563eb' }} />
            Rēķinu statusi
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Kopējais rēķinu apmaksas stāvoklis sistēmā
          </p>
        </div>
        <div style={styles.summaryGrid}>
          {/* Apmaksāti */}
          <div style={{ ...styles.summaryItem, borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', marginBottom: '8px' }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: '12.5px', fontWeight: '600' }}>Apmaksāti</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
              {paidCount}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Maksājums reģistrēts</div>
          </div>

          {/* Gaida atmaksu */}
          <div style={{ ...styles.summaryItem, borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706', marginBottom: '8px' }}>
              <Clock size={16} />
              <span style={{ fontSize: '12.5px', fontWeight: '600' }}>Gaida apmaksu</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>
              {pendingCount}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Termiņš vēl nav beidzies</div>
          </div>

          {/* Parāds */}
          <div style={{ ...styles.summaryItem, borderLeft: '4px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', marginBottom: '8px' }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '12.5px', fontWeight: '600' }}>Kavētie rēķini</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
              {overdueCount}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Apmaksas termiņš pagājis</div>
          </div>
        </div>
      </div>
    </div>
  );
}
