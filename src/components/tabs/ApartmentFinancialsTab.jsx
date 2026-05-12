import React, { useState } from 'react';
import { calculateApartmentFinancials } from '../../utils/summaryCalculations';
import { loadPdfScripts } from '../../utils/pdfHelpers';

const styles = {
  card: { background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '1px solid #e2e8f0' },
  title: { fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '15px' },
  input: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', marginBottom: '15px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#64748b' },
  td: { padding: '12px', borderBottom: '1px solid #f1f5f9' },
  btn: {
    padding: '8px 16px',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }
};

export function ApartmentFinancialsTab({ invoices, apartments }) {
  const [selectedApt, setSelectedApt] = useState(apartments[0]?.id || '');
  const data = calculateApartmentFinancials(selectedApt, invoices);

  const totalDebt = data.reduce((sum, row) => sum + row.currentDebt, 0);

  const exportToCSV = () => {
    const apt = apartments.find(a => a.id === selectedApt);
    const headers = ["Pozīcija", "Aprēķināts kopā (€)", "Apmaksāts (€)", "Atlikušais parāds (€)"];
    const rows = data.map(row => [
      row.name,
      row.totalCharged.toFixed(2),
      row.totalPaid.toFixed(2),
      row.currentDebt.toFixed(2)
    ]);
    
    // Pievieno kopsavilkuma rindu
    rows.push([
      "KOPĀ",
      data.reduce((sum, r) => sum + r.totalCharged, 0).toFixed(2),
      data.reduce((sum, r) => sum + r.totalPaid, 0).toFixed(2),
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
                { text: `€${r.currentDebt.toFixed(2)}`, alignment: 'right', color: r.currentDebt > 0 ? 'red' : 'green' }
              ]),
              [
                { text: 'KOPĀ', bold: true },
                { text: `€${data.reduce((sum, r) => sum + r.totalCharged, 0).toFixed(2)}`, bold: true, alignment: 'right' },
                { text: `€${data.reduce((sum, r) => sum + r.totalPaid, 0).toFixed(2)}`, bold: true, alignment: 'right' },
                { text: `€${totalDebt.toFixed(2)}`, bold: true, alignment: 'right', color: totalDebt > 0 ? 'red' : 'green' }
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
    <div style={{ padding: '20px' }}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div>
            <h2 style={styles.title}>🏠 Dzīvokļa finanšu stāvoklis pa pozīcijām</h2>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Izvēlēties dzīvokli</label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportToCSV} style={{ ...styles.btn, background: '#10b981' }} title="Eksportēt uz Excel (CSV)">
              📊 Excel
            </button>
            <button onClick={exportToPDF} style={{ ...styles.btn, background: '#ef4444' }} title="Eksportēt uz PDF">
              📕 PDF
            </button>
          </div>
        </div>
        
        <select value={selectedApt} onChange={(e) => setSelectedApt(e.target.value)} style={styles.input}>
          {apartments.sort((a,b) => parseInt(a.number) - parseInt(b.number)).map(apt => (
            <option key={apt.id} value={apt.id}>Dzīvoklis {apt.number} ({apt.owner_name})</option>
          ))}
        </select>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Pozīcija (Pakalpojums)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Aprēķināts kopā</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Apmaksāts</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Atlikušais parāds</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="4" style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>Nav datu par šo dzīvokli</td></tr>
              ) : (
                <>
                  {data.map((row, i) => (
                    <tr key={i}>
                      <td style={{ ...styles.td, fontWeight: '600' }}>{row.name}</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>€{row.totalCharged.toFixed(2)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#10b981' }}>€{row.totalPaid.toFixed(2)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: row.currentDebt > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                        €{row.currentDebt.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                    <td style={styles.td}>KOPĀ</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>€{data.reduce((sum, r) => sum + r.totalCharged, 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#10b981' }}>€{data.reduce((sum, r) => sum + r.totalPaid, 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: totalDebt > 0 ? '#ef4444' : '#10b981' }}>
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