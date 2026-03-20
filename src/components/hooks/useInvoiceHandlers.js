import { useState } from 'react';
import { TOTAL_AREA } from '../shared/constants';

export function useInvoiceHandlers(supabase, apartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs, meterReadings, fetchData, showToast, settings = {}, enabledMeters = {}) {
  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [invoiceFromDate, setInvoiceFromDate] = useState('');
  const [invoiceToDate, setInvoiceToDate] = useState('');
  const [expandedInvoiceMonth, setExpandedInvoiceMonth] = useState(null);
  const [debtNoteForm, setDebtNoteForm] = useState({ invoiceId: null, note: '' });
  const [overpaymentForm, setOverpaymentForm] = useState({ invoiceId: '', amount: '' });

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
      // Meklē iepriekšējā mēneša rēķinu šim dzīvoklim
      const previousInvoice = invoices.find(inv => 
        inv.apartment_id === apartmentId && 
        inv.period === previousMonth
      );
      
      if (!previousInvoice) {
        console.log(`ℹ️ Nav iepriekšējā mēneša rēķina dzīv. ${apartments.find(a => a.id === apartmentId)?.number} par ${previousMonth}`);
        return 0;
      }

      // Pārmaksa eksistē, ja rēķina gala summa ir negatīva (vērtības < 0)
      const finalAmount = parseFloat(previousInvoice.amount_with_vat) || 0;
      if (finalAmount < 0) {
        const overpay = Math.abs(finalAmount);
        console.log(`💰 Pārmaksa dzīv. ${apartments.find(a => a.id === apartmentId)?.number} par ${previousMonth}: €${overpay}`);
        return overpay;
      }
      return 0;
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
    if (!overpaymentForm.invoiceId || !overpaymentForm.amount) {
      showToast('Izvēlieties rēķinu un ievadiet summu', 'error');
      return;
    }

    try {
      const amount = parseFloat(overpaymentForm.amount);
      if (amount <= 0) {
        showToast('Pārmaksa jābūt lielāka par 0', 'error');
        return;
      }

      const invoice = invoices.find(inv => inv.id === overpaymentForm.invoiceId);
      if (!invoice) {
        showToast('Rēķins nav atrasts', 'error');
        return;
      }

      // Parsē esošos rēķina detaļus
      let invoiceDetails = [];
      if (invoice.invoice_details) {
        try {
          invoiceDetails = JSON.parse(invoice.invoice_details);
        } catch (e) {
          invoiceDetails = [];
        }
      }

      // Noņem vecāko pārmaksu detaļu, ja tāda pastāv
      invoiceDetails = invoiceDetails.filter(d => d.type !== 'overpayment');

      // Pievieno jauno pārmaksu detaļu
      invoiceDetails.push({
        tariff_id: null,
        tariff_name: '💰 Pārmaksa',
        amount_without_vat: -amount,
        vat_rate: 0,
        vat_amount: 0,
        type: 'overpayment'
      });

      // Pārrēķina kopējo summu
      let newAmountWithoutVat = 0;
      let newVatAmount = 0;
      
      invoiceDetails.forEach(detail => {
        if (detail.type !== 'overpayment') {
          newAmountWithoutVat += parseFloat(detail.amount_without_vat) || 0;
          newVatAmount += parseFloat(detail.vat_amount) || 0;
        } else {
          newAmountWithoutVat -= amount;
        }
      });

      const newAmountWithVat = Math.round((newAmountWithoutVat + newVatAmount) * 100) / 100;

      // Atjaunina rēķinu
      const { error } = await supabase
        .from('invoices')
        .update({
          amount: newAmountWithVat,
          amount_without_vat: newAmountWithoutVat,
          amount_with_vat: newAmountWithVat,
          overpayment_amount: amount,
          invoice_details: JSON.stringify(invoiceDetails)
        })
        .eq('id', overpaymentForm.invoiceId);

      if (error) throw error;

      setOverpaymentForm({ invoiceId: '', amount: '' });
      fetchData();
      showToast('✓ Pārmaksa saglabāta uz rēķina');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const updateOverpayment = async (invoiceId, newAmount) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        showToast('Rēķins nav atrasts', 'error');
        return;
      }

      // Parsē esošos rēķina detaļus
      let invoiceDetails = [];
      if (invoice.invoice_details) {
        try {
          invoiceDetails = JSON.parse(invoice.invoice_details);
        } catch (e) {
          invoiceDetails = [];
        }
      }

      // Noņem vecāko pārmaksu detaļu
      invoiceDetails = invoiceDetails.filter(d => d.type !== 'overpayment');

      let updatedAmountWithoutVat = 0;
      let updatedVatAmount = 0;

      // Pārrēķina summu bez pārmaksas
      invoiceDetails.forEach(detail => {
        updatedAmountWithoutVat += parseFloat(detail.amount_without_vat) || 0;
        updatedVatAmount += parseFloat(detail.vat_amount) || 0;
      });

      // Pievieno jauno pārmaksu detaļu
      if (newAmount > 0) {
        invoiceDetails.push({
          tariff_id: null,
          tariff_name: '💰 Pārmaksa',
          amount_without_vat: -newAmount,
          vat_rate: 0,
          vat_amount: 0,
          type: 'overpayment'
        });
        updatedAmountWithoutVat -= newAmount;
      }

      const updatedAmountWithVat = Math.round((updatedAmountWithoutVat + updatedVatAmount) * 100) / 100;

      // Atjaunina rēķinu
      const { error } = await supabase
        .from('invoices')
        .update({
          amount: updatedAmountWithVat,
          amount_without_vat: updatedAmountWithoutVat,
          amount_with_vat: updatedAmountWithVat,
          overpayment_amount: newAmount,
          invoice_details: JSON.stringify(invoiceDetails)
        })
        .eq('id', invoiceId);

      if (error) throw error;

      fetchData();
      showToast('✓ Pārmaksa atjaunināta');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteOverpayment = async (invoiceId) => {
    if (!window.confirm('Dzēst pārmaksu?')) return;
    
    try {
      await updateOverpayment(invoiceId, 0);
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

      // Aukstais ūdens
      const waterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === currentInvoiceMonth);
      const waterTariff = waterTariffs.find(w => w.period === currentInvoiceMonth);

      if (waterReading && waterTariff && waterTariff.include_in_invoice !== false) {
        // Calculate previous month period
        const [year, month] = currentInvoiceMonth.split('-');
        let prevMonth = parseInt(month) - 1;
        let prevYear = parseInt(year);
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        
        // Get current and previous readings
        const currentReading = parseFloat(waterReading.reading_value) || 0;
        const previousWaterReading = meterReadings.find(mr => 
          mr.apartment_id === apt.id && 
          mr.meter_type === 'water' && 
          mr.period === previousPeriod
        );
        const previousReadingValue = previousWaterReading ? parseFloat(previousWaterReading.reading_value) || 0 : 0;
        
        // Calculate consumption as meter difference (current - previous)
        const waterConsumptionM3 = Math.max(0, currentReading - previousReadingValue);
        const waterPricePerM3 = parseFloat(waterTariff.price_per_m3) || 0;
        const waterAmountWithoutVat = Math.round(waterConsumptionM3 * waterPricePerM3 * 100) / 100;
        const waterVatRate = parseFloat(waterTariff.vat_rate) || 0;
        const waterVatAmount = Math.round(waterAmountWithoutVat * waterVatRate / 100 * 100) / 100;

        totalAmountWithoutVat += waterAmountWithoutVat;
        totalVatAmount += waterVatAmount;

        invoiceDetails.push({
          tariff_id: waterTariff.id,
          tariff_name: `Aukstais ūdens (${waterConsumptionM3} m³)`,
          consumption_m3: waterConsumptionM3,
          price_per_m3: waterPricePerM3,
          amount_without_vat: waterAmountWithoutVat,
          vat_rate: waterVatRate,
          vat_amount: waterVatAmount,
          type: 'water'
        });
      }

      // Siltais ūdens
      const hotWaterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'hot_water' && mr.period === currentInvoiceMonth);
      const hotWaterTariff = hotWaterTariffs.find(w => w.period === currentInvoiceMonth);

      if (hotWaterReading && hotWaterTariff && hotWaterTariff.include_in_invoice !== false) {
        // Calculate previous month period
        const [year, month] = currentInvoiceMonth.split('-');
        let prevMonth = parseInt(month) - 1;
        let prevYear = parseInt(year);
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        
        // Get current and previous readings
        const currentReading = parseFloat(hotWaterReading.reading_value) || 0;
        const previousHotWaterReading = meterReadings.find(mr => 
          mr.apartment_id === apt.id && 
          mr.meter_type === 'hot_water' && 
          mr.period === previousPeriod
        );
        const previousReadingValue = previousHotWaterReading ? parseFloat(previousHotWaterReading.reading_value) || 0 : 0;
        
        // Calculate consumption as meter difference (current - previous)
        const hotWaterConsumptionM3 = Math.max(0, currentReading - previousReadingValue);
        const hotWaterPricePerM3 = parseFloat(hotWaterTariff.price_per_m3) || 0;
        const hotWaterAmountWithoutVat = Math.round(hotWaterConsumptionM3 * hotWaterPricePerM3 * 100) / 100;
        const hotWaterVatRate = parseFloat(hotWaterTariff.vat_rate) || 0;
        const hotWaterVatAmount = Math.round(hotWaterAmountWithoutVat * hotWaterVatRate / 100 * 100) / 100;

        totalAmountWithoutVat += hotWaterAmountWithoutVat;
        totalVatAmount += hotWaterVatAmount;

        invoiceDetails.push({
          tariff_id: hotWaterTariff.id,
          tariff_name: `Siltais ūdens (${hotWaterConsumptionM3} m³)`,
          consumption_m3: hotWaterConsumptionM3,
          price_per_m3: hotWaterPricePerM3,
          amount_without_vat: hotWaterAmountWithoutVat,
          vat_rate: hotWaterVatRate,
          vat_amount: hotWaterVatAmount,
          type: 'hot_water'
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
    const paymentBank = settings.payment_bank || 'Swedbank';
    const paymentEmail = settings.payment_email || 'info@barona78.lv';
    const paymentPhone = settings.payment_phone || '+371 67800000';
    const additionalInfo = settings.additional_invoice_info || '';

    // Aprēķināt perioda sākuma un beigu datumus
    const [year, month] = invoice.period.split('-');
    const periodStart = new Date(year, parseInt(month) - 1, 1);
    const periodEnd = new Date(year, parseInt(month), 0);
    const periodStartStr = periodStart.toLocaleDateString('lv-LV');
    const periodEndStr = periodEnd.toLocaleDateString('lv-LV');

    const generateRows = (details, filterFn) => {
      return details.filter(filterFn).map(detail => {
        if (detail.type === 'water') {
          return `<tr><td>${detail.tariff_name}</td><td>${detail.consumption_m3} m³</td><td>€${detail.price_per_m3.toFixed(4)}</td><td>€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
        } else if (detail.type === 'waste') {
          return `<tr><td>${detail.tariff_name}</td><td>${detail.declared_persons} pers.</td><td>€${(detail.amount_without_vat / detail.declared_persons).toFixed(4)}</td><td>€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
        } else if (detail.type === 'debt') {
          return `<tr><td><strong>${detail.tariff_name}</strong></td><td></td><td></td><td><strong>€${detail.amount_without_vat.toFixed(2)}</strong></td></tr>`;
        } else if (detail.type === 'overpayment') {
          return `<tr><td><strong>${detail.tariff_name}</strong></td><td></td><td></td><td><strong>€${detail.amount_without_vat.toFixed(2)}</strong></td></tr>`;
        } else {
          return `<tr><td>${detail.tariff_name}</td><td>${apt.area} m²</td><td>€${(detail.amount_without_vat / apt.area).toFixed(4)}</td><td>€${detail.amount_without_vat.toFixed(2)}</td></tr>`;
        }
      }).join('');
    };

    const rowsWithoutVat = generateRows(invoiceDetails, d => (d.type === 'tariff' || d.type === 'water' || d.type === 'waste') && (d.vat_rate === 0 || d.vat_rate === undefined));
    const rowsWithVat = generateRows(invoiceDetails, d => (d.type === 'tariff' || d.type === 'water' || d.type === 'waste') && d.vat_rate > 0);
    const debtRows = generateRows(invoiceDetails, d => d.type === 'debt');
    const overpaymentRows = generateRows(invoiceDetails, d => d.type === 'overpayment');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.4;
              font-size: 11px;
              color: #333;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            th {
              text-align: left;
              padding: 8px;
              border-bottom: 2px solid #003d7a;
              font-weight: bold;
              font-size: 11px;
              background-color: #f5f7fa;
              color: #003d7a;
            }
            td {
              padding: 6px 8px;
              border-bottom: 1px solid #ddd;
            }
            tr:hover {
              background-color: #f9f9f9;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              border-bottom: 3px solid #003d7a;
              padding-bottom: 15px;
            }
            .title {
              font-size: 22px;
              font-weight: bold;
              color: #003d7a;
            }
            .company-info {
              text-align: right;
              font-size: 10px;
              color: #666;
            }
            .company-info strong {
              color: #003d7a;
              font-size: 11px;
            }
            .invoice-details {
              margin: 15px 0;
              font-size: 11px;
              color: #333;
            }
            .invoice-details strong {
              color: #003d7a;
            }
            .recipient {
              background-color: #f5f7fa;
              padding: 12px;
              margin: 15px 0;
              font-size: 11px;
              border-left: 4px solid #003d7a;
              color: #333;
            }
            .recipient strong {
              color: #003d7a;
            }
            .amount-total {
              font-size: 16px;
              font-weight: bold;
              text-align: right;
              margin: 15px 0;
              padding: 12px;
              border: 3px solid #003d7a;
              background-color: #f5f7fa;
              color: #003d7a;
            }
            .payment-info {
              margin-top: 20px;
              padding: 12px;
              background-color: #f5f7fa;
              font-size: 10px;
              border-left: 4px solid #003d7a;
              color: #333;
            }
            .payment-info strong {
              color: #003d7a;
              display: block;
              margin-top: 8px;
              font-size: 11px;
            }
            .payment-info strong:first-child {
              margin-top: 0;
              font-size: 12px;
              text-transform: uppercase;
            }
            .row {
              margin: 4px 0;
              color: #333;
            }
            .info-box {
              background-color: #f5f7fa;
              padding: 10px;
              margin: 10px 0;
              font-size: 10px;
              border-left: 4px solid #003d7a;
              color: #666;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #ddd;
              font-size: 11px;
            }
            .summary-row strong {
              color: #003d7a;
            }
          </style>
        </head>
        <body>
          <div class="header-row">
            <div class="title">RĒĶINS</div>
            <div class="company-info">
              <strong>${buildingName}</strong><br>
              ${buildingCode}<br>
              ${buildingAddress}
            </div>
          </div>

          <div class="invoice-details">
            <div class="row"><strong>Nr:</strong> ${invoice.invoice_number}</div>
            <div class="row"><strong>PERIODS:</strong> ${periodStartStr} - ${periodEndStr}</div>
            <div class="row"><strong>TERMIŅŠ:</strong> ${new Date(invoice.due_date).toLocaleDateString('lv-LV')}</div>
          </div>

          <div class="recipient">
            <div class="row"><strong>SAŅĒMĒJS:</strong></div>
            <div class="row"><strong>Dzīvoklis Nr. ${apt.number}</strong></div>
            ${apt.owner_name ? `<div class="row">Vārds: ${apt.owner_name}</div>` : ''}
            ${apt.owner_surname ? `<div class="row">Uzvārds: ${apt.owner_surname}</div>` : ''}
            ${apt.email ? `<div class="row">E-pasts: ${apt.email}</div>` : ''}
            ${apt.declared_persons ? `<div class="row">Deklarēto personu skaits: ${apt.declared_persons}</div>` : ''}
            ${apt.registration_number ? `<div class="row">Reģ. numurs: ${apt.registration_number}</div>` : ''}
            ${apt.apartment_address ? `<div class="row">Adrese: ${apt.apartment_address}</div>` : ''}
            <div class="row">Platība: ${apt.area} m²</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>PAKALPOJUMS</th>
                <th>DAUDZ.</th>
                <th>CENA</th>
                <th>SUMMA</th>
              </tr>
            </thead>
            <tbody>
              ${rowsWithoutVat}
              ${rowsWithVat}
              ${debtRows}
              ${overpaymentRows}
            </tbody>
          </table>

          ${invoice.previous_debt_note ? `
            <div class="info-box">
              <strong>Parāda paskaidrojums:</strong> ${invoice.previous_debt_note}
            </div>
          ` : ''}

          <div style="text-align: right; margin: 20px 0; padding-top: 15px; border-top: 3px solid #003d7a;">
            <div class="summary-row">
              <span>Summa bez PVN:</span>
              <span><strong>€${amountWithoutVat.toFixed(2)}</strong></span>
            </div>
            ${vatAmount > 0 ? `
              <div class="summary-row">
                <span>PVN kopā:</span>
                <span><strong>€${vatAmount.toFixed(2)}</strong></span>
              </div>
            ` : ''}
            <div class="amount-total">KOPĀ APMAKSAI: €${amountWithVat.toFixed(2)}</div>
          </div>

          ${additionalInfo ? `
            <div class="info-box">
              ${additionalInfo.replace(/\n/g, '<br>')}
            </div>
          ` : ''}

          <div class="payment-info">
            <strong>MAKSĀJUMA REKVIZĪTI</strong>
            <strong>NOSAUKUMS:</strong> ${buildingName}
            <div class="row">REĢ. KODS: ${buildingCode}</div>
            <div class="row">ADRESE: ${buildingAddress}</div>
            <div class="row">BANKA: ${paymentBank}</div>
            <div class="row">IBAN: ${paymentIban}</div>
            <div class="row">E-PASTS: ${paymentEmail}</div>
            <div class="row">TĀLRUNIS: ${paymentPhone}</div>
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
          // Calculate previous month period
          const [year, month] = currentInvoiceMonth.split('-');
          let prevMonth = parseInt(month) - 1;
          let prevYear = parseInt(year);
          if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
          }
          const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
          
          // Get current and previous readings
          const currentReading = parseFloat(waterReading.reading_value) || 0;
          const previousWaterReading = meterReadings.find(mr => 
            mr.apartment_id === apt.id && 
            mr.meter_type === 'water' && 
            mr.period === previousPeriod
          );
          const previousReadingValue = previousWaterReading ? parseFloat(previousWaterReading.reading_value) || 0 : 0;
          
          // Calculate consumption as meter difference (current - previous)
          const waterConsumptionM3 = Math.max(0, currentReading - previousReadingValue);
          const waterPricePerM3 = parseFloat(waterTariff.price_per_m3) || 0;
          const waterAmountWithoutVat = Math.round(waterConsumptionM3 * waterPricePerM3 * 100) / 100;
          const waterVatRate = parseFloat(waterTariff.vat_rate) || 0;
          const waterVatAmount = Math.round(waterAmountWithoutVat * waterVatRate / 100 * 100) / 100;

          totalAmountWithoutVat += waterAmountWithoutVat;
          totalVatAmount += waterVatAmount;

          invoiceDetails.push({
            tariff_id: waterTariff.id,
            tariff_name: `Aukstais ūdens (${waterConsumptionM3} m³)`,
            consumption_m3: waterConsumptionM3,
            price_per_m3: waterPricePerM3,
            amount_without_vat: waterAmountWithoutVat,
            vat_rate: waterVatRate,
            vat_amount: waterVatAmount,
            type: 'water'
          });
        }

        const hotWaterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'hot_water' && mr.period === currentInvoiceMonth);
        const hotWaterTariff = hotWaterTariffs.find(w => w.period === currentInvoiceMonth);

        if (hotWaterReading && hotWaterTariff && enabledMeters.hot_water && hotWaterTariff.include_in_invoice !== false) {
          // Calculate previous month period
          const [year, month] = currentInvoiceMonth.split('-');
          let prevMonth = parseInt(month) - 1;
          let prevYear = parseInt(year);
          if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
          }
          const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
          
          // Get current and previous readings
          const currentReading = parseFloat(hotWaterReading.reading_value) || 0;
          const previousHotWaterReading = meterReadings.find(mr => 
            mr.apartment_id === apt.id && 
            mr.meter_type === 'hot_water' && 
            mr.period === previousPeriod
          );
          const previousReadingValue = previousHotWaterReading ? parseFloat(previousHotWaterReading.reading_value) || 0 : 0;
          
          // Calculate consumption as meter difference (current - previous)
          const hotWaterConsumptionM3 = Math.max(0, currentReading - previousReadingValue);
          const hotWaterPricePerM3 = parseFloat(hotWaterTariff.price_per_m3) || 0;
          const hotWaterAmountWithoutVat = Math.round(hotWaterConsumptionM3 * hotWaterPricePerM3 * 100) / 100;
          const hotWaterVatRate = parseFloat(hotWaterTariff.vat_rate) || 0;
          const hotWaterVatAmount = Math.round(hotWaterAmountWithoutVat * hotWaterVatRate / 100 * 100) / 100;

          totalAmountWithoutVat += hotWaterAmountWithoutVat;
          totalVatAmount += hotWaterVatAmount;

          invoiceDetails.push({
            tariff_id: hotWaterTariff.id,
            tariff_name: `Siltais ūdens (${hotWaterConsumptionM3} m³)`,
            consumption_m3: hotWaterConsumptionM3,
            price_per_m3: hotWaterPricePerM3,
            amount_without_vat: hotWaterAmountWithoutVat,
            vat_rate: hotWaterVatRate,
            vat_amount: hotWaterVatAmount,
            type: 'hot_water'
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

        // Izdzēst veco rēķinu
        await supabase.from('invoices').delete().eq('id', invoice.id);

        let totalAmountWithoutVat = 0;
        let totalVatAmount = 0;
        let invoiceDetails = [];
        const [year, month] = invoice.period.split('-');

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

        // Atkritumi
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

        // Parāds
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

        // Pārmaksa
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
        const timestamp = Math.floor(Date.now() / 1000);
        const invoiceNumber = `${year}/${month}-${apt.number}-${timestamp}`;
        const dueDate = new Date(year, month, 15).toISOString().split('T')[0];

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
      showToast('⏳ Ģenerē PDF...', 'info');
      
      const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then(() => {
        const jsPDF = window.jspdf.jsPDF;
        
        try {
          const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
          const amountWithoutVat = invoice.amount_without_vat || 0;
          const vatAmount = invoice.vat_amount || 0;
          const amountWithVat = invoice.amount_with_vat || invoice.amount;

          const buildingName = settings.building_name || 'BIEDRĪBA "BARONA 78"';
          const buildingCode = settings.building_code || '40008325768';
          const buildingAddress = settings.building_address || 'Kr. Barona iela 78-14, Rīga, LV-1001';
          const paymentIban = settings.payment_iban || 'LV62HABA0551064112797';
          const paymentBank = settings.payment_bank || 'Swedbank';
          const paymentEmail = settings.payment_email || 'info@barona78.lv';
          const paymentPhone = settings.payment_phone || '+371 67800000';

          // Aprēķināt perioda datumnus
          const [year, month] = invoice.period.split('-');
          const periodStart = new Date(year, parseInt(month) - 1, 1);
          const periodEnd = new Date(year, parseInt(month), 0);
          const periodStartStr = periodStart.toLocaleDateString('lv-LV');
          const periodEndStr = periodEnd.toLocaleDateString('lv-LV');

          // Izveidot PDF
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
          });

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          let yPos = 15;
          const leftMargin = 15;
          const lineHeight = 5;
          const color = { primary: '#003d7a', text: '#333' };

          // VIRSRAKSTS
          pdf.setFontSize(18);
          pdf.setTextColor(0, 61, 122);
          pdf.text('RĒĶINS', leftMargin, yPos);
          pdf.setFontSize(10);
          pdf.setTextColor(102, 102, 102);
          pdf.text(buildingName, pageWidth - leftMargin - 60, yPos);
          pdf.text(buildingCode, pageWidth - leftMargin - 60, yPos + 5);
          pdf.text(buildingAddress, pageWidth - leftMargin - 60, yPos + 10);
          
          yPos += 20;
          pdf.setDrawColor(0, 61, 122);
          pdf.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
          
          // RĒĶINA DETAĻAS
          yPos += 8;
          pdf.setFontSize(11);
          pdf.setTextColor(51, 51, 51);
          pdf.text(`Nr: ${invoice.invoice_number}`, leftMargin, yPos);
          yPos += 5;
          pdf.text(`PERIODS: ${periodStartStr} - ${periodEndStr}`, leftMargin, yPos);
          yPos += 5;
          pdf.text(`TERMIŅŠ: ${new Date(invoice.due_date).toLocaleDateString('lv-LV')}`, leftMargin, yPos);
          
          // SAŅĒMĒJS
          yPos += 12;
          pdf.setFillColor(245, 247, 250);
          pdf.rect(leftMargin, yPos - 2, pageWidth - 2 * leftMargin, 30, 'F');
          pdf.setTextColor(0, 61, 122);
          pdf.setFontSize(10);
          pdf.text('SAŅĒMĒJS:', leftMargin + 3, yPos);
          yPos += 5;
          pdf.setFontSize(11);
          pdf.text(`Dzīvoklis Nr. ${apt.number}`, leftMargin + 3, yPos);
          yPos += 4;
          pdf.setFontSize(10);
          pdf.setTextColor(51, 51, 51);
          if (apt.owner_name) pdf.text(`Vārds: ${apt.owner_name}`, leftMargin + 3, yPos), (yPos += 4);
          if (apt.email) pdf.text(`E-pasts: ${apt.email}`, leftMargin + 3, yPos), (yPos += 4);
          pdf.text(`Platība: ${apt.area} m²`, leftMargin + 3, yPos);
          yPos += 10;

          // TABULA - PAKALPOJUMI
          yPos += 3;
          pdf.setFontSize(10);
          pdf.setTextColor(0, 61, 122);
          pdf.setFillColor(245, 247, 250);
          pdf.rect(leftMargin, yPos - 4, pageWidth - 2 * leftMargin, 6, 'F');
          pdf.text('PAKALPOJUMS', leftMargin + 2, yPos);
          pdf.text('DAUDZ.', pageWidth - leftMargin - 45, yPos);
          pdf.text('CENA', pageWidth - leftMargin - 25, yPos);
          pdf.text('SUMMA', pageWidth - leftMargin - 10, yPos);

          yPos += 6;
          pdf.setDrawColor(0, 61, 122);
          pdf.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
          yPos += 4;

          pdf.setFontSize(10);
          pdf.setTextColor(51, 51, 51);

          // Pakalpojumi
          invoiceDetails.forEach(detail => {
            if (yPos > pageHeight - 20) {
              pdf.addPage();
              yPos = 15;
            }

            let daudz = '';
            let cena = '';
            if (detail.type === 'water' || detail.type === 'hot_water') {
              daudz = `${detail.consumption_m3} m³`;
              cena = `€${detail.price_per_m3.toFixed(4)}`;
            } else if (detail.type === 'waste') {
              daudz = `${detail.declared_persons} pers.`;
              cena = `€${(detail.amount_without_vat / detail.declared_persons).toFixed(4)}`;
            } else if (detail.type === 'tariff') {
              daudz = `${apt.area} m²`;
              cena = `€${(detail.amount_without_vat / apt.area).toFixed(4)}`;
            }

            if (detail.type === 'debt' || detail.type === 'overpayment') {
              pdf.setTextColor(0, 61, 122);
            }

            pdf.text(detail.tariff_name, leftMargin + 2, yPos);
            if (daudz) pdf.text(daudz, pageWidth - leftMargin - 45, yPos);
            if (cena) pdf.text(cena, pageWidth - leftMargin - 25, yPos);
            pdf.text(`€${detail.amount_without_vat.toFixed(2)}`, pageWidth - leftMargin - 10, yPos);
            pdf.setTextColor(51, 51, 51);
            yPos += 5;
          });

          // SUMMAS
          yPos += 4;
          pdf.setDrawColor(0, 61, 122);
          pdf.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
          yPos += 6;

          pdf.setFontSize(10);
          pdf.setTextColor(51, 51, 51);
          pdf.text('Summa bez PVN:', leftMargin + 2, yPos);
          pdf.setTextColor(0, 61, 122);
          pdf.text(`€${amountWithoutVat.toFixed(2)}`, pageWidth - leftMargin - 10, yPos);
          
          yPos += 5;
          pdf.setTextColor(51, 51, 51);
          if (vatAmount > 0) {
            pdf.text('PVN kopā:', leftMargin + 2, yPos);
            pdf.setTextColor(0, 61, 122);
            pdf.text(`€${vatAmount.toFixed(2)}`, pageWidth - leftMargin - 10, yPos);
            yPos += 5;
          }

          // GALĪGĀ SUMMA - LIELS LODZIŅŠ
          yPos += 3;
          pdf.setFillColor(245, 247, 250);
          pdf.rect(leftMargin, yPos, pageWidth - 2 * leftMargin, 12, 'F');
          pdf.setDrawColor(0, 61, 122);
          pdf.setLineWidth(0.8);
          pdf.rect(leftMargin, yPos, pageWidth - 2 * leftMargin, 12);
          pdf.setFontSize(14);
          pdf.setTextColor(0, 61, 122);
          pdf.text('KOPĀ APMAKSAI:', leftMargin + 3, yPos + 8);
          pdf.setFontSize(16);
          pdf.text(`€${amountWithVat.toFixed(2)}`, pageWidth - leftMargin - 15, yPos + 8);

          yPos += 18;

          // MAKSĀJUMA REKVIZĪTI
          pdf.setFillColor(245, 247, 250);
          pdf.rect(leftMargin, yPos, pageWidth - 2 * leftMargin, 28, 'F');
          pdf.setTextColor(0, 61, 122);
          pdf.setFontSize(10);
          pdf.text('MAKSĀJUMA REKVIZĪTI', leftMargin + 3, yPos + 4);
          
          yPos += 7;
          pdf.setTextColor(51, 51, 51);
          pdf.setFontSize(9);
          pdf.text(`NOSAUKUMS: ${buildingName}`, leftMargin + 3, yPos);
          yPos += 4;
          pdf.text(`REĢ. KODS: ${buildingCode}`, leftMargin + 3, yPos);
          yPos += 4;
          pdf.text(`ADRESE: ${buildingAddress}`, leftMargin + 3, yPos);
          yPos += 4;
          pdf.text(`BANKA: ${paymentBank}`, leftMargin + 3, yPos);
          yPos += 4;
          pdf.text(`IBAN: ${paymentIban}`, leftMargin + 3, yPos);
          yPos += 4;
          pdf.text(`E-PASTS: ${paymentEmail}`, leftMargin + 3, yPos);
          yPos += 4;
          pdf.text(`TĀLRUNIS: ${paymentPhone}`, leftMargin + 3, yPos);

          pdf.save(`recins_${invoice.invoice_number}.pdf`);
          showToast(`✓ PDF lejuplādes: recins_${invoice.invoice_number}.pdf`);

        } catch (error) {
          console.error('PDF ģenerēšanas kļūda:', error);
          showToast('Kļūda PDF ģenerēšanā: ' + error.message, 'error');
        }

      }).catch(err => {
        console.error('Bibliotēku ielādes kļūda:', err);
        showToast('Kļūda ielādējot jsPDF bibliotēku', 'error');
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
    element.setAttribute('download', `recini_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`✓ Eksportēti ${invoices.length} rēķini`);
  };

  const downloadMonthAsZip = async (period) => {
    if (!period) {
      showToast('Izvēlieties periodu', 'error');
      return;
    }

    try {
      showToast('⏳ Sagatavo ZIP failu...', 'info');
      
      // Dinamiski ielodē bibliotēkas
      const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      ]);

      const html2canvas = window.html2canvas;
      const JSZip = window.JSZip;
      const jsPDF = window.jspdf.jsPDF;
      
      const monthInvoices = invoices.filter(inv => inv.period === period);
      
      if (monthInvoices.length === 0) {
        showToast('Nav šī perioda rēķinu', 'error');
        return;
      }

      showToast(`⏳ Ģenerē ${monthInvoices.length} PDF rēķinus...`, 'info');

      const pdfArray = [];

      // Ģenerē PDF vienu pēc otra
      for (let i = 0; i < monthInvoices.length; i++) {
        const invoice = monthInvoices[i];
        const apt = apartments.find(a => a.id === invoice.apartment_id);
        
        if (!apt) {
          continue;
        }

        try {
          const htmlContent = generateInvoicePdfHtml(invoice, apt);
          
          // Izveidojam div ar HTML saturu uz lapas (neredzamas)
          const container = document.createElement('div');
          container.innerHTML = htmlContent;
          container.style.position = 'fixed';
          container.style.left = '-9999px';
          container.style.top = '0';
          container.style.width = '800px';
          container.style.backgroundColor = 'white';
          container.style.zIndex = '-1000';
          document.body.appendChild(container);

          // Gaidīsim renderēšanu
          await new Promise(resolve => setTimeout(resolve, 300));

          // Ģenerē canvas no konteinera
          const canvas = await html2canvas(container, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            windowHeight: 1200,
            allowTaint: true,
            foreignObjectRendering: false,
            ignoreElements: (element) => {
              return element.id === '__next' || false;
            }
          });

          // Noņemam konteineri no DOM
          document.body.removeChild(container);

          // Izveido PDF no canvas
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
          });

          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const pageHeight = 297;
          let heightLeft = imgHeight;
          let position = 0;

          const imgData = canvas.toDataURL('image/jpeg', 0.92);

          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          // Konvertē PDF uz blob
          const pdfBlob = pdf.output('blob');
          const safeFileName = `${invoice.invoice_number}_dziv_${apt.number}`.replace(/[\\/:*?"<>|]/g, '_');
          
          pdfArray.push({
            name: safeFileName,
            blob: pdfBlob
          });
          
          showToast(`📄 Ģenerēts ${pdfArray.length}/${monthInvoices.length}`, 'info');

        } catch (err) {
          console.error(`Kļūda ģenerējot PDF rēķinam ${invoice.invoice_number}:`, err);
        }
      }

      // Pēc visu PDF ģenerēšanas, taisām ZIP
      if (pdfArray.length > 0) {
        showToast(`📦 Pakotne ZIP (${pdfArray.length} PDF)...`, 'info');
        
        const zip = new JSZip();
        
        // Pievienojam visus PDF ZIP failam
        for (const { name, blob } of pdfArray) {
          zip.file(`${name}.pdf`, blob);
        }

        // Ģenerē ZIP
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });

        // Lejuplādē ZIP
        const zipUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `recini_${period}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Tīra
        setTimeout(() => {
          URL.revokeObjectURL(zipUrl);
        }, 100);
        
        showToast(`✓ ZIP lejuplādes ar ${pdfArray.length} PDF rēķiniem`);
      } else {
        showToast('Kļūda: neizdevās ģenerēt jebkādus PDF', 'error');
      }
      
    } catch (error) {
      console.error('ZIP lejuplādes kļūda:', error);
      showToast('Kļūda: ' + error.message, 'error');
    }
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
    updateOverpayment,
    deleteOverpayment,
    generateInvoices,
    generateInvoiceForApartment,
    sendInvoicesByEmail,
    regenerateInvoice,
    regenerateInvoices,
    toggleInvoicePaid,
    deleteInvoice,
    deleteInvoices,
    downloadPDF,
    exportInvoicesToCSV,
    downloadMonthAsZip
  };
}