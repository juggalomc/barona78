import { formatEmailForDisplay } from './emailHelpers';

/**
 * Uzbūvē pdfMake dokumenta definīciju rēķinam
 */
export const buildInvoicePdfDefinition = (invoice, apt, settings, tableRows) => {
  const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
  const amountWithoutVat = parseFloat(invoice.amount_without_vat) || 0;
  const amountWithVat = parseFloat(invoice.amount_with_vat) || 0;
  const vat21 = invoiceDetails.filter(d => d.vat_rate === 21).reduce((sum, d) => sum + (parseFloat(d.vat_amount) || 0), 0);
  const vat12 = invoiceDetails.filter(d => d.vat_rate === 12).reduce((sum, d) => sum + (parseFloat(d.vat_amount) || 0), 0);

  return {
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 30],
    content: [
      {
        columns: [
          { text: 'RĒĶINS', fontSize: 32, bold: true },
          {
            text: `${settings.building_name || 'BIEDRĪBA "BARONA 78"'}\n${settings.building_code || '40008325768'}\n${settings.building_address || 'Kr. Barona iela 78-14, Rīga, LV-1001'}`,
            fontSize: 10,
            alignment: 'right'
          }
        ],
        marginBottom: 20
      },
      {
        columns: [
          {
            width: '50%',
            text: [
              { text: 'Rēķina numurs:\n', bold: true },
              `${invoice.invoice_number}\n\n`,
              { text: 'Periods:\n', bold: true },
              `${invoice.period} (${new Date(invoice.date_from).toLocaleDateString('lv-LV')} - ${new Date(invoice.date_to).toLocaleDateString('lv-LV')})\n\n`,
              { text: 'Izrakstīts:\n', bold: true },
              `${new Date(invoice.created_at || Date.now()).toLocaleDateString('lv-LV')}\n\n`,
              { text: 'Termiņš:\n', bold: true },
              new Date(invoice.due_date).toLocaleDateString('lv-LV')
            ],
            fontSize: 11
          }
        ],
        marginBottom: 20
      },
      { text: 'SAŅĒMĒJS', fontSize: 12, bold: true, marginBottom: 8 },
      {
        text: [
          { text: `Dzīvoklis Nr. ${apt.number}\n` },
          { text: `${apt.owner_name || ''}\n` },
          apt.registration_number ? { text: `Reģ. Nr.: ${apt.registration_number}\n` } : '',
          apt.apartment_address ? { text: `Adrese: ${apt.apartment_address}\n` } : '',
          apt.email ? { text: `E-pasts: ${formatEmailForDisplay(apt.email)}\n` } : ''
        ],
        fontSize: 10,
        marginBottom: 20
      },
      { table: { headerRows: 1, widths: ['*', 90, 80, 80], body: tableRows }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#cccccc', vLineColor: () => '#cccccc' }, marginBottom: 15 },
      {
        alignment: 'right',
        columns: [
          { width: '70%', text: '' },
          {
            width: '30%',
            table: {
              widths: ['*', '*'],
              body: [
                [{ text: 'Summa bez PVN:', bold: true }, { text: `€${amountWithoutVat.toFixed(2)}`, alignment: 'right' }],
                ...(vat21 > 0 ? [[{ text: 'PVN 21%:', bold: true }, { text: `€${vat21.toFixed(2)}`, alignment: 'right' }]] : []),
                ...(vat12 > 0 ? [[{ text: 'PVN 12%:', bold: true }, { text: `€${vat12.toFixed(2)}`, alignment: 'right' }]] : []),
                [{ text: 'KOPĀ:', fontSize: 14, bold: true, color: '#003399' }, { text: `€${amountWithVat.toFixed(2)}`, alignment: 'right', fontSize: 14, bold: true, color: '#003399' }]
              ]
            },
            layout: 'noBorders'
          }
        ],
        marginBottom: 30
      },
      ...(settings.additional_invoice_info ? [{ text: '📝 Papildus Informācija:', fontSize: 12, bold: true, marginTop: 20, marginBottom: 8 }, { text: settings.additional_invoice_info, fontSize: 10, marginBottom: 20 }] : []),
      { text: 'MAKSĀJUMA REKVIZĪTI', fontSize: 12, bold: true, marginBottom: 10 },
      { table: { widths: ['30%', '70%'], body: [['NOSAUKUMS:', settings.building_name || 'BIEDRĪBA "BARONA 78"'], ['REĢISTRĀCIJAS KODS:', settings.building_code || '40008325768'], ['ADRESE:', settings.building_address || 'Kr. Barona iela 78-14, Rīga, LV-1001'], ['BANKA:', settings.payment_bank || 'Habib Bank'], ['IBAN:', settings.payment_iban || 'LV62HABA0551064112797']].map(r => [{ text: r[0], bold: true, fontSize: 10, color: '#6b7280', fillColor: '#f3f4f6' }, { text: r[1], fontSize: 10, color: '#4b5563', fillColor: '#f9fafb' }]) }, layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#e5e7eb', vLineColor: () => '#e5e7eb' }, marginBottom: 10 }
    ],
    styles: { tableHeader: { fontSize: 10, color: '#000', fillColor: '#f5f5f5' }, sectionHeader: { fontSize: 11, bold: true, color: '#333', fillColor: '#f5f5f5' }, tableBody: { fontSize: 10 }, debt: { color: '#991b1b' }, overpayment: { color: '#1e40af' } }
  };
};