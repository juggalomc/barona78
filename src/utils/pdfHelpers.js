/**
 * Ielādē pdfMake un vfs_fonts skriptus.
 * @returns {Promise<void>}
 */
export const loadPdfScripts = () => new Promise((resolve, reject) => {
  if (window.pdfMake) {
    resolve();
    return;
  }
  const script1 = document.createElement('script');
  script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.0/pdfmake.min.js';
  const script2 = document.createElement('script');
  script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.0/vfs_fonts.min.js';
  
  let loaded = 0;
  const onLoad = () => { loaded++; if (loaded === 2) resolve(); };
  script1.onload = onLoad; script1.onerror = reject;
  script2.onload = onLoad; script2.onerror = reject;
  document.head.appendChild(script1);
  document.head.appendChild(script2);
});

/**
 * Būvē PDF tabulas rindas no rēķina detaļām.
 * @param {Array} invoiceDetails - Rēķina detaļu masīvs.
 * @param {Object} apt - Dzīvokļa objekts.
 * @returns {Array} pdfMake tabulas rindu masīvs.
 */
export const buildInvoiceTableRows = (invoiceDetails, apt) => {
  const tableRows = [];
  tableRows.push([
    { text: 'PAKALPOJUMS', bold: true, style: 'tableHeader' },
    { text: 'DAUDZUMS', bold: true, style: 'tableHeader', alignment: 'center' },
    { text: 'CENA', bold: true, style: 'tableHeader', alignment: 'right' },
    { text: 'SUMMA', bold: true, style: 'tableHeader', alignment: 'right' }
  ]);

  const waterTypes = ['water', 'hot_water', 'water_diff', 'hot_water_diff', 'cold_water', 'water_meter'];
  const isService = d => ['tariff', 'waste', ...waterTypes].includes(d.type);

  // Pakalpojumi BEZ PVN
  const rowsWithoutVat = invoiceDetails.filter(d => isService(d) && (Number(d.vat_rate) === 0 || d.vat_rate === undefined));
  
  if (rowsWithoutVat.length > 0) {
    tableRows.push([
      { text: 'Pakalpojumi bez PVN', colSpan: 4, style: 'sectionHeader' },
      {}, {}, {}
    ]);
    
    rowsWithoutVat.forEach(detail => {
      let quantity = '';
      let unitPrice = '';
      if (waterTypes.includes(detail.type)) {
        quantity = (detail.consumption_m3 || 0).toFixed(2) + ' m³';
        unitPrice = '€' + (detail.price_per_m3 || 0).toFixed(4);
      } else if (detail.type === 'waste') {
        quantity = (detail.declared_persons || 0) + ' pers.';
        unitPrice = '€' + ((detail.amount_without_vat || 0) / (detail.declared_persons || 1)).toFixed(4);
      } else {
        quantity = (apt.area || 0) + ' m²';
        unitPrice = '€' + ((detail.amount_without_vat || 0) / (apt.area || 1)).toFixed(4);
      }
      tableRows.push([
        { text: detail.tariff_name, style: 'tableBody' },
        { text: quantity, alignment: 'center', style: 'tableBody' },
        { text: unitPrice, alignment: 'right', style: 'tableBody' },
        { text: '€' + (detail.amount_without_vat || 0).toFixed(2), alignment: 'right', style: 'tableBody' }
      ]);
    });
  }

  const addVatRows = (rate) => {
    const rows = invoiceDetails.filter(d => isService(d) && Number(d.vat_rate) === rate);
    if (rows.length > 0) {
      tableRows.push([{ text: `Pakalpojumi ar PVN (${rate}%)`, colSpan: 4, style: 'sectionHeader' }, {}, {}, {}]);
      rows.forEach(detail => {
        let quantity = '';
        let unitPrice = '';
        if (waterTypes.includes(detail.type)) {
          quantity = (detail.consumption_m3 || 0).toFixed(2) + ' m³';
          unitPrice = '€' + (detail.price_per_m3 || 0).toFixed(4);
        } else if (detail.type === 'waste') {
          quantity = (detail.declared_persons || 0) + ' pers.';
          unitPrice = '€' + ((detail.amount_without_vat || 0) / (detail.declared_persons || 1)).toFixed(4);
        } else {
          quantity = (apt.area || 0) + ' m²';
          unitPrice = '€' + ((detail.amount_without_vat || 0) / (apt.area || 1)).toFixed(4);
        }
        tableRows.push([{ text: detail.tariff_name, style: 'tableBody' }, { text: quantity, alignment: 'center', style: 'tableBody' }, { text: unitPrice, alignment: 'right', style: 'tableBody' }, { text: '€' + (detail.amount_without_vat || 0).toFixed(2), alignment: 'right', style: 'tableBody' }]);
      });
    }
  };

  addVatRows(21);
  addVatRows(12);

  // PARĀDS (sarkanā krāsā)
  const debtRows = invoiceDetails.filter(d => d.type === 'debt');
  debtRows.forEach(detail => {
    tableRows.push([
      { text: detail.tariff_name, style: 'debt', bold: true },
      { text: '' },
      { text: '' },
      { text: '€' + (detail.amount_without_vat || 0).toFixed(2), alignment: 'right', style: 'debt', bold: true }
    ]);
  });

  // PĀRMAKSA (zilā krāsā)
  const overpaymentRows = invoiceDetails.filter(d => d.type === 'overpayment');
  overpaymentRows.forEach(detail => {
    tableRows.push([
      { text: detail.tariff_name, style: 'overpayment', bold: true },
      { text: '' },
      { text: '' },
      { text: '€' + (detail.amount_without_vat || 0).toFixed(2), alignment: 'right', style: 'overpayment', bold: true }
    ]);
  });

  return tableRows;
};

/**
 * Ģenerē rēķina HTML attēlojumu.
 */
export const generateInvoicePdfHtml = (invoice, apt, settings = {}) => {
  // ... (HTML ģenerēšanas loģika)
  return `<html>...</html>`; 
};