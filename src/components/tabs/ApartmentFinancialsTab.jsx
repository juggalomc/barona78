import React, { useState } from 'react';
import { calculateApartmentFinancials } from '../../utils/summaryCalculations';
import { loadPdfScripts } from '../../utils/pdfHelpers';
import { TrendingUp, FileSpreadsheet, FileDown, Home } from 'lucide-react';

const styles = {
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
    border: '1px solid #e2e8f0',
    marginBottom: '24px'
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '13.5px',
    marginBottom: '16px',
    color: '#0f172a',
    background: '#ffffff',
    fontWeight: '500'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13.5px'
  },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '12.5px'
  },
  td: {
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9',
    color: '#1e293b'
  },
  btn: {
    padding: '8px 14px',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.15s'
  }
};

export function ApartmentFinancialsTab({ invoices, apartments }) {
  const [selectedApt, setSelectedApt] = useState(apartments[0]?.id || '');
  const data = calculateApartmentFinancials(selectedApt, invoices);

  const totalDebt = data.reduce((sum, row) => sum + row.currentDebt, 0);
  const totalCharged = data.reduce((sum, r) => sum + r.totalCharged, 0);
  const totalPaid = data.reduce((sum, r) => sum + r.totalPaid, 0);

  const exportToCSV = () => {
    const apt = apartments.find(a => a.id === selectedApt);
    const headers = ["Pozīcija", "Aprēķināts kopā (€)", "Apmaksāts (€)", "Atlikušais parāds (€)"];
    const rows = data.map(row => [
      row.name,
      row.totalCharged.toFixed(2),
      row.totalPaid.toFixed(2),
      row.currentDebt.toFixed(2)
    ]);
    
    rows.push([
      "KOPĀ",
      totalCharged.toFixed(2),
      totalPaid.toFixed(2),
      totalDebt.toFixed(2)
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Finanses_Dziv_${apt?.number || 'unknown'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    const apt = apartments.find(a => a.id === selectedApt);
    await loadPdfScripts();
    
    const docDefinition = {
      content: [
        { text: `Dzīvokļa Nr. ${apt?.number} finanšu stāvoklis`, style: 'header' },
        { text: `Īpašnieks: ${apt?.owner_name} ${apt?.owner_surname || ''}`, margin: [0, 0, 0, 20] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Pozīcija', bold: true },
                { text: 'Aprēķināts', bold: true, alignment: 'right' },
                { text: 'Apmaksāts', bold: true, alignment: 'right' },
                { text: 'Parāds', bold: true, alignment: 'right' }
              ],
              ...data.map(r => [
                r.name,
                { text: `€${r.totalCharged.toFixed(2)}`, alignment: 'right' },
                { text: `€${r.totalPaid.toFixed(2)}`, alignment: 'right' },
                { text: `€${r.currentDebt.toFixed(2)}`, alignment: 'right' }
              ]),
              [
                { text: 'KOPĀ', bold: true },
                { text: `€${totalCharged.toFixed(2)}`, bold: true, alignment: 'right' },
                { text: `€${totalPaid.toFixed(2)}`, bold: true, alignment: 'right' },
                { text: `€${totalDebt.toFixed(2)}`, bold: true, alignment: 'right' }
              ]
            ]
          }
        }
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] }
      }
    };
    window.pdfMake.createPdf(docDefinition).download(`Finanses_Dziv_${apt?.number}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 style={styles.title}>
              <TrendingUp size={18} style={{ color: '#2563eb' }} />
              Dzīvokļa finanšu stāvoklis pa pozīcijām
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Detalizēts aprēķināto un nomaksāto summu pārskats konkrētam dzīvoklim
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={exportToCSV} style={{ ...styles.btn, background: '#16a34a' }} title="Eksportēt uz Excel (CSV)">
              <FileSpreadsheet size={15} />
              <span>Excel</span>
            </button>
            <button onClick={exportToPDF} style={{ ...styles.btn, background: '#2563eb' }} title="Eksportēt uz PDF">
              <FileDown size={15} />
              <span>PDF</span>
            </button>
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
            Izvēlieties dzīvokli
          </label>
          <select value={selectedApt} onChange={(e) => setSelectedApt(e.target.value)} style={styles.input}>
            {apartments.sort((a,b) => parseInt(a.number) - parseInt(b.number)).map(apt => (
              <option key={apt.id} value={apt.id}>
                Dzīvoklis {apt.number} ({apt.owner_name})
              </option>
            ))}
          </select>
        </div>

        {/* Quick KPI stats row for selected apartment */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>Aprēķināts kopā</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              €{totalCharged.toFixed(2)}
            </div>
          </div>

          <div style={{ padding: '14px 18px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px', fontWeight: '500' }}>Apmaksāts kopā</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
              €{totalPaid.toFixed(2)}
            </div>
          </div>

          <div style={{
            padding: '14px 18px',
            background: totalDebt > 0 ? '#fff1f2' : '#f0fdf4',
            borderRadius: '10px',
            border: `1px solid ${totalDebt > 0 ? '#fecdd3' : '#bbf7d0'}`
          }}>
            <div style={{ fontSize: '12px', color: totalDebt > 0 ? '#9f1239' : '#166534', marginBottom: '4px', fontWeight: '500' }}>
              Atlikušais parāds
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: totalDebt > 0 ? '#e11d48' : '#15803d', fontVariantNumeric: 'tabular-nums' }}>
              €{totalDebt.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={styles.table}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={styles.th}>Pozīcija (Pakalpojums)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Aprēķināts kopā</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Apmaksāts</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Atlikušais parāds</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                    Nav datu par šo dzīvokli
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((row, i) => (
                    <tr key={i} style={{ transition: 'background 0.15s' }}>
                      <td style={{ ...styles.td, fontWeight: '600', color: '#0f172a' }}>{row.name}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        €{row.totalCharged.toFixed(2)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#15803d', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                        €{row.totalPaid.toFixed(2)}
                      </td>
                      <td style={{
                        ...styles.td,
                        textAlign: 'right',
                        color: row.currentDebt > 0.01 ? '#dc2626' : '#15803d',
                        fontWeight: '700',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        €{row.currentDebt.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc', fontWeight: '700', borderTop: '2px solid #e2e8f0' }}>
                    <td style={{ ...styles.td, color: '#0f172a' }}>KOPĀ</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      €{totalCharged.toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                      €{totalPaid.toFixed(2)}
                    </td>
                    <td style={{
                      ...styles.td,
                      textAlign: 'right',
                      color: totalDebt > 0.01 ? '#dc2626' : '#15803d',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      €{totalDebt.toFixed(2)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}