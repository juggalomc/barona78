import React from 'react';

export function InvoiceTemplate({ invoice, apartment, building }) {
  const {
    invoiceNumber = '2026/03-12-1740000000',
    period = '2026. gada marts',
    dueDate = '2026-04-15',
    dateCreated = '2026-03-20',
    invoiceDetails = [],
    previousDebt = 0,
    previousDebtNote = '',
    amountWithoutVat = 0,
    vatAmount = 0,
    totalAmount = 0,
  } = invoice || {};

  const {
    number = '12',
    owner_name = 'Vārds Uzvārds',
    area = 75,
    declared_persons = 2,
    registration_number = 'LV05016004137',
    apartment_address = 'Kr. Barona iela 78-14 - 12'
  } = apartment || {};

  const {
    building_name = 'BIEDRĪBA "BARONA 78"',
    building_address = 'Kr. Barona iela 78-14, Rīga',
    building_code = '40008325768',
    payment_iban = 'LV62HABA0551064112797',
    payment_bank = 'Habib Bank',
    payment_email = 'info@barona78.lv',
    payment_phone = '+371 67800000'
  } = building || {};

  const handlePrint = () => window.print();

  const selectAllText = () => {
    const selection = window.getSelection();
    const range = document.createRange();
    const page = document.querySelector('.invoice-page');
    range.selectNodeContents(page);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const amountInWords = (amount) => {
    // Vienkāršots versija - var paplašināt
    const parts = amount.toFixed(2).split('.');
    const euros = parseInt(parts[0]);
    const cents = parseInt(parts[1]);
    
    const eurosText = ['nulle', 'viens', 'divi', 'trīs', 'četri', 'pieci', 'seši', 'septiņi', 'astoņi', 'deviņi'];
    
    return `${euros} eiro un ${cents} centi`;
  };

  const styles = {
    container: {
      background: '#f5f5f5',
      padding: '20px',
      fontFamily: "'DejaVu Sans', 'Arial Unicode MS', Arial, sans-serif"
    },
    page: {
      background: 'white',
      maxWidth: '210mm',
      margin: '0 auto 20px',
      padding: '40px',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      minHeight: '297mm',
      color: '#333',
      lineHeight: '1.6'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '30px',
      borderBottom: '3px solid #003399',
      paddingBottom: '20px'
    },
    headerLeft: {
      flex: 1
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#003399',
      letterSpacing: '0.15em',
      marginBottom: '10px'
    },
    headerRight: {
      textAlign: 'right',
      fontSize: '11px',
      color: '#666'
    },
    companyInfo: {
      fontWeight: 'bold',
      fontSize: '13px',
      marginBottom: '8px',
      lineHeight: '1.4'
    },
    invoiceMeta: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '30px',
      marginBottom: '30px',
      fontSize: '12px'
    },
    metaLabel: {
      fontWeight: 'bold',
      color: '#003399',
      fontSize: '11px',
      textTransform: 'uppercase',
      marginBottom: '4px'
    },
    parties: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '30px',
      marginBottom: '30px'
    },
    party: {
      background: '#f9fafb',
      border: '1px solid #e2e8f0',
      padding: '15px',
      borderRadius: '6px'
    },
    partyTitle: {
      fontWeight: 'bold',
      fontSize: '12px',
      color: '#003399',
      textTransform: 'uppercase',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px solid #cbd5e1'
    },
    partyName: {
      fontWeight: 'bold',
      fontSize: '13px',
      marginBottom: '8px',
      color: '#0f172a'
    },
    partyText: {
      fontSize: '12px',
      lineHeight: '1.5',
      margin: '3px 0'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      margin: '25px 0',
      fontSize: '12px'
    },
    th: {
      background: '#f0f4f8',
      borderBottom: '2px solid #cbd5e1',
      padding: '12px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    td: {
      padding: '10px 12px',
      borderBottom: '1px solid #e2e8f0'
    },
    sectionRow: {
      background: '#f0f4f8',
      fontWeight: 'bold',
      fontSize: '13px',
      color: '#003399',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    amountCell: {
      textAlign: 'right',
      fontWeight: '500'
    },
    totals: {
      marginTop: '30px',
      paddingTop: '20px',
      borderTop: '2px solid #003399'
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '12px'
    },
    totalRowBold: {
      fontWeight: 'bold',
      fontSize: '14px',
      color: '#003399',
      padding: '12px 0',
      borderTop: '1px solid #003399'
    },
    finalAmount: {
      background: 'linear-gradient(135deg, #003399 0%, #0f172a 100%)',
      color: 'white',
      padding: '25px',
      borderRadius: '8px',
      textAlign: 'center',
      margin: '20px 0',
      pageBreakInside: 'avoid'
    },
    amountValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      letterSpacing: '0.05em'
    },
    paymentInfo: {
      background: '#003399',
      color: 'white',
      padding: '20px',
      margin: '20px 0',
      borderRadius: '8px',
      fontSize: '11px'
    },
    paymentGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
      marginTop: '15px',
      lineHeight: '1.5'
    },
    paymentItem: {
      fontSize: '10px'
    },
    paymentLabel: {
      fontSize: '9px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      opacity: '0.8',
      marginBottom: '3px'
    },
    paymentValue: {
      fontWeight: 'bold',
      fontSize: '11px'
    },
    debtWarning: {
      background: '#fee2e2',
      border: '1px solid #fca5a5',
      color: '#991b1b',
      padding: '15px',
      borderRadius: '6px',
      margin: '20px 0',
      fontSize: '12px'
    },
    footerNotes: {
      fontSize: '10px',
      color: '#666',
      marginTop: '30px',
      paddingTop: '20px',
      borderTop: '1px solid #e2e8f0',
      lineHeight: '1.6'
    },
    controls: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      '@media print': {
        display: 'none'
      }
    },
    btn: {
      padding: '10px 20px',
      background: '#003399',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '14px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handlePrint} style={{...styles.btn}}>🖨️ Drukāt</button>
        <button onClick={selectAllText} style={{...styles.btn, background: '#10b981'}}>📋 Atlasīt tekstu</button>
      </div>

      <div className="invoice-page" style={styles.page}>
        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerTitle}>RĒĶINS</div>
            <p style={{margin: '5px 0', fontSize: '12px'}}>Par pakalpojumiem</p>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.companyInfo}>
              {building_name}<br/>
              {building_address}
            </div>
            <div>Reģ. numurs: {building_code}</div>
            <div>PVN numurs: LV{building_code}</div>
          </div>
        </div>

        {/* INVOICE META */}
        <div style={styles.invoiceMeta}>
          <div>
            <div style={styles.metaLabel}>Rēķina numurs</div>
            <div>{invoiceNumber}</div>
            <div style={styles.metaLabel} style={{marginTop: '12px'}}>Sagatavots</div>
            <div>{new Date(dateCreated).toLocaleDateString('lv-LV')}</div>
          </div>
          <div>
            <div style={styles.metaLabel}>Periods</div>
            <div>{period}</div>
            <div style={styles.metaLabel} style={{marginTop: '12px'}}>Apmaksas termiņš</div>
            <div>{new Date(dueDate).toLocaleDateString('lv-LV')}</div>
          </div>
        </div>

        {/* PARTIES */}
        <div style={styles.parties}>
          <div style={styles.party}>
            <div style={styles.partyTitle}>📤 Saņēmējs (Sniedzējs)</div>
            <div style={styles.partyName}>{building_name}</div>
            <div style={styles.partyText}>Juridiskā adrese: {building_address}</div>
            <div style={styles.partyText}>Reģ. numurs: {building_code}</div>
            <div style={styles.partyText}>PVN numurs: LV{building_code}</div>
            <div style={{marginTop: '12px'}}>
              <strong>Norēķinu konto:</strong><br/>
              <span style={{fontSize: '11px'}}>{payment_iban}</span><br/>
              <span style={{fontSize: '11px'}}>{payment_bank}</span>
            </div>
            <div style={{marginTop: '8px'}}>
              <div style={styles.partyText}>📧 <strong>{payment_email}</strong></div>
              <div style={styles.partyText}>☎️ {payment_phone}</div>
            </div>
          </div>

          <div style={styles.party}>
            <div style={styles.partyTitle}>📥 Maksātājs (Dzīvokļa īpašnieks)</div>
            <div style={styles.partyName}>Dzīvoklis Nr. {number}</div>
            <div style={styles.partyText}><strong>{owner_name}</strong></div>
            <div style={styles.partyText}>{apartment_address}</div>
            <div style={{marginTop: '12px'}}>
              <div style={styles.partyText}><strong>Platība:</strong> {area} m²</div>
              <div style={styles.partyText}><strong>Deklarēto personu skaits:</strong> {declared_persons}</div>
              {registration_number && <div style={styles.partyText}><strong>Reģ. numurs:</strong> {registration_number}</div>}
            </div>
          </div>
        </div>

        {/* SERVICES TABLE */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{width: '40%', ...styles.th}}>Pakalpojums / Tarifs</th>
              <th style={{width: '15%', textAlign: 'center', ...styles.th}}>Daudzums</th>
              <th style={{width: '15%', textAlign: 'right', ...styles.th}}>Cena</th>
              <th style={{width: '15%', textAlign: 'right', ...styles.th}}>Summa bez PVN</th>
              <th style={{width: '15%', textAlign: 'right', ...styles.th}}>Kopā</th>
            </tr>
          </thead>
          <tbody>
            {invoiceDetails && invoiceDetails.map((detail, idx) => {
              const showSection = idx === 0 || invoiceDetails[idx-1].type !== detail.type;
              
              return (
                <React.Fragment key={idx}>
                  {showSection && detail.type !== 'debt' && detail.type !== 'overpayment' && (
                    <tr>
                      <td colSpan="5" style={{...styles.sectionRow, ...styles.td}}>
                        {detail.type === 'tariff' && '🏢 Ēkas Apsaimniekošana'}
                        {detail.type === 'water' && '❄️ Aukstais ūdens'}
                        {detail.type === 'hot_water' && '🔥 Siltais ūdens'}
                        {detail.type === 'waste' && '♻️ Atkritumu izvešana'}
                      </td>
                    </tr>
                  )}
                  <tr style={{background: detail.type === 'debt' || detail.type === 'overpayment' ? '#fee2e2' : idx % 2 === 0 ? '#fafbfc' : 'white'}}>
                    <td style={{...styles.td, color: detail.type === 'debt' ? '#991b1b' : 'inherit', fontWeight: detail.type === 'debt' ? 'bold' : 'inherit'}}>
                      {detail.tariff_name}
                    </td>
                    <td style={{...styles.td, textAlign: 'center', color: detail.type === 'debt' ? '#991b1b' : 'inherit', fontWeight: detail.type === 'debt' ? 'bold' : 'inherit'}}>
                      {detail.consumption_m3 ? `${detail.consumption_m3} m³` : detail.declared_persons ? `${detail.declared_persons} pers.` : area ? `${area} m²` : '—'}
                    </td>
                    <td style={{...styles.td, ...styles.amountCell, color: detail.type === 'debt' ? '#991b1b' : 'inherit', fontWeight: detail.type === 'debt' ? 'bold' : 'inherit'}}>
                      {detail.price_per_m3 ? `€${detail.price_per_m3.toFixed(2)}` : '—'}
                    </td>
                    <td style={{...styles.td, ...styles.amountCell, color: detail.type === 'debt' ? '#991b1b' : 'inherit', fontWeight: detail.type === 'debt' ? 'bold' : 'inherit'}}>
                      €{detail.amount_without_vat.toFixed(2)}
                    </td>
                    <td style={{...styles.td, ...styles.amountCell, color: detail.type === 'debt' ? '#991b1b' : 'inherit', fontWeight: detail.type === 'debt' ? 'bold' : 'inherit'}}>
                      €{(detail.amount_without_vat + detail.vat_amount).toFixed(2)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            
            {previousDebt > 0 && (
              <tr style={{background: '#fee2e2'}}>
                <td style={{...styles.td, color: '#991b1b', fontWeight: 'bold'}} colSpan="4">⚠️ Parāds no iepriekšējiem mēnešiem</td>
                <td style={{...styles.td, ...styles.amountCell, color: '#991b1b', fontWeight: 'bold'}}>€{previousDebt.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* TOTALS */}
        <div style={styles.totals}>
          <div style={styles.totalRow}>
            <span>Summa bez PVN:</span>
            <span>€{amountWithoutVat.toFixed(2)}</span>
          </div>
          <div style={styles.totalRow}>
            <span>PVN (21%):</span>
            <span>€{vatAmount.toFixed(2)}</span>
          </div>
          <div style={{...styles.totalRow, ...styles.totalRowBold}}>
            <span>KOPĀ APMAKSAI:</span>
            <span>€{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* FINAL AMOUNT */}
        <div style={styles.finalAmount}>
          <div style={{fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', opacity: '0.9'}}>
            Apmaksas summa (eiro un centi)
          </div>
          <div style={styles.amountValue}>€{totalAmount.toFixed(2)}</div>
          <div style={{fontSize: '12px', marginTop: '10px', opacity: '0.9'}}>
            {amountInWords(totalAmount)}
          </div>
        </div>

        {/* DEBT WARNING */}
        {previousDebtNote && (
          <div style={styles.debtWarning}>
            <div style={{fontWeight: 'bold', marginBottom: '8px', fontSize: '13px'}}>💬 Parāda paskaidrojums</div>
            <div>{previousDebtNote}</div>
          </div>
        )}

        {/* PAYMENT INFO */}
        <div style={styles.paymentInfo}>
          <div style={{fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px', fontSize: '12px', letterSpacing: '0.1em'}}>
            💳 Maksājuma rekvizīti
          </div>
          <div style={styles.paymentGrid}>
            <div style={styles.paymentItem}>
              <div style={styles.paymentLabel}>Saņēmējs</div>
              <div style={styles.paymentValue}>{building_name}</div>
            </div>
            <div style={styles.paymentItem}>
              <div style={styles.paymentLabel}>Reģ. kods</div>
              <div style={styles.paymentValue}>{building_code}</div>
            </div>
            <div style={styles.paymentItem}>
              <div style={styles.paymentLabel}>IBAN</div>
              <div style={styles.paymentValue}>{payment_iban}</div>
            </div>
            <div style={styles.paymentItem}>
              <div style={styles.paymentLabel}>BANKA</div>
              <div style={styles.paymentValue}>{payment_bank}</div>
            </div>
            <div style={styles.paymentItem}>
              <div style={styles.paymentLabel}>E-pasts</div>
              <div style={styles.paymentValue}>{payment_email}</div>
            </div>
            <div style={styles.paymentItem}>
              <div style={styles.paymentLabel}>Tālrunis</div>
              <div style={styles.paymentValue}>{payment_phone}</div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={styles.footerNotes}>
          <p style={{fontWeight: 'bold', marginBottom: '8px'}}>ℹ️ Svarīga informācija:</p>
          <p>• Veicot rēķina apmaksu, obligāti norādiet rēķina numuru: <strong>{invoiceNumber}</strong></p>
          <p>• Apmaksas termiņš: <strong>{new Date(dueDate).toLocaleDateString('lv-LV')}</strong></p>
          <p>• Visiem jautājumiem lūdzam sazināties: {payment_email} vai {payment_phone}</p>
          <p><strong>Paldies par laicīgu maksājumu!</strong></p>
        </div>
      </div>
    </div>
  );
}
