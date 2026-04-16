import { formatEmailForDisplay } from './emailHelpers';

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
 * @param {Object} invoice - Rēķina objekts.
 * @param {Object} apt - Dzīvokļa objekts.
 * @param {Object} settings - Iestatījumu objekts.
 * @returns {string} HTML virkne.
 */
export const generateInvoicePdfHtml = (invoice, apt, settings = {}) => {
  const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
  const amountWithoutVat = parseFloat(invoice.amount_without_vat) || 0;
  const amountWithVat = parseFloat(invoice.amount_with_vat) || 0;
  const vat21 = invoiceDetails.filter(d => d.vat_rate === 21).reduce((sum, d) => sum + (parseFloat(d.vat_amount) || 0), 0);
  const vat12 = invoiceDetails.filter(d => d.vat_rate === 12).reduce((sum, d) => sum + (parseFloat(d.vat_amount) || 0), 0);

  const buildingName = settings.building_name || 'BIEDRĪBA "BARONA 78"';
  const buildingCode = settings.building_code || '40008325768';
  const buildingAddress = settings.building_address || 'Kr. Barona iela 78-14, Rīga, LV-1001';
  const paymentIban = settings.payment_iban || 'LV62HABA0551064112797';
  const paymentBank = settings.payment_bank || 'Habib Bank';
  const paymentEmail = settings.payment_email || 'info@barona78.lv';
  const paymentPhone = settings.payment_phone || '+371 67800000';
  const additionalInfo = settings.additional_invoice_info || '';

  // ===== RINDAS GRUPĒŠANA =====
  const waterTypes = ['water', 'hot_water', 'water_diff', 'hot_water_diff', 'cold_water', 'water_meter'];
  const isService = d => ['tariff', 'waste', ...waterTypes].includes(d.type);
  
  const mapHtmlRow = d => {
    if (waterTypes.includes(d.type)) {
      // Emoži jau ir ietverts tariff_name (piem. ❄️ Aukstais ūdens)
      const nameWithEmoji = d.tariff_name;
      const consumption = parseFloat(d.consumption_m3 || 0);
      return `<tr><td>${nameWithEmoji}</td><td style="text-align: center;">${consumption.toFixed(2)} m³</td><td style="text-align: right;">€${(parseFloat(d.price_per_m3) || 0).toFixed(4)}</td><td style="text-align: right;">€${(parseFloat(d.amount_without_vat) || 0).toFixed(2)}</td></tr>`;
    } else if (d.type === 'waste') {
      return `<tr><td>${d.tariff_name}</td><td style="text-align: center;">${d.declared_persons || 0} pers.</td><td style="text-align: right;">€${((parseFloat(d.amount_without_vat) || 0) / (d.declared_persons || 1)).toFixed(4)}</td><td style="text-align: right;">€${(parseFloat(d.amount_without_vat) || 0).toFixed(2)}</td></tr>`;
    } else {
      return `<tr><td>${d.tariff_name}</td><td style="text-align: center;">${apt.area || 0} m²</td><td style="text-align: right;">€${((parseFloat(d.amount_without_vat) || 0) / (apt.area || 1)).toFixed(4)}</td><td style="text-align: right;">€${(parseFloat(d.amount_without_vat) || 0).toFixed(2)}</td></tr>`;
    }
  };

  const rowsWithoutVatHtml = invoiceDetails.filter(d => isService(d) && (Number(d.vat_rate) === 0 || d.vat_rate === undefined)).map(mapHtmlRow).join('');
  
  const getVatSectionHtml = (rate) => {
    const rows = invoiceDetails.filter(d => isService(d) && Number(d.vat_rate) === rate);
    if (rows.length === 0) return '';
    return `<tr><td colspan="4" class="section-header">Pakalpojumi ar PVN (${rate}%)</td></tr>${rows.map(mapHtmlRow).join('')}`;
  };

  let allServiceRowsHtml = '';
  if (rowsWithoutVatHtml) allServiceRowsHtml += `<tr><td colspan="4" class="section-header">Pakalpojumi bez PVN</td></tr>${rowsWithoutVatHtml}`;
  allServiceRowsHtml += getVatSectionHtml(21);
  allServiceRowsHtml += getVatSectionHtml(12);

  const debtRows = invoiceDetails
    .filter(d => d.type === 'debt')
    .map(detail => `<tr style="background: #fee2e2;"><td style="color: #991b1b; font-weight: bold;">${detail.tariff_name}</td><td></td><td></td><td style="text-align: right; color: #991b1b; font-weight: bold;">€${(parseFloat(detail.amount_without_vat) || 0).toFixed(2)}</td></tr>`)
    .join('');

  const overpaymentRows = invoiceDetails
    .filter(d => d.type === 'overpayment')
    .map(detail => `<tr style="background: #dbeafe;"><td style="color: #1e40af; font-weight: bold;">${detail.tariff_name}</td><td></td><td></td><td style="text-align: right; color: #1e40af; font-weight: bold;">€${(parseFloat(detail.amount_without_vat) || 0).toFixed(2)}</td></tr>`)
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'DejaVu Sans', 'Arial Unicode MS', Arial, sans-serif; margin: 0; padding: 40px; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; letter-spacing: 0.1em; }
          .company-info { text-align: right; font-size: 12px; }
          .divider { border-top: 3px solid #000; margin: 20px 0; }
          .payment-info-box { background: #f9fafb; color: #5a6c7d; padding: 20px; margin: 20px 0; font-size: 12px; border: 1px solid #d1d5db; }
          .payment-info-box strong { color: #4b5563; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { text-align: left; padding: 8px; border-bottom: 1px solid #000; font-size: 11px; font-weight: bold; }
          td { padding: 8px; font-size: 11px; }
          .section-header { background: #f5f5f5; font-weight: bold; color: #333; padding: 6px 8px; font-size: 11px; }
          .amount-total { font-size: 26px; font-weight: bold; color: #003399; text-align: right; margin: 15px 0; }
          .text-sm { font-size: 10px; }
          .nowrap { white-space: nowrap; }
          .break-word { word-break: break-word; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">RĒĶINS</div>
          <div class="company-info">
            <div style="font-weight: bold; margin-bottom: 10px;">${buildingName}</div>
            <div>${buildingCode}</div>
            <div style="font-size: 11px; margin-top: 5px;">${buildingAddress}</div>
          </div>
        </div>

        <div style="font-size: 12px;">
          <p><strong>Nr:</strong> ${invoice.invoice_number}</p>
          <p><strong>PERIODS:</strong> ${invoice.period} (${new Date(invoice.date_from).toLocaleDateString('lv-LV')} - ${new Date(invoice.date_to).toLocaleDateString('lv-LV')})</p>
          <p><strong>IZRAKSTĪTS:</strong> ${new Date(invoice.created_at || Date.now()).toLocaleDateString('lv-LV')}</p>
          <p><strong>TERMIŅŠ:</strong> ${new Date(invoice.due_date).toLocaleDateString('lv-LV')}</p>
        </div>

        <div class="divider"></div>

        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
          <div style="font-weight: bold; margin-bottom: 10px; font-size: 13px;">SAŅĒMĒJS:</div>
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Dzīvoklis Nr. ${apt.number}</div>
          ${apt.owner_name ? `<div style="font-size: 12px;">Vārds/Nosaukums: ${apt.owner_name}</div>` : ''}
          ${apt.owner_surname ? `<div style="font-size: 12px;">Uzvārds: ${apt.owner_surname}</div>` : ''}
          ${apt.email ? `<div style="font-size: 12px;">E-pasts: ${formatEmailForDisplay(apt.email)}</div>` : ''}
          ${apt.declared_persons ? `<div style="font-size: 12px;">Deklarēto personu skaits: ${apt.declared_persons}</div>` : ''}
          ${apt.registration_number ? `<div style="font-size: 12px; margin-top: 8px; font-weight: bold;">Reģ. numurs: ${apt.registration_number}</div>` : ''}
          ${apt.apartment_address ? `<div style="font-size: 12px;">Adrese: ${apt.apartment_address}</div>` : ''}
          <div style="font-size: 12px; margin-top: 8px;">Platība: ${apt.area} m²</div>
        </div>

        <table>
          <tr>
            <th>PAKALPOJUMS</th>
            <th style="text-align: center;">DAUDZ.</th>
            <th style="text-align: right;">CENA</th>
            <th style="text-align: right;">SUMMA</th>
          </tr>
          ${allServiceRowsHtml}
          ${debtRows}
          ${overpaymentRows}
        </table>

        ${invoice.previous_debt_note ? `
          <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px; color: #991b1b; font-size: 12px; margin: 15px 0;">
            <strong>💬 Parāda paskaidrojums:</strong> ${invoice.previous_debt_note}
          </div>
        ` : ''}

        <div style="text-align: right; margin: 20px 0; border-top: 2px solid #000; padding-top: 15px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
            <span>Summa bez PVN:</span>
            <span>€${amountWithoutVat.toFixed(2)}</span>
          </div>
          ${vat21 > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;"><span>PVN 21%:</span><span>€${vat21.toFixed(2)}</span></div>` : ''}
          ${vat12 > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px;"><span>PVN 12%:</span><span>€${vat12.toFixed(2)}</span></div>` : ''}
          <div style="font-size: 12px; margin-bottom: 15px;">KOPĀ APMAKSAI (EUR):</div>
          <div class="amount-total">€${amountWithVat.toFixed(2)}</div>
        </div>

        ${additionalInfo ? `<div style="background: #f5f5f5; padding: 15px; margin: 30px 0; border-radius: 4px; font-size: 12px; line-height: 1.6;">📝 <strong>Papildus Informācija:</strong><br>${additionalInfo.replace(/\n/g, '<br>')}</div>` : ''}

        <div style="margin-top: 30px;">
          <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 15px; color: #4b5563; font-size: 12px;">Maksājuma rekvizīti</div>
          <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border: 1px solid #e5e7eb;">
            <tr style="background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 12px; font-size: 11px; color: #6b7280; font-weight: bold; width: 40%;">NOSAUKUMS</td>
              <td style="padding: 8px 12px; font-size: 11px; color: #4b5563; font-weight: bold;">${buildingName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 12px; font-size: 11px; color: #6b7280; font-weight: bold;">REĢISTRĀCIJAS KODS</td>
              <td style="padding: 8px 12px; font-size: 11px; color: #4b5563; font-weight: bold;">${buildingCode}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 12px; font-size: 11px; color: #6b7280; font-weight: bold;">ADRESE</td>
              <td style="padding: 8px 12px; font-size: 11px; color: #4b5563; font-weight: bold;">${buildingAddress}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 12px; font-size: 11px; color: #6b7280; font-weight: bold;">BANKA</td>
              <td style="padding: 8px 12px; font-size: 11px; color: #4b5563; font-weight: bold;">${paymentBank}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 12px; font-size: 11px; color: #6b7280; font-weight: bold;">IBAN</td>
              <td style="padding: 8px 12px; font-size: 11px; color: #4b5563; font-weight: bold;">${paymentIban}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 12px; font-size: 11px; color: #6b7280; font-weight: bold;">E-PASTS</td>
              <td style="padding: 8px 12px; font-size: 11px; color: #4b5563; font-weight: bold;">${paymentEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-size: 11px; color: #6b7280; font-weight: bold;">TĀLRUNIS</td>
              <td style="padding: 8px 12px; font-size: 11px; color: #4b5563; font-weight: bold;">${paymentPhone}</td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;
};