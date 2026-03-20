import { useState } from 'react';
import { BUILDING_NAME, BUILDING_CODE, BUILDING_ADDRESS, TOTAL_AREA } from '../shared/constants';

export function useInvoiceHandlers(supabase, apartments, tariffs, invoices, waterTariffs, wasteTariffs, meterReadings, fetchData, showToast, settings = {}) {
  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [invoiceFromDate, setInvoiceFromDate] = useState('');
  const [invoiceToDate, setInvoiceToDate] = useState('');
  const [expandedInvoiceMonth, setExpandedInvoiceMonth] = useState(null);
  const [debtNoteForm, setDebtNoteForm] = useState({ invoiceId: null, note: '' });
  const [overpaymentForm, setOverpaymentForm] = useState({ apartmentId: null, amount: '', month: '' });

  const calculatePreviousDebt = (apartmentId, currentPeriod) => {
    const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
    const previousDebts = invoices.filter(inv => {
      if (inv.apartment_id !== apartmentId) return false;
      if (inv.paid) return false;
      const [invYear, invMonth] = inv.period.split('-').map(Number);
      if (invYear < currentYear) return true;
      if (invYear === currentYear && invMonth < currentMonth) return true;
      return false;
    });
    const total = previousDebts.reduce((sum, inv) => sum + inv.amount, 0);
    console.log(`💡 Parāds dzīv. ${apartments.find(a => a.id === apartmentId)?.number} par ${currentPeriod}: €${total}`);
    return total;
  };

  const calculateOverpayment = async (apartmentId, currentPeriod) => {
    const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
    const previousMonth = currentMonth === 1 
      ? `${currentYear - 1}-12` 
      : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}`;
    
    try {
      const { data, error } = await supabase
        .from('apartment_overpayments')
        .select('amount')
        .eq('apartment_id', apartmentId)
        .eq('period', previousMonth);
      
      if (error) {
        console.error('Pārmaksas ielādes kļūda:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        console.log(`ℹ️ Nav pārmaksas dzīv. ${apartments.find(a => a.id === apartmentId)?.number} par ${previousMonth}`);
        return 0;
      }

      const overpay = parseFloat(data[0].amount) || 0;
      console.log(`💰 Pārmaksa dzīv. ${apartments.find(a => a.id === apartmentId)?.number} par ${previousMonth}: €${overpay}`);
      return overpay;
    } catch (err) {
      console.error('Kļūda aprēķinot pārmaksu:', err);
      return 0;
    }
  };

  const saveDebtNote = async (invoiceId, note) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ previous_debt_note: note })
        .eq('id', invoiceId);
      
      if (error) throw error;
      fetchData();
      setDebtNoteForm({ invoiceId: null, note: '' });
      showToast('✓ Parāda paskaidrojums saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveOverpayment = async (e) => {
    e.preventDefault();
    if (!overpaymentForm.apartmentId || !overpaymentForm.amount || !overpaymentForm.month) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const amount = parseFloat(overpaymentForm.amount);
      if (amount <= 0) {
        showToast('Pārmaksa jābūt lielāka par 0', 'error');
        return;
      }

      const { data: existing } = await supabase
        .from('apartment_overpayments')
        .select('id')
        .eq('apartment_id', overpaymentForm.apartmentId)
        .eq('period', overpaymentForm.month);

      if (existing && existing.length > 0) {
        await supabase
          .from('apartment_overpayments')
          .update({ amount: amount })
          .eq('id', existing[0].id);
        console.log(`✓ Pārmaksa atjaunināta: ${amount}`);
      } else {
        await supabase
          .from('apartment_overpayments')
          .insert([{
            apartment_id: overpaymentForm.apartmentId,
            period: overpaymentForm.month,
            amount: amount
          }]);
        console.log(`✓ Pārmaksa saglabāta: ${amount}`);
      }

      setOverpaymentForm({ apartmentId: null, amount: '', month: '' });
      fetchData();
      showToast('✓ Pārmaksa saglabāta');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const generateInvoiceForApartment = async (e, apartmentId, currentInvoiceMonth, periodTariffs, dateFrom, dateTo) => {
    e.preventDefault();
    if (!apartmentId || !currentInvoiceMonth || periodTariffs.length === 0) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const apt = apartments.find(a => a.id === apartmentId);
      const [year, month] = currentInvoiceMonth.split('-');
      
      let invoiceDateFrom = dateFrom;
      let invoiceDateTo = dateTo;
      
      if (!invoiceDateFrom || !invoiceDateTo) {
        const monthNum = parseInt(month);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        invoiceDateFrom = `${year}-${month}-01`;
        invoiceDateTo = `${year}-${month}-${daysInMonth}`;
      }

      let totalAmountWithoutVat = 0;
      let totalVatAmount = 0;
      let invoiceDetails = [];

      // Tarifi
      for (const tariff of periodTariffs) {
        const pricePerSqm = parseFloat(tariff.total_amount) / TOTAL_AREA;
        const amountWithoutVat = Math.round(pricePerSqm * parseFloat(apt.area) * 100) / 100;
        const vatRate = parseFloat(tariff.vat_rate) || 0;
        const vatAmount = Math.round(amountWithoutVat * vatRate / 100 * 100) / 100;

        totalAmountWithoutVat += amountWithoutVat;
        totalVatAmount += vatAmount;

        invoiceDetails.push({
          tariff_id: tariff.id,
          tariff_name: tariff.name,
          amount_without_vat: amountWithoutVat,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          type: 'tariff'
        });
      }

      // Ūdens
      const waterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === currentInvoiceMonth);
      const waterTariff = waterTariffs.find(w => w.period === currentInvoiceMonth);

      if (waterReading && waterTariff && waterTariff.include_in_invoice !== false) {
        const waterConsumptionM3 = parseFloat(waterReading.reading_value) || 0;
        const waterPricePerM3 = parseFloat(waterTariff.price_per_m3) || 0;
        const waterAmountWithoutVat = Math.round(waterConsumptionM3 * waterPricePerM3 * 100) / 100;
        const waterVatRate = parseFloat(waterTariff.vat_rate) || 0;
        const waterVatAmount = Math.round(waterAmountWithoutVat * waterVatRate / 100 * 100) / 100;

        totalAmountWithoutVat += waterAmountWithoutVat;
        totalVatAmount += waterVatAmount;

        invoiceDetails.push({
          tariff_id: waterTariff.id,
          tariff_name: `Ūdens (${waterConsumptionM3} m³)`,
          consumption_m3: waterConsumptionM3,
          price_per_m3: waterPricePerM3,
          amount_without_vat: waterAmountWithoutVat,
          vat_rate: waterVatRate,
          vat_amount: waterVatAmount,
          type: 'water'
        });
      }

      // Atkritumi
      const wasteTariff = wasteTariffs.find(w => w.period === currentInvoiceMonth);
      if (wasteTariff && wasteTariff.include_in_invoice !== false) {
        const totalDeclaredPersons = apartments.reduce((sum, a) => sum + (parseInt(a.declared_persons) || 1), 0);
        if (totalDeclaredPersons > 0) {
          const declaredPersonsInApt = parseInt(apt.declared_persons) || 1;
          const wasteAmountWithoutVat = Math.round((parseFloat(wasteTariff.total_amount) / totalDeclaredPersons * declaredPersonsInApt) * 100) / 100;
          const wasteVatRate = parseFloat(wasteTariff.vat_rate) || 0;
          const wasteVatAmount = Math.round(wasteAmountWithoutVat * wasteVatRate / 100 * 100) / 100;

          totalAmountWithoutVat += wasteAmountWithoutVat;
          totalVatAmount += wasteVatAmount;

          invoiceDetails.push({
            tariff_id: wasteTariff.id,
            tariff_name: `♻️ Atkritumu izvešana (${declaredPersonsInApt} pers.)`,
            declared_persons: declaredPersonsInApt,
            total_persons: totalDeclaredPersons,
            amount_without_vat: wasteAmountWithoutVat,
            vat_rate: wasteVatRate,
            vat_amount: wasteVatAmount,
            type: 'waste'
          });
        }
      }

      // Parāds
      const previousDebt = calculatePreviousDebt(apt.id, currentInvoiceMonth);
      if (previousDebt > 0) {
        totalAmountWithoutVat += previousDebt;
        invoiceDetails.push({
          tariff_id: null,
          tariff_name: '⚠️ Parāds no iepriekšējiem mēnešiem',
          amount_without_vat: previousDebt,
          vat_rate: 0,
          vat_amount: 0,
          type: 'debt'
        });
      }

      // Pārmaksa
      const overpayment = await calculateOverpayment(apt.id, currentInvoiceMonth);
      if (overpayment > 0) {
        totalAmountWithoutVat -= overpayment;
        invoiceDetails.push({
          tariff_id: null,
          tariff_name: '💰 Pārmaksa no iepriekšējā mēneša',
          amount_without_vat: -overpayment,
          vat_rate: 0,
          vat_amount: 0,
          type: 'overpayment'
        });
      }

      const totalAmountWithVat = Math.round((totalAmountWithoutVat + totalVatAmount) * 100) / 100;
      const timestamp = Math.floor(Date.now() / 1000);
      const invoiceNumber = `${year}/${month}-${apt.number}-${timestamp}`;
      const dueDate = new Date(year, month, 15).toISOString().split('T')[0];

      const { error } = await supabase.from('invoices').insert([{
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
      }]);

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

    if (selectedValue.startsWith('period-')) {
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
      // Izmantojam Gmail API
      const accessToken = localStorage.getItem('gmail_access_token');
      
      if (!accessToken) {
        showToast('Vispirms pierakstieties ar Google kontā (iestatījumos)', 'error');
        return;
      }

      for (const invoice of invoicesToSend) {
        const apt = apartments.find(a => a.id === invoice.apartment_id);
        if (!apt || !apt.email) {
          console.warn(`Dzīv. ${apt?.number} nav e-pasta adreses`);
          continue;
        }

        // Ģenerēt PDF HTML
        const pdfHtml = generateInvoicePdfHtml(invoice, apt);
        
        // Nosūtīt pa e-pastu
        await sendEmailViaGmail(
          apt.email,
          `Rēķins ${invoice.invoice_number}`,
          pdfHtml,
          accessToken
        );

        console.log(`✓ Rēķins nosūtīts uz ${apt.email}`);
      }

      showToast(`✓ ${invoicesToSend.length} rēķini nosūtīti`);
    } catch (error) {
      console.error('E-pasta nosūtīšanas kļūda:', error);
      showToast('Kļūda nosūtot e-pastu: ' + error.message, 'error');
    }
  };

  const generateInvoicePdfHtml = (invoice, apt) => {
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

    const generateRows = (details, filterFn) => {
      return details.filter(filterFn).map(detail => {
        if (detail.type === 'water') {
          return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.consumption_m3} m³</td><td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
        } else if (detail.type === 'waste') {
          return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${detail.declared_persons} pers.</td><td style="text-align: right;">€${(detail.amount_without_vat / detail.declared_persons).toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
        } else if (detail.type === 'debt') {
          return `<tr style="background: #fee2e2;"><td style="color: #991b1b; font-weight: bold;">${detail.tariff_name}</td><td></td><td></td><td style="text-align: right; color: #991b1b; font-weight: bold;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
        } else if (detail.type === 'overpayment') {
          return `<tr style="background: #dbeafe;"><td style="color: #0369a1; font-weight: bold;">${detail.tariff_name}</td><td></td><td></td><td style="text-align: right; color: #0369a1; font-weight: bold;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
        } else {
          return `<tr><td>${detail.tariff_name}</td><td style="text-align: center;">${apt.area} m²</td><td style="text-align: right;">€${(detail.amount_without_vat / apt.area).toFixed(4)}</td><td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
        }
      }).join('');
    };

    const rowsWithoutVat = generateRows(invoiceDetails, d => (d.type === 'tariff' || d.type === 'water' || d.type === 'waste') && (d.vat_rate === 0 || d.vat_rate === undefined));
    const rowsWithVat = generateRows(invoiceDetails, d => (d.type === 'tariff' || d.type === 'water' || d.type === 'waste') && d.vat_rate > 0);
    const debtRows = generateRows(invoiceDetails, d => d.type === 'debt');
    const overpaymentRows = generateRows(invoiceDetails, d => d.type === 'overpayment');

    return `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 40px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .title { font-size: 24px; font-weight: bold; }
            .company-info { text-align: right; font-size: 12px; }
            .divider { border-top: 3px solid #000; margin: 30px 0; }
            .payment-info-box { background: #003399; color: white; padding: 20px; margin: 30px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th { text-align: left; padding: 10px; border-bottom: 2px solid #000; font-size: 12px; font-weight: bold; }
            td { padding: 12px 10px; }
            .amount-total { font-size: 32px; font-weight: bold; color: #003399; text-align: right; margin: 20px 0; }
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
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Dzīvoklis Nr. ${apt.number}</div>
            <div style="font-size: 14px;">Platība: ${apt.area} m²</div>
          </div>

          <table>
            <tr>
              <th>PAKALPOJUMS</th>
              <th style="text-align: center;">DAUDZ.</th>
              <th style="text-align: right;">CENA</th>
              <th style="text-align: right;">SUMMA</th>
            </tr>
            ${rowsWithoutVat}
            ${rowsWithVat}
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

          <div class="payment-info-box">
            <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 15px;">Maksājuma informācija</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div style="margin-bottom: 5px;">BANKA</div>
                <div style="font-weight: bold;">${paymentBank}</div>
              </div>
              <div>
                <div style="margin-bottom: 5px;">IBAN</div>
                <div style="font-weight: bold;">${paymentIban}</div>
              </div>
              <div>
                <div style="margin-bottom: 5px;">E-PASTS</div>
                <div style="font-weight: bold;">${paymentEmail}</div>
              </div>
              <div>
                <div style="margin-bottom: 5px;">TĀLRUNIS</div>
                <div style="font-weight: bold;">${paymentPhone}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const sendEmailViaGmail = async (to, subject, htmlContent, accessToken) => {
    const email = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${htmlContent}`;
    
    const encodedMessage = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!response.ok) {
      throw new Error('Gmail API kļūda: ' + response.statusText);
    }

    return response.json();
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
      const [year, month] = currentInvoiceMonth.split('-');
      
      let dateFrom = invoiceFromDate;
      let dateTo = invoiceToDate;
      
      if (!dateFrom || !dateTo) {
        const monthNum = parseInt(month);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        dateFrom = dateFrom || `${year}-${month}-01`;
        dateTo = dateTo || `${year}-${month}-${daysInMonth}`;
      }

      for (const apt of apartments) {
        let totalAmountWithoutVat = 0;
        let totalVatAmount = 0;
        let invoiceDetails = [];

        for (const tariff of periodTariffs) {
          const pricePerSqm = parseFloat(tariff.total_amount) / TOTAL_AREA;
          const amountWithoutVat = Math.round(pricePerSqm * parseFloat(apt.area) * 100) / 100;
          const vatRate = parseFloat(tariff.vat_rate) || 0;
          const vatAmount = Math.round(amountWithoutVat * vatRate / 100 * 100) / 100;

          totalAmountWithoutVat += amountWithoutVat;
          totalVatAmount += vatAmount;

          invoiceDetails.push({
            tariff_id: tariff.id,
            tariff_name: tariff.name,
            amount_without_vat: amountWithoutVat,
            vat_rate: vatRate,
            vat_amount: vatAmount,
            type: 'tariff'
          });
        }

        const waterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === currentInvoiceMonth);
        const waterTariff = waterTariffs.find(w => w.period === currentInvoiceMonth);

        if (waterReading && waterTariff && enabledMeters.water && waterTariff.include_in_invoice !== false) {
          const waterConsumptionM3 = parseFloat(waterReading.reading_value) || 0;
          const waterPricePerM3 = parseFloat(waterTariff.price_per_m3) || 0;
          const waterAmountWithoutVat = Math.round(waterConsumptionM3 * waterPricePerM3 * 100) / 100;
          const waterVatRate = parseFloat(waterTariff.vat_rate) || 0;
          const waterVatAmount = Math.round(waterAmountWithoutVat * waterVatRate / 100 * 100) / 100;

          totalAmountWithoutVat += waterAmountWithoutVat;
          totalVatAmount += waterVatAmount;

          invoiceDetails.push({
            tariff_id: waterTariff.id,
            tariff_name: `Ūdens (${waterConsumptionM3} m³)`,
            consumption_m3: waterConsumptionM3,
            price_per_m3: waterPricePerM3,
            amount_without_vat: waterAmountWithoutVat,
            vat_rate: waterVatRate,
            vat_amount: waterVatAmount,
            type: 'water'
          });
        }

        const wasteTariff = wasteTariffs.find(w => w.period === currentInvoiceMonth);
        if (wasteTariff && wasteTariff.include_in_invoice !== false) {
          const totalDeclaredPersons = apartments.reduce((sum, a) => sum + (parseInt(a.declared_persons) || 1), 0);
          if (totalDeclaredPersons > 0) {
            const declaredPersonsInApt = parseInt(apt.declared_persons) || 1;
            const wasteAmountWithoutVat = Math.round((parseFloat(wasteTariff.total_amount) / totalDeclaredPersons * declaredPersonsInApt) * 100) / 100;
            const wasteVatRate = parseFloat(wasteTariff.vat_rate) || 0;
            const wasteVatAmount = Math.round(wasteAmountWithoutVat * wasteVatRate / 100 * 100) / 100;

            totalAmountWithoutVat += wasteAmountWithoutVat;
            totalVatAmount += wasteVatAmount;

            invoiceDetails.push({
              tariff_id: wasteTariff.id,
              tariff_name: `♻️ Atkritumu izvešana (${declaredPersonsInApt} pers.)`,
              declared_persons: declaredPersonsInApt,
              total_persons: totalDeclaredPersons,
              amount_without_vat: wasteAmountWithoutVat,
              vat_rate: wasteVatRate,
              vat_amount: wasteVatAmount,
              type: 'waste'
            });
          }
        }

        const previousDebt = calculatePreviousDebt(apt.id, currentInvoiceMonth);
        if (previousDebt > 0) {
          totalAmountWithoutVat += previousDebt;
          invoiceDetails.push({
            tariff_id: null,
            tariff_name: '⚠️ Parāds no iepriekšējiem mēnešiem',
            amount_without_vat: previousDebt,
            vat_rate: 0,
            vat_amount: 0,
            type: 'debt'
          });
        }

        const overpayment = await calculateOverpayment(apt.id, currentInvoiceMonth);
        if (overpayment > 0) {
          totalAmountWithoutVat -= overpayment;
          invoiceDetails.push({
            tariff_id: null,
            tariff_name: '💰 Pārmaksa no iepriekšējā mēneša',
            amount_without_vat: -overpayment,
            vat_rate: 0,
            vat_amount: 0,
            type: 'overpayment'
          });
        }

        if (invoiceDetails.length === 0) continue;

        const totalAmountWithVat = Math.round((totalAmountWithoutVat + totalVatAmount) * 100) / 100;
        const timestamp = Math.floor(Date.now() / 1000);
        const invoiceNumber = `${year}/${month}-${apt.number}-${timestamp}`;
        const dueDate = new Date(year, month, 15).toISOString().split('T')[0];

        invoicesToAdd.push({
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

      const { error } = await supabase.from('invoices').insert(invoicesToAdd);
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
      const periodTariffs = tariffs.filter(t => t.period === invoice.period && t.include_in_invoice === true);
      
      if (periodTariffs.length === 0) {
        showToast('Nav atzīmētu tarifū šim periodam', 'error');
        return;
      }

      await supabase.from('invoices').delete().eq('id', invoice.id);

      let totalAmountWithoutVat = 0;
      let totalVatAmount = 0;
      let invoiceDetails = [];

      for (const tariff of periodTariffs) {
        const pricePerSqm = parseFloat(tariff.total_amount) / TOTAL_AREA;
        const amountWithoutVat = Math.round(pricePerSqm * parseFloat(apt.area) * 100) / 100;
        const vatRate = parseFloat(tariff.vat_rate) || 0;
        const vatAmount = Math.round(amountWithoutVat * vatRate / 100 * 100) / 100;

        totalAmountWithoutVat += amountWithoutVat;
        totalVatAmount += vatAmount;

        invoiceDetails.push({
          tariff_id: tariff.id,
          tariff_name: tariff.name,
          amount_without_vat: amountWithoutVat,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          type: 'tariff'
        });
      }

      const waterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === invoice.period);
      const waterTariff = waterTariffs.find(w => w.period === invoice.period);

      if (waterReading && waterTariff && waterTariff.include_in_invoice !== false) {
        const waterConsumptionM3 = parseFloat(waterReading.reading_value) || 0;
        const waterPricePerM3 = parseFloat(waterTariff.price_per_m3) || 0;
        const waterAmountWithoutVat = Math.round(waterConsumptionM3 * waterPricePerM3 * 100) / 100;
        const waterVatRate = parseFloat(waterTariff.vat_rate) || 0;
        const waterVatAmount = Math.round(waterAmountWithoutVat * waterVatRate / 100 * 100) / 100;

        totalAmountWithoutVat += waterAmountWithoutVat;
        totalVatAmount += waterVatAmount;

        invoiceDetails.push({
          tariff_id: waterTariff.id,
          tariff_name: `Ūdens (${waterConsumptionM3} m³)`,
          consumption_m3: waterConsumptionM3,
          price_per_m3: waterPricePerM3,
          amount_without_vat: waterAmountWithoutVat,
          vat_rate: waterVatRate,
          vat_amount: waterVatAmount,
          type: 'water'
        });
      }

      const wasteTariff = wasteTariffs.find(w => w.period === invoice.period);
      if (wasteTariff && wasteTariff.include_in_invoice !== false) {
        const totalDeclaredPersons = apartments.reduce((sum, a) => sum + (parseInt(a.declared_persons) || 1), 0);
        if (totalDeclaredPersons > 0) {
          const declaredPersonsInApt = parseInt(apt.declared_persons) || 1;
          const wasteAmountWithoutVat = Math.round((parseFloat(wasteTariff.total_amount) / totalDeclaredPersons * declaredPersonsInApt) * 100) / 100;
          const wasteVatRate = parseFloat(wasteTariff.vat_rate) || 0;
          const wasteVatAmount = Math.round(wasteAmountWithoutVat * wasteVatRate / 100 * 100) / 100;

          totalAmountWithoutVat += wasteAmountWithoutVat;
          totalVatAmount += wasteVatAmount;

          invoiceDetails.push({
            tariff_id: wasteTariff.id,
            tariff_name: `♻️ Atkritumu izvešana (${declaredPersonsInApt} pers.)`,
            declared_persons: declaredPersonsInApt,
            total_persons: totalDeclaredPersons,
            amount_without_vat: wasteAmountWithoutVat,
            vat_rate: wasteVatRate,
            vat_amount: wasteVatAmount,
            type: 'waste'
          });
        }
      }

      const previousDebt = calculatePreviousDebt(apt.id, invoice.period);
      if (previousDebt > 0) {
        totalAmountWithoutVat += previousDebt;
        invoiceDetails.push({
          tariff_id: null,
          tariff_name: '⚠️ Parāds no iepriekšējiem mēnešiem',
          amount_without_vat: previousDebt,
          vat_rate: 0,
          vat_amount: 0,
          type: 'debt'
        });
      }

      const overpayment = await calculateOverpayment(apt.id, invoice.period);
      if (overpayment > 0) {
        totalAmountWithoutVat -= overpayment;
        invoiceDetails.push({
          tariff_id: null,
          tariff_name: '💰 Pārmaksa no iepriekšējā mēneša',
          amount_without_vat: -overpayment,
          vat_rate: 0,
          vat_amount: 0,
          type: 'overpayment'
        });
      }

      const totalAmountWithVat = Math.round((totalAmountWithoutVat + totalVatAmount) * 100) / 100;

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

  const downloadPDF = (invoice) => {
    const apt = apartments.find(a => a.id === invoice.apartment_id);
    const htmlContent = generateInvoicePdfHtml(invoice, apt);

    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
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
    element.setAttribute('download', `recini_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`✓ Eksportēti ${invoices.length} rēķini`);
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
    saveDebtNote,
    saveOverpayment,
    generateInvoices,
    generateInvoiceForApartment,
    sendInvoicesByEmail,
    regenerateInvoice,
    toggleInvoicePaid,
    deleteInvoice,
    downloadPDF,
    exportInvoicesToCSV
  };
}
