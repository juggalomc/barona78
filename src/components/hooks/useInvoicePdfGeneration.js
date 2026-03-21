/**
 * PDF ģenerēšana utilītas
 * - HTML formatējums (generateInvoicePdfHtml)
 * - pdfMake tabulas (buildInvoiceTableRows, buildPaymentTable)
 */

export function generateInvoicePdfHtml(invoice, apt, settings = {}) {
  const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
  const amountWithoutVat = invoice.amount_without_vat || 0;
  const vatAmount = invoice.vat_amount || 0;
  const amountWithVat = invoice.amount_with_vat || invoice.amount;

  const buildingName = settings.building_name || 'BIEDRĪBA "BARONA 78"';
  const buildingCode = settings.building_code || '40008325768';
  const buildingAddress = settings.building_address || 'Kr. Barona iela 78-14, Rīga, LV-1001';
  const paymentIban = settings.payment_iban || 'LV62HABA0551064112797';
  const paymentBank = settings.payment_bank || 'Habib Bank';
  const paymentEmail = settings.payment_email || 'info@barona78.lv';
  const paymentPhone = settings.payment_phone || '+371 67800000';
  const additionalInfo = settings.additional_invoice_info || '';

  // ===== RINDAS GRUPĒŠANA =====
  const rowsWithoutVat = invoiceDetails
    .filter(d => (d.type === 'tariff' || d.type === 'water' || d.type === 'hot_water' || d.type === 'waste') && (d.vat_rate === 0 || d.vat_rate === undefined))
    .map(detail => {
      if (detail.type === 'water') {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.consumption_m3} m³</td><td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      } else if (detail.type === 'hot_water') {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.consumption_m3} m³</td><td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      } else if (detail.type === 'waste') {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.declared_persons} pers.</td><td style="text-align: right;">€${(detail.amount_without_vat / detail.declared_persons).toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      } else {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${apt.area} m²</td><td style="text-align: right;">€${(detail.amount_without_vat / apt.area).toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      }
    })
    .join('');

  const rowsWithVat = invoiceDetails
    .filter(d => (d.type === 'tariff' || d.type === 'water' || d.type === 'hot_water' || d.type === 'waste') && d.vat_rate > 0)
    .map(detail => {
      if (detail.type === 'water') {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.consumption_m3} m³</td><td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      } else if (detail.type === 'hot_water') {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.consumption_m3} m³</td><td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      } else if (detail.type === 'waste') {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.declared_persons} pers.</td><td style="text-align: right;">€${(detail.amount_without_vat / detail.declared_persons).toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      } else {
        return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${apt.area} m²</td><td style="text-align: right;">€${(detail.amount_without_vat / apt.area).toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
      }
    })
    .join('');

  const debtRows = invoiceDetails
    .filter(d => d.type === 'debt')
    .map(detail => `<tr style="background: #fee2e2;"><td style="color: #991b1b; font-weight: bold;">${detail.tariff_name}</td><td></td><td></td><td style="text-align: right; color: #991b1b; font-weight: bold;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`)
    .join('');

  const overpaymentRows = invoiceDetails
    .filter(d => d.type === 'overpayment')
    .map(detail => `<tr style="background: #dbeafe;"><td style="color: #1e40af; font-weight: bold;">${detail.tariff_name}</td><td></td><td></td><td style="text-align: right; color: #1e40af; font-weight: bold;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`)
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
          <p><strong>PERIODS:</strong> ${invoice.period}</p>
          <p><strong>TERMIŅŠ:</strong> ${new Date(invoice.due_date).toLocaleDateString('lv-LV')}</p>
        </div>

        <div class="divider"></div>

        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
          <div style="font-weight: bold; margin-bottom: 10px; font-size: 13px;">SAŅĒMĒJS:</div>
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Dzīvoklis Nr. ${apt.number}</div>
          ${apt.owner_name ? `<div style="font-size: 12px;">Vārds/Nosaukums: ${apt.owner_name}</div>` : ''}
          ${apt.owner_surname ? `<div style="font-size: 12px;">Uzvārds: ${apt.owner_surname}</div>` : ''}
          ${apt.email ? `<div style="font-size: 12px;">E-pasts: ${apt.email}</div>` : ''}
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
          ${rowsWithoutVat ? `<tr><td colspan="4" class="section-header">Pakalpojumi bez PVN</td></tr>${rowsWithoutVat}` : ''}
          ${rowsWithVat ? `<tr><td colspan="4" class="section-header">Pakalpojumi ar PVN (21%)</td></tr>${rowsWithVat}` : ''}
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
          ${vatAmount > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px;"><span>PVN kopā:</span><span>€${vatAmount.toFixed(2)}</span></div>` : ''}
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
}

export function buildInvoiceTableRows(invoiceDetails, apt) {
  const tableRows = [];
  tableRows.push([
    { text: 'PAKALPOJUMS', bold: true, style: 'tableHeader' },
    { text: 'DAUDZUMS', bold: true, style: 'tableHeader', alignment: 'center' },
    { text: 'CENA', bold: true, style: 'tableHeader', alignment: 'right' },
    { text: 'SUMMA', bold: true, style: 'tableHeader', alignment: 'right' }
  ]);

  // Pakalpojumi BEZ PVN
  const rowsWithoutVat = invoiceDetails.filter(d => 
    (d.type === 'tariff' || d.type === 'water' || d.type === 'hot_water' || d.type === 'waste') && 
    (d.vat_rate === 0 || d.vat_rate === undefined)
  );
  
  if (rowsWithoutVat.length > 0) {
    tableRows.push([
      { text: 'Pakalpojumi bez PVN', colSpan: 4, style: 'sectionHeader' },
      {}, {}, {}
    ]);
    
    rowsWithoutVat.forEach(detail => {
      let quantity = '';
      let unitPrice = '';
      if (detail.type === 'water' || detail.type === 'hot_water') {
        quantity = detail.consumption_m3 + ' m³';
        unitPrice = '€' + detail.price_per_m3.toFixed(4);
      } else if (detail.type === 'waste') {
        quantity = detail.declared_persons + ' pers.';
        unitPrice = '€' + (detail.amount_without_vat / detail.declared_persons).toFixed(4);
      } else {
        quantity = apt.area + ' m²';
        unitPrice = '€' + (detail.amount_without_vat / apt.area).toFixed(4);
      }
      tableRows.push([
        { text: detail.tariff_name, style: 'tableBody' },
        { text: quantity, alignment: 'center', style: 'tableBody' },
        { text: unitPrice, alignment: 'right', style: 'tableBody' },
        { text: '€' + detail.amount_without_vat.toFixed(2), alignment: 'right', style: 'tableBody' }
      ]);
    });
  }

  // Pakalpojumi AR PVN
  const rowsWithVat = invoiceDetails.filter(d => 
    (d.type === 'tariff' || d.type === 'water' || d.type === 'hot_water' || d.type === 'waste') && 
    d.vat_rate > 0
  );
  
  if (rowsWithVat.length > 0) {
    tableRows.push([
      { text: 'Pakalpojumi ar PVN (21%)', colSpan: 4, style: 'sectionHeader' },
      {}, {}, {}
    ]);
    
    rowsWithVat.forEach(detail => {
      let quantity = '';
      let unitPrice = '';
      if (detail.type === 'water' || detail.type === 'hot_water') {
        quantity = detail.consumption_m3 + ' m³';
        unitPrice = '€' + detail.price_per_m3.toFixed(4);
      } else if (detail.type === 'waste') {
        quantity = detail.declared_persons + ' pers.';
        unitPrice = '€' + (detail.amount_without_vat / detail.declared_persons).toFixed(4);
      } else {
        quantity = apt.area + ' m²';
        unitPrice = '€' + (detail.amount_without_vat / apt.area).toFixed(4);
      }
      tableRows.push([
        { text: detail.tariff_name, style: 'tableBody' },
        { text: quantity, alignment: 'center', style: 'tableBody' },
        { text: unitPrice, alignment: 'right', style: 'tableBody' },
        { text: '€' + detail.amount_without_vat.toFixed(2), alignment: 'right', style: 'tableBody' }
      ]);
    });
  }

  // PARĀDS (sarkanā krāsā)
  const debtRows = invoiceDetails.filter(d => d.type === 'debt');
  debtRows.forEach(detail => {
    tableRows.push([
      { text: detail.tariff_name, style: 'debt', bold: true },
      { text: '' },
      { text: '' },
      { text: '€' + detail.amount_without_vat.toFixed(2), alignment: 'right', style: 'debt', bold: true }
    ]);
  });

  // PĀRMAKSA (zilā krāsā)
  const overpaymentRows = invoiceDetails.filter(d => d.type === 'overpayment');
  overpaymentRows.forEach(detail => {
    tableRows.push([
      { text: detail.tariff_name, style: 'overpayment', bold: true },
      { text: '' },
      { text: '' },
      { text: '€' + detail.amount_without_vat.toFixed(2), alignment: 'right', style: 'overpayment', bold: true }
    ]);
  });

  return tableRows;
}
