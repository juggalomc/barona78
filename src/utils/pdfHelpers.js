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
  if (!apt) return '<html><body><div style="padding:20px; color:red;">Dzīvokļa dati nav atrasti.</div></body></html>';
  
  let invoiceDetails = [];
  try {
    invoiceDetails = typeof invoice.invoice_details === 'string' 
      ? JSON.parse(invoice.invoice_details) 
      : (invoice.invoice_details || []);
  } catch (e) {
    console.error("Detaļu kļūda:", e);
  }

  const amountWithoutVat = parseFloat(invoice.amount_without_vat) || 0;
  const amountWithVat = parseFloat(invoice.amount_with_vat) || 0;
  const vat21 = invoiceDetails.filter(d => Number(d.vat_rate) === 21).reduce((sum, d) => sum + (parseFloat(d.vat_amount) || 0), 0);
  const vat12 = invoiceDetails.filter(d => Number(d.vat_rate) === 12).reduce((sum, d) => sum + (parseFloat(d.vat_amount) || 0), 0);

  const buildingName = settings.building_name || 'BIEDRĪBA "BARONA 78"';
  const buildingCode = settings.building_code || '40008325768';
  const buildingAddress = settings.building_address || 'Kr. Barona iela 78-14, Rīga, LV-1001';
  const paymentIban = settings.payment_iban || 'LV62HABA0551064112797';

  const waterTypes = ['water', 'hot_water', 'water_diff', 'hot_water_diff'];
  
  const mapHtmlRow = d => {
    const qtyLabel = waterTypes.includes(d.type) ? `${(d.consumption_m3 || 0).toFixed(2)} m³` : 
                     (d.type === 'waste' ? `${d.declared_persons || 0} pers.` : `${apt.area || 0} m²`);
    
    return `<tr>
      <td>${d.tariff_name}</td>
      <td style="text-align: center;">${qtyLabel}</td>
      <td style="text-align: right;">€${(parseFloat(d.price_per_m3) || (d.amount_without_vat / (apt.area || 1))).toFixed(4)}</td>
      <td style="text-align: right;">€${(parseFloat(d.amount_without_vat) || 0).toFixed(2)}</td>
    </tr>`;
  };

  const rowsWithoutVatHtml = invoiceDetails.filter(d => Number(d.vat_rate) === 0).map(mapHtmlRow).join('');
  const rows21Html = invoiceDetails.filter(d => Number(d.vat_rate) === 21).map(mapHtmlRow).join('');
  const rows12Html = invoiceDetails.filter(d => Number(d.vat_rate) === 12).map(mapHtmlRow).join('');

  const debtRows = invoiceDetails.filter(d => d.type === 'debt').map(d => 
    `<tr style="background:#fee2e2; font-weight:bold; color:#991b1b;"><td>${d.tariff_name}</td><td></td><td></td><td style="text-align:right;">€${Math.abs(d.amount_without_vat).toFixed(2)}</td></tr>`
  ).join('');

  const overpaymentRows = invoiceDetails.filter(d => d.type === 'overpayment').map(d => 
    `<tr style="background:#dbeafe; font-weight:bold; color:#1e40af;"><td>${d.tariff_name}</td><td></td><td></td><td style="text-align:right;">€${Math.abs(d.amount_without_vat).toFixed(2)}</td></tr>`
  ).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 40px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { border-bottom: 2px solid #000; padding: 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #eee; }
          .section-header { background: #f5f5f5; font-weight: bold; }
          .total-box { margin-top: 20px; text-align: right; }
          .grand-total { font-size: 24px; color: #003399; font-weight: bold; }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between;">
          <div style="font-size:24px; font-weight:bold;">RĒĶINS</div>
          <div style="text-align:right;"><strong>${buildingName}</strong><br>${buildingCode}<br>${buildingAddress}</div>
        </div>
        <hr>
        <p>Nr: ${invoice.invoice_number}<br>Periods: ${invoice.period}<br>Termiņš: ${new Date(invoice.due_date).toLocaleDateString('lv-LV')}</p>
        
        <div style="background:#f9fafb; padding:15px; border-radius:5px;">
          <strong>SAŅĒMĒJS:</strong><br>Dzīvoklis Nr. ${apt.number}<br>${apt.owner_name} ${apt.owner_surname || ''}
        </div>

        <table>
          <thead><tr><th>PAKALPOJUMS</th><th style="text-align:center;">DAUDZ.</th><th style="text-align:right;">CENA</th><th style="text-align:right;">SUMMA</th></tr></thead>
          <tbody>
            ${rowsWithoutVatHtml ? '<tr><td colspan="4" class="section-header">Bez PVN</td></tr>' + rowsWithoutVatHtml : ''}
            ${rows21Html ? '<tr><td colspan="4" class="section-header">PVN 21%</td></tr>' + rows21Html : ''}
            ${rows12Html ? '<tr><td colspan="4" class="section-header">PVN 12%</td></tr>' + rows12Html : ''}
            ${debtRows}
            ${overpaymentRows}
          </tbody>
        </table>

        <div class="total-box">
          <p>Summa bez PVN: €${amountWithoutVat.toFixed(2)}</p>
          ${vat21 > 0 ? `<p>PVN 21%: €${vat21.toFixed(2)}</p>` : ''}
          ${vat12 > 0 ? `<p>PVN 12%: €${vat12.toFixed(2)}</p>` : ''}
          <p>KOPĀ APMAKSAI:</p>
          <div class="grand-total">€${amountWithVat.toFixed(2)}</div>
        </div>
        <p><strong>IBAN:</strong> ${paymentIban}</p>
      </body>
    </html>`;
};