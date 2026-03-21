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

          ${additionalInfo ? `<div style="background: #f5f5f5; padding: 15px; margin: 30px 0; border-radius: 4px; font-size: 12px; line-height: 1.6;">${additionalInfo.replace(/\n/g, '<br>')}</div>` : ''}

          <div class="payment-info-box">
            <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 15px; color: #4b5563;">Maksājuma rekvizīti</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <div style="margin-bottom: 5px; font-size: 11px; color: #6b7280;">NOSAUKUMS</div>
                <div style="font-weight: bold; font-size: 12px; color: #4b5563;">${buildingName}</div>
              </div>
              <div>
                <div style="margin-bottom: 5px; font-size: 11px; color: #6b7280;">REĢ. KODS</div>
                <div style="font-weight: bold; font-size: 12px; color: #4b5563;">${buildingCode}</div>
              </div>
              <div>
                <div style="margin-bottom: 5px; font-size: 11px; color: #6b7280;">ADRESE</div>
                <div style="font-weight: bold; font-size: 12px; color: #4b5563;">${buildingAddress}</div>
              </div>
              <div>
                <div style="margin-bottom: 5px; font-size: 11px; color: #6b7280;">BANKA</div>
                <div style="font-weight: bold; font-size: 12px; color: #4b5563;">${paymentBank}</div>
              </div>
              <div>
                <div style="margin-bottom: 5px; font-size: 11px; color: #6b7280;">IBAN</div>
                <div style="font-weight: bold; font-size: 12px; color: #4b5563;">${paymentIban}</div>
              </div>
              <div>
                <div style="margin-bottom: 5px; font-size: 11px; color: #6b7280;">E-PASTS</div>
                <div style="font-weight: bold; font-size: 12px; color: #4b5563;">${paymentEmail}</div>
              </div>
              <div>
                <div style="margin-bottom: 5px; font-size: 11px; color: #6b7280;">TĀLRUNIS</div>
                <div style="font-weight: bold; font-size: 12px; color: #4b5563;">${paymentPhone}</div>
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
      // Ielādēt pdfmake bibliotēku
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
          const amountWithoutVat = invoice.amount_without_vat || 0;
          const vatAmount = invoice.vat_amount || 0;
          const amountWithVat = invoice.amount_with_vat || invoice.amount;

          // Veidot tabulas rindas pakalpojumiem
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

          // Maksājuma rekvizīti
          const paymentRows = [
            ['NOSAUKUMS:', settings.building_name || 'BIEDRĪBA "BARONA 78"'],
            ['REĢISTRĀCIJAS KODS:', settings.building_code || '40008325768'],
            ['ADRESE:', settings.building_address || 'Kr. Barona iela 78-14, Rīga, LV-1001'],
            ['BANKA:', settings.payment_bank || 'Habib Bank'],
            ['IBAN:', settings.payment_iban || 'LV62HABA0551064112797'],
            ['E-PASTS:', settings.payment_email || 'info@barona78.lv'],
            ['TĀLRUNIS:', settings.payment_phone || '+371 67800000']
          ];

          const docDefinition = {
            pageSize: 'A4',
            pageMargins: [15, 15, 15, 15],
            content: [
              // Galvene
              {
                columns: [
                  { text: 'RĒĶINS', fontSize: 32, bold: true },
                  {
                    text: (settings.building_name || 'BIEDRĪBA "BARONA 78"') + '\n' +
                          (settings.building_code || '40008325768') + '\n' +
                          (settings.building_address || 'Kr. Barona iela 78-14, Rīga, LV-1001'),
                    fontSize: 10,
                    alignment: 'right'
                  }
                ],
                marginBottom: 20
              },

              // Rēķina detaļas
              {
                columns: [
                  {
                    width: '50%',
                    text: [
                      { text: 'Rēķina numurs:\n', bold: true },
                      invoice.invoice_number + '\n\n',
                      { text: 'Periods:\n', bold: true },
                      invoice.period + '\n\n',
                      { text: 'Termiņš:\n', bold: true },
                      new Date(invoice.due_date).toLocaleDateString('lv-LV')
                    ],
                    fontSize: 11
                  }
                ],
                marginBottom: 20
              },

              // Saņēmējs
              {
                text: 'SAŅĒMĒJS',
                fontSize: 12,
                bold: true,
                marginBottom: 8
              },
              {
                text: 'Dzīvoklis Nr. ' + apt.number + '\n' +
                      (apt.owner_name ? 'Vārds: ' + apt.owner_name + '\n' : '') +
                      (apt.owner_surname ? 'Uzvārds: ' + apt.owner_surname + '\n' : '') +
                      (apt.email ? 'E-pasts: ' + apt.email + '\n' : '') +
                      (apt.declared_persons ? 'Deklarēto personu skaits: ' + apt.declared_persons + '\n' : '') +
                      (apt.registration_number ? 'Reģistrācijas numurs: ' + apt.registration_number + '\n' : '') +
                      (apt.apartment_address ? 'Adrese: ' + apt.apartment_address + '\n' : '') +
                      'Platība: ' + apt.area + ' m²',
                fontSize: 10,
                marginBottom: 20
              },

              // Pakalpojumu tabula
              {
                table: {
                  headerRows: 1,
                  widths: ['*', 90, 80, 80],
                  body: tableRows
                },
                layout: {
                  hLineWidth: function() { return 0.5; },
                  vLineWidth: function() { return 0.5; },
                  hLineColor: function() { return '#cccccc'; },
                  vLineColor: function() { return '#cccccc'; }
                },
                marginBottom: 15
              },

              // Kopsummas
              {
                alignment: 'right',
                columns: [
                  { width: '70%', text: '' },
                  {
                    width: '30%',
                    table: {
                      widths: ['*', '*'],
                      body: [
                        [
                          { text: 'Summa bez PVN:', bold: true },
                          { text: '€' + amountWithoutVat.toFixed(2), alignment: 'right' }
                        ],
                        ...(vatAmount > 0 ? [[
                          { text: 'PVN:', bold: true },
                          { text: '€' + vatAmount.toFixed(2), alignment: 'right' }
                        ]] : []),
                        [
                          { text: 'KOPĀ:', fontSize: 14, bold: true, color: '#003399' },
                          { text: '€' + amountWithVat.toFixed(2), fontSize: 14, bold: true, color: '#003399', alignment: 'right' }
                        ]
                      ]
                    },
                    layout: 'noBorders'
                  }
                ],
                marginBottom: 30
              },

              // Maksājuma rekvizīti
              {
                text: 'MAKSĀJUMA REKVIZĪTI',
                fontSize: 12,
                bold: true,
                marginBottom: 10
              },
              {
                table: {
                  widths: ['30%', '70%'],
                  body: paymentRows.map(row => [
                    { text: row[0], bold: true, fontSize: 10 },
                    { text: row[1], fontSize: 10 }
                  ])
                },
                layout: 'noBorders',
                marginBottom: 10
              }
            ],
            styles: {
              tableHeader: {
                fontSize: 10,
                color: '#000000',
                fillColor: '#f5f5f5'
              },
              sectionHeader: {
                fontSize: 11,
                bold: true,
                color: '#333',
                fillColor: '#f5f5f5'
              },
              tableBody: {
                fontSize: 10
              },
              debt: {
                color: '#991b1b'
              },
              overpayment: {
                color: '#1e40af'
              }
            }
          };

          // Ģenerēt PDF
          window.pdfMake.createPdf(docDefinition).download('recins_' + invoice.invoice_number + '.pdf');
          showToast('✓ PDF lejuplādēts: recins_' + invoice.invoice_number + '.pdf');

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
      
      const monthInvoices = invoices.filter(inv => inv.period === period);
      
      if (monthInvoices.length === 0) {
        showToast('Nav šī perioda rēķinu', 'error');
        return;
      }

      showToast(`⏳ Ģenerē ${monthInvoices.length} PDF rēķinus uz ZIP...`, 'info');

      let generatedCount = 0;

      for (let i = 0; i < monthInvoices.length; i++) {
        // eslint-disable-next-line no-loop-func
        (function() {
          const invoice = monthInvoices[i];
          const apt = apartments.find(a => a.id === invoice.apartment_id);
          
          if (!apt) return;

          try {
            const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
            const amountWithoutVat = invoice.amount_without_vat || 0;
            const vatAmount = invoice.vat_amount || 0;
            const amountWithVat = invoice.amount_with_vat || invoice.amount;

            const buildingName = settings.building_name || 'BIEDRĪBA "BARONA 78"';
            const buildingCode = settings.building_code || '40008325768';
            const buildingAddress = settings.building_address || 'Kr. Barona iela 78-14, Rīga, LV-1001';
            const paymentBank = settings.payment_bank || 'Habib Bank';
            const paymentIban = settings.payment_iban || 'LV62HABA0551064112797';
            const paymentEmail = settings.payment_email || 'info@barona78.lv';
            const paymentPhone = settings.payment_phone || '+371 67800000';

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

            // PĀRMAKSA (zaļā krāsā)
            const overpaymentRows = invoiceDetails.filter(d => d.type === 'overpayment');
            overpaymentRows.forEach(detail => {
              tableRows.push([
                { text: detail.tariff_name, style: 'overpayment', bold: true },
                { text: '' },
                { text: '' },
                { text: '€' + detail.amount_without_vat.toFixed(2), alignment: 'right', style: 'overpayment', bold: true }
              ]);
            });

            const paymentRows = [
              ['NOSAUKUMS:', buildingName],
              ['REĢISTRĀCIJAS KODS:', buildingCode],
              ['ADRESE:', buildingAddress],
              ['BANKA:', paymentBank],
              ['IBAN:', paymentIban],
              ['E-PASTS:', paymentEmail],
              ['TĀLRUNIS:', paymentPhone]
            ];

            const docDefinition = {
              pageSize: 'A4',
              pageMargins: [15, 15, 15, 15],
              content: [
                {
                  columns: [
                    { text: 'RĒĶINS', fontSize: 32, bold: true },
                    {
                      text: buildingName + '\n' + buildingCode + '\n' + buildingAddress,
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
                        invoice.invoice_number + '\n\n',
                        { text: 'Periods:\n', bold: true },
                        invoice.period + '\n\n',
                        { text: 'Termiņš:\n', bold: true },
                        new Date(invoice.due_date).toLocaleDateString('lv-LV')
                      ],
                      fontSize: 11
                    }
                  ],
                  marginBottom: 20
                },

                {
                  text: 'SAŅĒMĒJS',
                  fontSize: 12,
                  bold: true,
                  marginBottom: 8
                },
                {
                  text: 'Dzīvoklis Nr. ' + apt.number + '\n' +
                        (apt.owner_name ? 'Vārds: ' + apt.owner_name + '\n' : '') +
                        (apt.owner_surname ? 'Uzvārds: ' + apt.owner_surname + '\n' : '') +
                        (apt.email ? 'E-pasts: ' + apt.email + '\n' : '') +
                        (apt.declared_persons ? 'Deklarēto personu skaits: ' + apt.declared_persons + '\n' : '') +
                        (apt.registration_number ? 'Reģistrācijas numurs: ' + apt.registration_number + '\n' : '') +
                        (apt.apartment_address ? 'Adrese: ' + apt.apartment_address + '\n' : '') +
                        'Platība: ' + apt.area + ' m²',
                  fontSize: 10,
                  marginBottom: 20
                },

                {
                  table: {
                    headerRows: 1,
                    widths: ['*', 90, 80, 80],
                    body: tableRows
                  },
                  layout: {
                    hLineWidth: function() { return 0.5; },
                    vLineWidth: function() { return 0.5; },
                    hLineColor: function() { return '#cccccc'; },
                    vLineColor: function() { return '#cccccc'; }
                  },
                  marginBottom: 15
                },

                {
                  alignment: 'right',
                  columns: [
                    { width: '70%', text: '' },
                    {
                      width: '30%',
                      table: {
                        widths: ['*', '*'],
                        body: [
                          [
                            { text: 'Summa bez PVN:', bold: true },
                            { text: '€' + amountWithoutVat.toFixed(2), alignment: 'right' }
                          ],
                          ...(vatAmount > 0 ? [[
                            { text: 'PVN:', bold: true },
                            { text: '€' + vatAmount.toFixed(2), alignment: 'right' }
                          ]] : []),
                          [
                            { text: 'KOPĀ:', fontSize: 14, bold: true, color: '#003399' },
                            { text: '€' + amountWithVat.toFixed(2), fontSize: 14, bold: true, color: '#003399', alignment: 'right' }
                          ]
                        ]
                      },
                      layout: 'noBorders'
                    }
                  ],
                  marginBottom: 30
                },

                {
                  table: {
                    widths: ['30%', '70%'],
                    body: paymentRows.map(row => [
                      { text: row[0], bold: true, fontSize: 10, color: '#4b5563' },
                      { text: row[1], fontSize: 10, color: '#5a6c7d' }
                    ])
                  },
                  layout: 'noBorders'
                }
              ],
              styles: {
                tableHeader: {
                  fontSize: 10,
                  color: '#000000',
                  fillColor: '#f5f5f5'
                },
                sectionHeader: {
                  fontSize: 11,
                  bold: true,
                  color: '#333',
                  fillColor: '#f5f5f5'
                },
                tableBody: {
                  fontSize: 10
                },
                debt: {
                  color: '#991b1b'
                },
                overpayment: {
                  color: '#1e40af'
                }
              }
            };

            const pdfDoc = window.pdfMake.createPdf(docDefinition);
            
            pdfDoc.getBase64((base64) => {
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
              
              if (generatedCount === monthInvoices.length) {
                setTimeout(() => {
                  zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }).then(zipContent => {
                    const zipUrl = URL.createObjectURL(zipContent);
                    const link = document.createElement('a');
                    link.href = zipUrl;
                    link.download = `recini_${period}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    
                    setTimeout(() => {
                      document.body.removeChild(link);
                      URL.revokeObjectURL(zipUrl);
                      showToast(`✓ ZIP lejuplādes ar ${generatedCount} PDF rēķiniem`);
                    }, 200);
                  }).catch(err => {
                    console.error('ZIP ģenerēšanas kļūda:', err);
                    showToast('Kļūda ZIP ģenerēšanā', 'error');
                  });
                }, 500);
              }
            });

          } catch (err) {
            console.error(`Kļūda rēķinam ${invoice.invoice_number}:`, err);
          }
        })();
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