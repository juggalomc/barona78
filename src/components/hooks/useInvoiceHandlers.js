import { useState } from 'react';
import { calculateInvoiceAmounts } from '../../utils/invoiceCalculations';
import { getEmailRecipients, formatEmailForDisplay } from '../../utils/emailHelpers';
import { calculatePreviousDebt, calculateOverpayment } from '../../utils/debtCalculations';
import { buildInvoicePdfDefinition } from '../../utils/invoicePdfDocDefinition';
import { buildInvoiceTableRows, loadPdfScripts, generateInvoicePdfHtml } from '../../utils/pdfHelpers';

const normalizePeriod = (p) => {
  if (!p || typeof p !== 'string') return p;
  const parts = p.split('-');
  if (parts.length !== 2) return p;
  return `${parts[0]}-${parts[1].padStart(2, '0')}`;
};

export function useInvoiceHandlers(supabase, apartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs, meterReadings, fetchData, showToast, settings = {}, enabledMeters = {}, waterConsumption = []) {
  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [invoiceFromDate, setInvoiceFromDate] = useState('');
  const [invoiceToDate, setInvoiceToDate] = useState('');
  const [expandedInvoiceMonth, setExpandedInvoiceMonth] = useState(null);
  const [debtNoteForm, setDebtNoteForm] = useState({ invoiceId: null, note: '' });
  const [overpaymentForm, setOverpaymentForm] = useState({ invoiceId: '', amount: '' });
  const [reminderModal, setReminderModal] = useState({
    open: false,
    invoiceId: null,
    to: '',
    subject: '',
    body: ''
  });
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0, active: false });

  const generateInvoiceForApartment = async (e, apartmentId, currentInvoiceMonth, periodTariffs, dateFrom, dateTo) => {
    e.preventDefault();
    if (!apartmentId || !currentInvoiceMonth || periodTariffs.length === 0) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const apt = apartments.find(a => a.id === apartmentId);
      const normPeriod = normalizePeriod(currentInvoiceMonth);
      const [year, month] = normPeriod.split('-');
      
      let invoiceDateFrom = dateFrom;
      let invoiceDateTo = dateTo;
      
      if (!invoiceDateFrom || !invoiceDateTo) {
        const monthNum = parseInt(month);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        invoiceDateFrom = `${year}-${month}-01`;
        invoiceDateTo = `${year}-${month}-${daysInMonth}`;
      }

      const previousDebt = Number(calculatePreviousDebt(apt.id, invoices, currentInvoiceMonth)) || 0;
      const overpayment = Number(calculateOverpayment(apt.id, invoices, currentInvoiceMonth)) || 0;

      const apartmentTariffs = periodTariffs.filter(t => {
        const excluded = Array.isArray(t.excluded_apartments) ? t.excluded_apartments : JSON.parse(t.excluded_apartments || '[]');
        return !excluded.includes(apt.id);
      });

      const { invoiceDetails, totalAmountWithoutVat, totalVatAmount, totalAmountWithVat } = calculateInvoiceAmounts({
        apt, period: currentInvoiceMonth, periodTariffs: apartmentTariffs, waterTariffs, hotWaterTariffs, wasteTariffs, 
        meterReadings, waterConsumption, apartments, previousDebt, overpayment
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const invoiceNumber = `${year}/${month}-${apt.number}-${timestamp}`;
      const dueDate = new Date(parseInt(year), parseInt(month), 28, 12).toISOString().split('T')[0];

      const { error } = await supabase.from('invoices').upsert([{
        apartment_id: apt.id,
        tariff_id: periodTariffs[0].id,
        invoice_number: invoiceNumber,
        period: currentInvoiceMonth,
        amount: totalAmountWithVat,
        amount_without_vat: totalAmountWithoutVat,
        amount_with_vat: totalAmountWithVat,
        vat_amount: totalVatAmount,
        vat_rate: 0,
        due_date: dueDate,
        date_from: invoiceDateFrom,
        date_to: invoiceDateTo,
        paid: false,
        invoice_details: JSON.stringify(invoiceDetails),
        previous_debt_amount: previousDebt,
        previous_debt_note: '',
        overpayment_amount: overpayment
      }], { onConflict: 'apartment_id,period,tariff_id' });

      if (error) throw error;

      fetchData();
      showToast(`✓ Rēķins ģenerēts dzīv. ${apt.number}`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const sendInvoicesByEmail = async (e, selectedValue) => {
    e.preventDefault();
    
    if (!selectedValue) {
      showToast('Izvēlieties rēķinu vai periodu', 'error');
      return;
    }

    let invoicesToSend = [];

      if (Array.isArray(selectedValue)) {
        invoicesToSend = invoices.filter(inv => selectedValue.includes(inv.id));
      } else if (typeof selectedValue === 'string' && selectedValue.startsWith('period-')) {
      const period = selectedValue.replace('period-', '');
      invoicesToSend = invoices.filter(inv => inv.period === period);
    } else {
      invoicesToSend = invoices.filter(inv => inv.id === selectedValue);
    }

    if (invoicesToSend.length === 0) {
      showToast('Nav rēķinu nosūtīšanai', 'error');
      return;
    }

    try {
      const scriptUrl = settings.google_apps_script_url;
      if (!scriptUrl) {
        showToast('Vispirms iestatījumos norādiet Google Apps Script URL', 'error');
        return;
      }

      showToast('⏳ Ielādē PDF bibliotēkas...', 'info');
      try {
        await loadPdfScripts();
      } catch (err) {
        showToast('Kļūda ielādējot PDF bibliotēkas', 'error');
        return;
      }

      showToast(`⏳ Sāk sūtīt ${invoicesToSend.length} rēķinus...`, 'info');
      setSendingProgress({ current: 0, total: invoicesToSend.length, active: true });
      let sentCount = 0;

      for (const invoice of invoicesToSend) {
        try {
          const apt = apartments.find(a => a.id === invoice.apartment_id);
          if (!apt || !apt.email) continue;

          const recipients = getEmailRecipients(apt.email, 'invoice');
          if (recipients.length === 0) continue;
          const toAddresses = recipients.join(',');

          // 1. Ģenerējam e-pasta tekstu (HTML)
          const emailGreeting = `
            <div style="font-family: Arial, sans-serif; color: #333; margin-bottom: 20px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              <p style="margin: 0 0 10px 0;">Labdien${apt.owner_name ? ', ' + apt.owner_name : ''}!</p>
              <p style="margin: 0 0 10px 0;">Nosūtām Jums rēķinu Nr. <strong>${invoice.invoice_number}</strong> par periodu ${invoice.period}.</p>
              <p style="margin: 0 0 10px 0;">Rēķins ir pievienots šim e-pastam kā PDF pielikums.</p>
              <p style="margin: 0; font-size: 13px; color: #666;">Lūdzam veikt apmaksu līdz ${new Date(invoice.due_date).toLocaleDateString('lv-LV')}. Paldies!</p>
            </div>
          `;

          // 2. Ģenerējam PDF
          const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
          const amountWithoutVat = parseFloat(invoice.amount_without_vat) || 0;
          const amountWithVat = parseFloat(invoice.amount_with_vat) || parseFloat(invoice.amount) || 0;
          const vat21 = Math.round(invoiceDetails.filter(d => Number(d.vat_rate) === 21).reduce((sum, d) => sum + (parseFloat(d.vat_amount) || 0), 0) * 100) / 100;
          const vat12 = Math.round(invoiceDetails.filter(d => Number(d.vat_rate) === 12).reduce((sum, d) => sum + (parseFloat(d.vat_amount) || 0), 0) * 100) / 100;

          const tableRows = buildInvoiceTableRows(invoiceDetails, apt);
          
          const docDefinition = {
            pageSize: 'A4', pageMargins: [15, 15, 15, 15],
            content: [
              { columns: [ { text: 'RĒĶINS', fontSize: 32, bold: true }, { text: `${settings.building_name||'BIEDRĪBA "BARONA 78"'}\n${settings.building_code||'40008325768'}\n${settings.building_address||'Kr. Barona iela 78-14, Rīga, LV-1001'}`, fontSize: 10, alignment: 'right' } ], marginBottom: 20 },
              { columns: [ { width: '50%', text: [ { text: 'Rēķina numurs:\n', bold: true }, `${invoice.invoice_number}\n\n`, { text: 'Periods:\n', bold: true }, `${invoice.period} (${new Date(invoice.date_from).toLocaleDateString('lv-LV')} - ${new Date(invoice.date_to).toLocaleDateString('lv-LV')})\n\n`, { text: 'Izrakstīts:\n', bold: true }, `${new Date(invoice.created_at).toLocaleDateString('lv-LV')}\n\n`, { text: 'Termiņš:\n', bold: true }, new Date(invoice.due_date).toLocaleDateString('lv-LV') ], fontSize: 11 } ], marginBottom: 20 },
              { text: 'SAŅĒMĒJS', fontSize: 12, bold: true, marginBottom: 8 },
              { text: `Dzīvoklis Nr. ${apt.number}\n${apt.owner_name ? 'Vārds: '+apt.owner_name+'\n':''}${apt.email ? 'E-pasts: '+formatEmailForDisplay(apt.email)+'\n':''}`, fontSize: 10, marginBottom: 20 },
              { table: { headerRows: 1, widths: ['*', 90, 80, 80], body: tableRows }, layout: { hLineWidth: ()=>0.5, vLineWidth: ()=>0.5, hLineColor: ()=>'#cccccc', vLineColor: ()=>'#cccccc' }, marginBottom: 15 },
              {
                alignment: 'right',
                columns: [
                  { width: '70%', text: '' },
                  {
                    width: '30%',
                    table: {
                      widths: ['*', '*'],
                      body: [
                        [{text:'Summa bez PVN:', bold:true}, {text:`€${amountWithoutVat.toFixed(2)}`, alignment:'right'}],
                        ...(vat21 > 0 ? [[{text:'PVN 21%:', bold:true}, {text:`€${vat21.toFixed(2)}`, alignment:'right'}]] : []),
                        ...(vat12 > 0 ? [[{text:'PVN 12%:', bold:true}, {text:`€${vat12.toFixed(2)}`, alignment:'right'}]] : []),
                        [{text:'KOPĀ:', fontSize:14, bold:true, color:'#003399'}, {text:`€${amountWithVat.toFixed(2)}`, fontSize:14, bold:true, color:'#003399', alignment:'right'}]
                      ]
                    },
                    layout: 'noBorders'
                  }
                ],
                marginBottom: 30
              },
              ...(settings.additional_invoice_info ? [{ text: '📝 Papildus Informācija:', fontSize: 12, bold: true, marginTop: 20, marginBottom: 8 }, { text: settings.additional_invoice_info, fontSize: 10, marginBottom: 20 }] : []),
              { text: 'MAKSĀJUMA REKVIZĪTI', fontSize: 12, bold: true, marginBottom: 10 },
              { table: { widths: ['30%', '70%'], body: [ ['NOSAUKUMS:', settings.building_name||'BIEDRĪBA "BARONA 78"'], ['REĢISTRĀCIJAS KODS:', settings.building_code||'40008325768'], ['ADRESE:', settings.building_address||'Kr. Barona iela 78-14, Rīga, LV-1001'], ['BANKA:', settings.payment_bank||'Habib Bank'], ['IBAN:', settings.payment_iban||'LV62HABA0551064112797'] ].map(r=>[{text:r[0], bold:true, fontSize:10, color:'#6b7280', fillColor:'#f3f4f6'}, {text:r[1], fontSize:10, color:'#4b5563', fillColor:'#f9fafb'}]) }, layout: { hLineWidth: ()=>1, vLineWidth: ()=>1, hLineColor: ()=>'#e5e7eb', vLineColor: ()=>'#e5e7eb' }, marginBottom: 10 }
            ],
            styles: { tableHeader: {fontSize:10, color:'#000', fillColor:'#f5f5f5'}, sectionHeader: {fontSize:11, bold:true, color:'#333', fillColor:'#f5f5f5'}, tableBody: {fontSize:10}, debt: {color:'#991b1b'}, overpayment: {color:'#1e40af'} }
          };

          const pdfDocGenerator = window.pdfMake.createPdf(docDefinition);
          const base64Pdf = await new Promise((resolve) => pdfDocGenerator.getBase64(resolve));
          
          await sendEmailViaAppsScript(
            toAddresses,
            `Rēķins ${invoice.invoice_number}`,
            emailGreeting,
            scriptUrl,
            [{
              fileName: `rekins_${invoice.invoice_number}.pdf`,
              mimeType: 'application/pdf',
              content: base64Pdf
            }]
          );

          await supabase.from('invoices').update({ sent_at: new Date().toISOString() }).eq('id', invoice.id);
          sentCount++;
          console.log(`✓ Rēķins nosūtīts uz ${toAddresses}.`);
        } catch (itemError) {
          console.error(`Kļūda sūtot rēķinu ${invoice?.invoice_number}:`, itemError);
        } finally {
          setSendingProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        // 3 sekunžu pauze starp e-pastiem, lai nebloķētu sūtīšanu
        await new Promise(r => setTimeout(r, 3000));
      }

      showToast(`✓ Veiksmīgi nosūtīti ${sentCount} rēķini`);
      setSendingProgress({ current: 0, total: 0, active: false });
      fetchData();
    } catch (error) {
      console.error('E-pasta nosūtīšanas kļūda:', error);
      showToast('Kļūda nosūtot e-pastu: ' + error.message, 'error');
    }
  };

  const sendEmailViaAppsScript = async (to, subject, htmlContent, scriptUrl, attachments = []) => {
    if (!scriptUrl) {
      throw new Error('Nav norādīts Google Apps Script URL iestatījumos.');
    }

    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        to: to,
        subject: subject,
        htmlBody: htmlContent,
        attachments: attachments
      })
    });

    if (!response.ok) {
      throw new Error('Google Apps Script kļūda: ' + response.statusText);
    }

    const result = await response.json();
    if (result.status !== 'success') throw new Error('Apps Script ziņoja par kļūdu: ' + result.message);

    return result;
  };

  const generateInvoices = async (e, periodTariffs, currentInvoiceMonth, enabledMeters) => {
    e.preventDefault();
    if (!currentInvoiceMonth) {
      showToast('Izvēlieties mēnesi', 'error');
      return;
    }

    if (periodTariffs.length === 0) {
      showToast(`Nav atzīmētu tarifū periodam ${currentInvoiceMonth}.`, 'error');
      return;
    }

    try {
      const invoicesToAdd = [];
      const normPeriod = normalizePeriod(currentInvoiceMonth);
      const [year, month] = normPeriod.split('-');
      
      let dateFrom = invoiceFromDate;
      let dateTo = invoiceToDate;
      
      if (!dateFrom || !dateTo) {
        const monthNum = parseInt(month);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        dateFrom = dateFrom || `${year}-${month}-01`;
        dateTo = dateTo || `${year}-${month}-${daysInMonth}`;
      }

      const nonReportingColdAptsCount = apartments.filter(aptItem => 
        !meterReadings.find(mr => String(mr.apartment_id) === String(aptItem.id) && mr.meter_type === 'water' && normalizePeriod(mr.period) === normPeriod)
      ).length;

      const nonReportingHotAptsCount = apartments.filter(aptItem => 
        !meterReadings.find(mr => String(mr.apartment_id) === String(aptItem.id) && mr.meter_type === 'hot_water' && normalizePeriod(mr.period) === normPeriod)
      ).length;

      for (const apt of apartments) {
        const previousDebt = Number(calculatePreviousDebt(apt.id, invoices, normPeriod)) || 0;
        const overpayment = Number(await calculateOverpayment(apt.id, invoices, normPeriod)) || 0;

        const apartmentTariffs = periodTariffs.filter(t => {
          const excluded = Array.isArray(t.excluded_apartments) ? t.excluded_apartments : JSON.parse(t.excluded_apartments || '[]');
          return !excluded.includes(apt.id);
        });

        const { invoiceDetails, totalAmountWithoutVat, totalVatAmount, totalAmountWithVat } = calculateInvoiceAmounts({
          apt, period: normPeriod, periodTariffs: apartmentTariffs, waterTariffs, hotWaterTariffs, wasteTariffs, 
          meterReadings, waterConsumption, apartments, previousDebt, overpayment,
          nonReportingColdCount: nonReportingColdAptsCount, nonReportingHotCount: nonReportingHotAptsCount
        });

        if (invoiceDetails.length === 0) continue;
        const timestamp = Math.floor(Date.now() / 1000);
        const invoiceNumber = `${year}/${month}-${apt.number}-${timestamp}`;
        const dueDate = new Date(parseInt(year), parseInt(month), 28, 12).toISOString().split('T')[0];

        invoicesToAdd.push({
          apartment_id: apt.id,
          tariff_id: periodTariffs[0].id,
          invoice_number: invoiceNumber,
          period: normPeriod,
          amount: totalAmountWithVat,
          amount_without_vat: totalAmountWithoutVat,
          amount_with_vat: totalAmountWithVat,
          vat_amount: totalVatAmount,
          vat_rate: 0,
          due_date: dueDate,
          date_from: dateFrom,
          date_to: dateTo,
          paid: false,
          invoice_details: JSON.stringify(invoiceDetails),
          previous_debt_amount: previousDebt,
          previous_debt_note: '',
          overpayment_amount: overpayment
        });
      }

      if (invoicesToAdd.length === 0) {
        showToast('Nav ko ģenerēt.', 'error');
        return;
      }

      const { error } = await supabase.from('invoices').upsert(invoicesToAdd, { onConflict: 'apartment_id,period,tariff_id' });
      if (error) throw error;

      setInvoiceMonth('');
      setInvoiceFromDate('');
      setInvoiceToDate('');
      fetchData();
      showToast(`✓ Ģenerēti ${invoicesToAdd.length} rēķini`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const regenerateInvoice = async (invoice) => {
    if (!window.confirm(`Reģenerēt rēķinu ${invoice.invoice_number}?`)) return;

    try {
      const apt = apartments.find(a => a.id === invoice.apartment_id);
      const periodTariffs = tariffs.filter(t => t.period === invoice.period && t.include_in_invoice !== false);

      if (periodTariffs.length === 0) {
        showToast('Nav atzīmētu tarifū šim periodam', 'error');
        return;
      }

      await supabase.from('invoices').delete().eq('id', invoice.id);

      const previousDebt = Number(calculatePreviousDebt(apt.id, invoices, invoice.period)) || 0;
      const overpayment = Number(calculateOverpayment(apt.id, invoices, invoice.period)) || 0;

      const apartmentTariffs = periodTariffs.filter(t => {
        const excluded = Array.isArray(t.excluded_apartments) ? t.excluded_apartments : JSON.parse(t.excluded_apartments || '[]');
        return !excluded.includes(apt.id);
      });

      const { invoiceDetails, totalAmountWithoutVat, totalVatAmount, totalAmountWithVat } = calculateInvoiceAmounts({
        apt, period: invoice.period, periodTariffs: apartmentTariffs, waterTariffs, hotWaterTariffs, wasteTariffs, 
        meterReadings, waterConsumption, apartments, previousDebt, overpayment
      });

      const { error: insertError } = await supabase.from('invoices').insert([{
        apartment_id: apt.id,
        tariff_id: periodTariffs[0].id,
        invoice_number: invoice.invoice_number,
        period: invoice.period,
        amount: totalAmountWithVat,
        amount_without_vat: totalAmountWithoutVat,
        amount_with_vat: totalAmountWithVat,
        vat_amount: totalVatAmount,
        vat_rate: 0,
        due_date: invoice.due_date,
        date_from: invoice.date_from,
        date_to: invoice.date_to,
        paid: false,
        invoice_details: JSON.stringify(invoiceDetails),
        previous_debt_amount: previousDebt,
        previous_debt_note: invoice.previous_debt_note || '',
        overpayment_amount: overpayment
      }]);

      if (insertError) throw insertError;

      fetchData();
      showToast(`✓ Rēķins ${invoice.invoice_number} reģenerēts`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveDebtNote = async (invoiceId, note) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ previous_debt_note: note })
        .eq('id', invoiceId);
      if (error) throw error;
      setDebtNoteForm({ invoiceId: null, note: '' });
      fetchData();
      showToast('✓ Paskaidrojums saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const toggleInvoicePaid = async (invoiceId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ paid: !currentStatus })
        .eq('id', invoiceId);
      if (error) throw error;
      fetchData();
      showToast(!currentStatus ? '✓ Apmaksāts' : '✓ Neapmaksāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm('Izdzēst rēķinu?')) return;
    try {
      await supabase.from('invoices').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteInvoices = async (ids) => {
    if (!window.confirm(`Izdzēst ${ids.length} rēķinus?`)) return;
    try {
      for (const id of ids) {
        await supabase.from('invoices').delete().eq('id', id);
      }
      fetchData();
      showToast(`✓ Izdzēsti ${ids.length} rēķini`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const regenerateInvoices = async (ids) => {
    if (!window.confirm(`Reģenerēt ${ids.length} rēķinus?`)) return;
    try {
      let regeneratedCount = 0;
      for (const id of ids) {
        const invoice = invoices.find(i => i.id === id);
        if (!invoice) continue;

        const apt = apartments.find(a => a.id === invoice.apartment_id);
        const periodTariffs = tariffs.filter(t => t.period === invoice.period && t.include_in_invoice === true);
        
        if (periodTariffs.length === 0) {
          console.warn(`Nav atzīmētu tarifū periodam ${invoice.period}`);
          continue;
        }

        const originalInvoiceId = invoice.id;
        await supabase.from('invoices').delete().eq('id', originalInvoiceId);

        const previousDebt = Number(calculatePreviousDebt(apt.id, invoices, invoice.period, originalInvoiceId)) || 0;
        const overpayment = Number(calculateOverpayment(apt.id, invoices, invoice.period)) || 0;

        const apartmentTariffs = periodTariffs.filter(t => {
          const excluded = Array.isArray(t.excluded_apartments) ? t.excluded_apartments : JSON.parse(t.excluded_apartments || '[]');
          return !excluded.includes(apt.id);
        });

        const { invoiceDetails, totalAmountWithoutVat, totalVatAmount, totalAmountWithVat } = calculateInvoiceAmounts({
          apt, period: invoice.period, periodTariffs: apartmentTariffs, waterTariffs, hotWaterTariffs, wasteTariffs, 
          meterReadings, waterConsumption, apartments, previousDebt, overpayment
        });

        const [year, month] = invoice.period.split('-');
        const timestamp = Math.floor(Date.now() / 1000);
        const invoiceNumber = `${year}/${month}-${apt.number}-${timestamp}`;
        const dueDate = new Date(parseInt(year), parseInt(month), 28, 12).toISOString().split('T')[0];

        const { error } = await supabase.from('invoices').insert([{
          apartment_id: apt.id,
          tariff_id: periodTariffs[0].id,
          invoice_number: invoiceNumber,
          period: invoice.period,
          amount: totalAmountWithVat,
          amount_without_vat: totalAmountWithoutVat,
          amount_with_vat: totalAmountWithVat,
          vat_amount: totalVatAmount,
          vat_rate: 0,
          due_date: dueDate,
          date_from: invoice.date_from,
          date_to: invoice.date_to,
          paid: false,
          invoice_details: JSON.stringify(invoiceDetails),
          previous_debt_amount: previousDebt,
          previous_debt_note: invoice.previous_debt_note || '',
          overpayment_amount: overpayment
        }]);

        if (!error) regeneratedCount++;
      }
      fetchData();
      showToast(`✓ Reģenerēti ${regeneratedCount} rēķini`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const downloadPDF = (invoice) => {
    const apt = apartments.find(a => a.id === invoice.apartment_id);
    if (!apt) {
      showToast('Dzīvoklis nav atrasts', 'error');
      return;
    }

    try {
      const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.0/pdfmake.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.0/vfs_fonts.min.js')
      ]).then(async () => {
        try {
          showToast('⏳ Ģenerē PDF...', 'info');

          const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];

          const tableRows = buildInvoiceTableRows(invoiceDetails, apt);
          
          const docDefinition = buildInvoicePdfDefinition(invoice, apt, settings, tableRows);
          window.pdfMake.createPdf(docDefinition).download(`rekins_${invoice.invoice_number}.pdf`);
          showToast('✓ PDF lejuplādēts: rekins_' + invoice.invoice_number + '.pdf');

        } catch (error) {
          console.error('PDF ģenerēšanas kļūda:', error);
          showToast('Kļūda PDF ģenerēšanā: ' + error.message, 'error');
        }
      }).catch(err => {
        console.error('Bibliotēku ielādes kļūda:', err);
        showToast('Kļūda ielādējot bibliotēkas', 'error');
      });
    } catch (error) {
      console.error('Neparedzēta kļūda:', error);
      showToast('Neparedzēta kļūda', 'error');
    }
  };

  const exportInvoicesToCSV = () => {
    const headers = ['Rēķina numurs', 'Dzīvoklis', 'Īpašnieks', 'Periods', 'Summa', 'Termiņš', 'Statuss'];
    const rows = invoices.map(inv => {
      const apt = apartments.find(a => a.id === inv.apartment_id);
      return [
        inv.invoice_number,
        apt?.number || '-',
        `${apt?.owner_name || '-'}`,
        inv.period,
        inv.amount.toFixed(2),
        new Date(inv.due_date).toLocaleDateString('lv-LV'),
        inv.paid ? 'Apmaksāts' : 'Gaida'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `rekins_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`✓ Eksportēti ${invoices.length} rēķini`);
  };

  const downloadMonthAsZip = async (period, specificIds = null) => {
    if (!period && !specificIds) {
      showToast('Izvēlieties periodu vai atlasiet rēķinus', 'error');
      return;
    }

    try {
      showToast('⏳ Sagatavo PDF rēķinus ZIP failā...', 'info');
      
      const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.0/pdfmake.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.0/vfs_fonts.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
      ]);

      const JSZip = window.JSZip;
      const zip = new JSZip();
      
      const monthInvoices = specificIds 
        ? invoices.filter(inv => specificIds.includes(inv.id))
        : invoices.filter(inv => inv.period === period);
      
      if (monthInvoices.length === 0) {
        showToast('Nav rēķinu lejuplādei', 'error');
        return;
      }

      showToast(`⏳ Ģenerē ${monthInvoices.length} PDF rēķinus uz ZIP...`, 'info');

      let generatedCount = 0;

      for (let i = 0; i < monthInvoices.length; i++) {
        const invoice = monthInvoices[i];
        const apt = apartments.find(a => a.id === invoice.apartment_id);
        if (!apt) continue;

        try {
          const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
          const tableRows = buildInvoiceTableRows(invoiceDetails, apt);
          const docDefinition = buildInvoicePdfDefinition(invoice, apt, settings, tableRows);
          const pdfDoc = window.pdfMake.createPdf(docDefinition);
          
          const base64 = await new Promise(resolve => pdfDoc.getBase64(resolve));
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          
          const safeFileName = `${invoice.invoice_number}_dziv_${apt.number}`.replace(/[\\/:*?"<>|]/g, '_');
          zip.file(`${safeFileName}.pdf`, blob);
          
          generatedCount++;
          showToast(`📄 Ģenerēts ${generatedCount}/${monthInvoices.length}`, 'info');

        } catch (err) {
          console.error(`Kļūda rēķinam ${invoice.invoice_number}:`, err);
        }
      }

      if (generatedCount > 0) {
        const zipContent = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const zipUrl = URL.createObjectURL(zipContent);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `rekins_${period}.zip`;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(zipUrl);
          showToast(`✓ ZIP lejuplādes ar ${generatedCount} PDF rēķiniem`);
        }, 200);
      }
    } catch (error) {
      console.error('ZIP lejuplādes kļūda:', error);
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const viewAsHTML = (invoice) => {
    const apt = apartments.find(a => a.id === invoice.apartment_id);
    if (!apt) {
      showToast('Dzīvoklis nav atrasts', 'error');
      return;
    }
    
    let htmlContent = generateInvoicePdfHtml(invoice, apt, settings);

    const printButtonHtml = `
      <style>
        @media print { .no-print { display: none !important; } }
        .no-print { position: fixed; top: 20px; right: 20px; z-index: 10000; }
        .print-btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-family: sans-serif; font-size: 14px; transition: background 0.2s; }
        .print-btn:hover { background: #1d4ed8; }
      </style>
      <div class="no-print">
        <button onclick="window.print()" class="print-btn">🖨️ Drukāt</button>
      </div>
    `;

    htmlContent = htmlContent.replace('</body>', `${printButtonHtml}</body>`);

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } else {
      showToast('Lūdzu, atļaujiet uznirstošos logus (pop-ups)', 'error');
    }
  };

  const openReminderModal = (invoice) => {
    if (!invoice) {
      showToast('Rēķins nav atrasts', 'error');
      return;
    }
    if (invoice.paid) {
      showToast('Rēķins jau ir apmaksāts.', 'info');
      return;
    }

    const apt = apartments.find(a => a.id === invoice.apartment_id);
    const recipients = apt ? getEmailRecipients(apt.email, 'invoice') : [];
    
    if (!apt || recipients.length === 0) {
      showToast(`Dzīvoklim ${apt?.number || ''} nav norādīts e-pasts.`, 'error');
      return;
    }

    const subject = `Atgādinājums par neapmaksātu rēķinu: ${invoice.invoice_number}`;
    const emailBodyHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #d9534f;">Atgādinājums par apmaksu</h2>
            <p>Labdien, ${apt.owner_name || 'cien. klient'},</p>
            <p>Vēlamies Jums atgādināt par neapmaksātu rēķinu par apsaimniekošanas pakalpojumiem.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Rēķina nr.:</td><td style="padding: 8px; border: 1px solid #ddd;">${invoice.invoice_number}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Periods:</td><td style="padding: 8px; border: 1px solid #ddd;">${invoice.period}</td></tr>
              <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Summa:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #d9534f;">€${invoice.amount.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Apmaksas termiņš:</td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(invoice.due_date).toLocaleDateString('lv-LV')}</td></tr>
            </table>
            <p>Lūdzam veikt apmaksu tuvākajā laikā. Ja esat jau veicis apmaksu, lūdzu, ignorējiet šo atgādinājumu.</p>
            <div style="background: #f5f5f5; padding: 15px; margin-top: 20px; border-radius: 4px; font-size: 12px;">
              <strong>Maksājuma rekvizīti:</strong><br>
              Saņēmējs: ${settings.building_name || 'BIEDRĪBA "BARONA 78"'}<br>
              Reģ. nr.: ${settings.building_code || '40008325768'}<br>
              Banka: ${settings.payment_bank || 'Habib Bank'}<br>
              IBAN: ${settings.payment_iban || 'LV62HABA0551064112797'}<br>
              Maksājuma mērķī norādiet rēķina numuru: ${invoice.invoice_number}
            </div>
            <p style="margin-top: 20px;">Ar cieņu,<br><strong>${settings.building_name || 'Biedrība "Barona 78"'}</strong></p>
          </div>
        </body>
      </html>
    `;

    setReminderModal({
      open: true,
      invoiceId: invoice.id,
      to: recipients.join(', '),
      subject: subject,
      body: emailBodyHtml
    });
  };

  const closeReminderModal = () => {
    setReminderModal(prev => ({ ...prev, open: false }));
  };

  const sendReminderFromModal = async () => {
    const scriptUrl = settings.google_apps_script_url;
    if (!scriptUrl) {
      showToast('Vispirms iestatījumos norādiet Google Apps Script URL', 'error');
      return;
    }

    try {
      showToast(`Sūta atgādinājumu uz ${reminderModal.to}...`, 'info');
      await sendEmailViaAppsScript(reminderModal.to, reminderModal.subject, reminderModal.body, scriptUrl);
      showToast('✓ Atgādinājums nosūtīts!');
      closeReminderModal();
    } catch (error) {
      console.error('Atgādinājuma nosūtīšanas kļūda:', error);
      showToast('Kļūda nosūtot atgādinājumu: ' + error.message, 'error');
    }
  };

  const sendAllReminders = async () => {
    const today = new Date().toISOString().split('T')[0];
    const overdueInvoices = invoices.filter(inv => !inv.paid && inv.due_date < today);

    if (overdueInvoices.length === 0) {
      showToast('Nav kavētu rēķinu', 'info');
      return;
    }

    if (!window.confirm(`Vai tiešām vēlaties nosūtīt atgādinājumus ${overdueInvoices.length} kavētiem rēķiniem?`)) {
      return;
    }

    const scriptUrl = settings.google_apps_script_url;
    if (!scriptUrl) {
      showToast('Vispirms iestatījumos norādiet Google Apps Script URL', 'error');
      return;
    }

    showToast(`Sāk sūtīt ${overdueInvoices.length} atgādinājumus...`, 'info');
    setSendingProgress({ current: 0, total: overdueInvoices.length, active: true });
    
    let sentCount = 0;

    for (const invoice of overdueInvoices) {
      const apt = apartments.find(a => a.id === invoice.apartment_id);
      try {
        if (!apt || !apt.email) continue;

        const recipients = getEmailRecipients(apt.email, 'invoice');
        if (recipients.length === 0) continue;

        const subject = `Atgādinājums par neapmaksātu rēķinu: ${invoice.invoice_number}`;
        const emailBodyHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #d9534f;">Atgādinājums par apmaksu</h2>
                <p>Labdien, ${apt.owner_name || 'cien. klient'},</p>
                <p>Vēlamies Jums atgādināt par neapmaksātu rēķinu par apsaimniekošanas pakalpojumiem.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Rēķina nr.:</td><td style="padding: 8px; border: 1px solid #ddd;">${invoice.invoice_number}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Periods:</td><td style="padding: 8px; border: 1px solid #ddd;">${invoice.period}</td></tr>
                  <tr style="background-color: #f9f9f9;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Summa:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #d9534f;">€${invoice.amount.toFixed(2)}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Apmaksas termiņš:</td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(invoice.due_date).toLocaleDateString('lv-LV')}</td></tr>
                </table>
                <p>Lūdzam veikt apmaksu tuvākajā laikā. Ja esat jau veicis apmaksu, lūdzu, ignorējiet šo atgādinājumu.</p>
                <div style="background: #f5f5f5; padding: 15px; margin-top: 20px; border-radius: 4px; font-size: 12px;">
                  <strong>Maksājuma rekvizīti:</strong><br>
                  Saņēmējs: ${settings.building_name || 'BIEDRĪBA "BARONA 78"'}<br>
                  Reģ. nr.: ${settings.building_code || '40008325768'}<br>
                  Banka: ${settings.payment_bank || 'Habib Bank'}<br>
                  IBAN: ${settings.payment_iban || 'LV62HABA0551064112797'}<br>
                  Maksājuma mērķī norādiet rēķina numuru: ${invoice.invoice_number}
                </div>
                <p style="margin-top: 20px;">Ar cieņu,<br><strong>${settings.building_name || 'Biedrība "Barona 78"'}</strong></p>
              </div>
            </body>
          </html>
        `;

        const toAddresses = recipients.join(',');
        await sendEmailViaAppsScript(toAddresses, subject, emailBodyHtml, scriptUrl);
        sentCount++;
      } catch (error) {
        console.error(`Kļūda sūtot atgādinājumu:`, error);
      } finally {
        setSendingProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
      
      // 3 sekunžu pauze starp atgādinājumiem
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    showToast(`Pabeigts. Nosūtīti ${sentCount} atgādinājumi.`);
    setSendingProgress({ current: 0, total: 0, active: false });
  };

  return {
    invoiceMonth, setInvoiceMonth,
    invoiceFromDate, setInvoiceFromDate,
    invoiceToDate, setInvoiceToDate,
    expandedInvoiceMonth, setExpandedInvoiceMonth,
    debtNoteForm, setDebtNoteForm,
    overpaymentForm, setOverpaymentForm,
    calculatePreviousDebt,
    calculateOverpayment,
    generateInvoices,
    generateInvoiceForApartment,
    saveDebtNote,
    sendInvoicesByEmail,
    sendEmailViaAppsScript,
    regenerateInvoice,
    regenerateInvoices,
    toggleInvoicePaid,
    deleteInvoice,
    deleteInvoices,
    downloadPDF,
    exportInvoicesToCSV,
    downloadMonthAsZip,
    viewAsHTML,
    openReminderModal,
    closeReminderModal,
    sendReminderFromModal,
    reminderModal,
    setReminderModal,
    sendAllReminders,
    sendingProgress
  };
}