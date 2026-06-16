// Noņemam importu, jo ūdens aprēķinu loģika tiks inlinēta

export const normalizePeriod = (p) => {
  if (!p || typeof p !== 'string') return p;
  const parts = p.split('-');
  if (parts.length !== 2) return p;
  return `${parts[0]}-${parts[1].padStart(2, '0')}`;
};

/**
 * Aprēķina rēķina summu BEZ parāda un pārmaksas
 * (tikai pakalpojumi un ūdens bez iepriekšējo periodu koriģējumiem)
 */
export const calculateBaseAmount = (invoice) => {
  if (!invoice || !invoice.invoice_details) return 0;
  
  let invoiceDetails = [];
  try {
    invoiceDetails = typeof invoice.invoice_details === 'string' 
      ? JSON.parse(invoice.invoice_details) 
      : invoice.invoice_details;
  } catch (e) {
    console.error("Kļūda apstrādājot rēķina detaļas:", e);
    return parseFloat(invoice.amount_without_vat) || 0;
  }

  // Summējam tikai pakalpojumus, ūdeni un atkritumu rindas - ne parādu un pārmaksu
  const baseAmount = invoiceDetails
    .filter(d => !['debt', 'overpayment'].includes(d.type))
    .reduce((sum, d) => sum + (parseFloat(d.amount_without_vat) || 0), 0);
  
  return Math.round(baseAmount * 100) / 100;
};

/**
 * Centralizēta funkcija rēķina rindu un summu aprēķināšanai
 */
export const calculateInvoiceAmounts = ({
  apt,
  period,
  periodTariffs,
  waterTariffs,
  hotWaterTariffs,
  wasteTariffs,
  meterReadings,
  waterConsumption,
  apartments,
  previousDebt = 0,
  overpayment = 0,
  nonReportingColdCount = null,
  nonReportingHotCount = null
}) => {
  let totalAmountWithoutVat = 0;
  let totalVatAmount = 0;
  let invoiceDetails = [];
  let waterDetails = []; // Detaļas tikai ūdenim
  let missingTariffs = [];
  const normPeriod = normalizePeriod(period);

  // 1. Vispārīgie tarifi (pēc platības)
  for (const tariff of periodTariffs) {
    // Apstrādājam izslēgtos dzīvokļus
    const excludedIds = Array.isArray(tariff.excluded_apartments) 
      ? tariff.excluded_apartments 
      : JSON.parse(tariff.excluded_apartments || '[]');
    
    // Ja šis konkrētais dzīvoklis ir izslēgto sarakstā, izlaižam šo tarifu
    if (excludedIds.includes(apt.id)) continue;

    const isResidential = apt.is_residential !== false;
    if (tariff.target_type === 'residential' && !isResidential) continue;
    if (tariff.target_type === 'non_residential' && isResidential) continue;
    
    let amountWithoutVat = 0;
    let pricePerUnit = 0;

    if (tariff.is_per_m2) {
      // A: Fiksēta cena par m2
      pricePerUnit = parseFloat(tariff.price_per_m2) || 0;
      amountWithoutVat = pricePerUnit * parseFloat(apt.area);
    } else if (tariff.is_equal_split) {
      // B: Kopējā summa sadalīta vienādi starp iesaistītajiem dzīvokļiem
      const participatingCount = apartments.filter(a => {
        const matchesTarget = !tariff.target_type || tariff.target_type === 'all' || 
          (tariff.target_type === 'residential' && a.is_residential !== false) ||
          (tariff.target_type === 'non_residential' && a.is_residential === false);
        return matchesTarget && !excludedIds.includes(a.id);
      }).length;
      pricePerUnit = participatingCount > 0 ? (parseFloat(tariff.total_amount) / participatingCount) : 0;
      amountWithoutVat = pricePerUnit;
    } else if (tariff.is_fixed_amount) {
      // D: Fiksēta summa katram dzīvoklim (manuāli ievadīta)
      pricePerUnit = parseFloat(tariff.price_per_unit) || 0;
      amountWithoutVat = pricePerUnit;
    } else {
      // C: Kopējā summa sadalīta proporcionāli platībai starp iesaistītajiem
      const totalArea = apartments.reduce((sum, a) => {
        const matchesTarget = !tariff.target_type || tariff.target_type === 'all' || 
          (tariff.target_type === 'residential' && a.is_residential !== false) ||
          (tariff.target_type === 'non_residential' && a.is_residential === false);
        return (matchesTarget && !excludedIds.includes(a.id)) ? sum + (parseFloat(a.area) || 0) : sum;
      }, 0);
      pricePerUnit = totalArea > 0 ? (parseFloat(tariff.total_amount) / totalArea) : 0;
      amountWithoutVat = pricePerUnit * parseFloat(apt.area);
    }

    amountWithoutVat = Math.round(amountWithoutVat * 100) / 100;
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
      price_per_sqm: (tariff.is_equal_split || tariff.is_fixed_amount) ? null : pricePerUnit,
      price_per_unit: (tariff.is_equal_split || tariff.is_fixed_amount) ? pricePerUnit : null,
      is_equal_split: !!tariff.is_equal_split,
      is_fixed_amount: !!tariff.is_fixed_amount,
      type: 'tariff' 
    });
  }

  // 2. Atkritumi (pēc personām)
  const wasteTariff = wasteTariffs.find(w => normalizePeriod(w.period) === normPeriod);
  if (wasteTariff && wasteTariff.include_in_invoice !== false) {
    const totalDeclaredPersons = apartments.reduce((sum, a) => sum + (parseInt(a.declared_persons) || 0), 0);
    if (totalDeclaredPersons > 0) {
      const declaredPersonsInApt = parseInt(apt.declared_persons) || 0;
      const pricePerPerson = parseFloat(wasteTariff.total_amount) / totalDeclaredPersons;
      const wasteAmountWithoutVat = Math.round((pricePerPerson * declaredPersonsInApt) * 100) / 100;
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
        price_per_person: pricePerPerson,
        type: 'waste' 
      });
    }
  }

  // 3. Ūdens (inlinēta loģika no waterCalculations)
  const waterT = waterTariffs.find(w => normalizePeriod(w.period) === normPeriod);
  const hotWaterT = hotWaterTariffs.find(w => normalizePeriod(w.period) === normPeriod);

  if (!waterT) missingTariffs.push('Aukstā ūdens tarifs');
  if (!hotWaterT) missingTariffs.push('Siltā ūdens tarifs');

  // Helper funkcija patēriņa noteikšanai (pārvietota no waterCalculations.js)
  const getConsumption = (type) => {
    const safeWC = waterConsumption || [];
    
    const entry = safeWC.find(wc => {
      const aptMatch = String(wc.apartment_id) === String(apt.id);
      const typeMatch = String(wc.meter_type) === String(type);
      const periodMatch = normalizePeriod(wc.period) === normPeriod;
      return aptMatch && typeMatch && periodMatch;
    });

    if (entry !== undefined && entry.consumption_m3 !== null && entry.consumption_m3 !== undefined) {
      return parseFloat(entry.consumption_m3);
    }
    return null;
  };

  const coldM3 = getConsumption('water');
  const hotM3 = getConsumption('hot_water');

  let waterAmountWithoutVat = 0;
  let waterVatAmount = 0;

 // ==========================================
  // AUKSTAIS ŪDENS
  // ==========================================
  if (waterT && waterT.include_in_invoice !== false) {
    const m3 = coldM3 !== null ? coldM3 : 0;
    const price = parseFloat(waterT.price_per_m3) || 0;
    const amount = Math.round(m3 * price * 100) / 100;
    const vatRate = (waterT.vat_rate !== undefined && waterT.vat_rate !== null)
      ? parseFloat(waterT.vat_rate)
      : 21;
    const vat = Math.round(amount * vatRate / 100 * 100) / 100;

    waterAmountWithoutVat += amount;
    waterVatAmount += vat;
    waterDetails.push({
      tariff_id: waterT?.id || null,
      tariff_name: `❄️ Aukstais ūdens (${Number(m3).toFixed(2)} m³)`,
      consumption_m3: m3,
      price_per_m3: price,
      amount_without_vat: amount,
      vat_rate: vatRate,
      vat_amount: vat,
      type: 'water'
    });

    // AUKSTĀ ŪDENS STARPĪBA
    if (coldM3 === null && parseFloat(waterT.diff_m3 || 0) > 0) {
      const safeApts = Array.isArray(apartments) ? apartments : [];
      const count = nonReportingColdCount ?? safeApts.filter(a => {
        const hasWc = (waterConsumption || []).some(wc =>
          String(wc.apartment_id) === String(a.id) &&
          String(wc.meter_type) === 'water' &&
          normalizePeriod(wc.period) === normPeriod &&
          wc.consumption_m3 !== null);
        return !hasWc;
      }).length;

      if (count > 0) {
        const shareM3 = parseFloat(waterT.diff_m3) / count;
        const diffPrice = parseFloat(waterT.diff_price) || 0;
        const diffAmount = Math.round(shareM3 * diffPrice * 100) / 100;
        const diffVat = Math.round(diffAmount * vatRate / 100 * 100) / 100;

        waterAmountWithoutVat += diffAmount;
        waterVatAmount += diffVat;
        waterDetails.push({
          tariff_id: waterT?.id || null,
          tariff_name: `❄️ Aukstā ūdens starpība (${Number(shareM3).toFixed(2)} m³)`,
          consumption_m3: shareM3,
          price_per_m3: diffPrice,
          amount_without_vat: diffAmount,
          vat_rate: vatRate,
          vat_amount: diffVat,
          type: 'water_diff'
        });
      }
    }
  }

  // ==========================================
  // SILTAIS ŪDENS
  // ==========================================
  if (hotWaterT && hotWaterT.include_in_invoice !== false) {
    const m3 = hotM3 !== null ? hotM3 : 0;
    const price = parseFloat(hotWaterT.price_per_m3) || 0;
    const amount = Math.round(m3 * price * 100) / 100;
    const vatRate = (hotWaterT.vat_rate !== undefined && hotWaterT.vat_rate !== null)
      ? parseFloat(hotWaterT.vat_rate)
      : 12;
    const vat = Math.round(amount * vatRate / 100 * 100) / 100;

    waterAmountWithoutVat += amount;
    waterVatAmount += vat;
    waterDetails.push({
      tariff_id: hotWaterT?.id || null,
      tariff_name: `🔥 Siltais ūdens (${Number(m3).toFixed(2)} m³)`,
      consumption_m3: m3,
      price_per_m3: price,
      amount_without_vat: amount,
      vat_rate: vatRate,
      vat_amount: vat,
      type: 'hot_water'
    });

    // SILTĀ ŪDENS STARPĪBA (Salabota un pabeigta loģika)
    if (hotM3 === null && parseFloat(hotWaterT.diff_m3 || 0) > 0) {
      const safeApts = Array.isArray(apartments) ? apartments : [];
      const count = nonReportingHotCount ?? safeApts.filter(a => {
        const hasWc = (waterConsumption || []).some(wc =>
          String(wc.apartment_id) === String(a.id) &&
          String(wc.meter_type) === 'hot_water' &&
          normalizePeriod(wc.period) === normPeriod &&
          wc.consumption_m3 !== null);
        return !hasWc;
      }).length;

      if (count > 0) {
        const shareM3 = parseFloat(hotWaterT.diff_m3) / count;
        const diffPrice = parseFloat(hotWaterT.diff_price) || 0;
        const diffAmount = Math.round(shareM3 * diffPrice * 100) / 100;
        const diffVat = Math.round(diffAmount * vatRate / 100 * 100) / 100;

        waterAmountWithoutVat += diffAmount;
        waterVatAmount += diffVat;
        waterDetails.push({
          tariff_id: hotWaterT?.id || null,
          tariff_name: `🔥 Siltā ūdens starpība (${Number(shareM3).toFixed(2)} m³)`,
          consumption_m3: shareM3,
          price_per_m3: diffPrice,
          amount_without_vat: diffAmount,
          vat_rate: vatRate,
          vat_amount: diffVat,
          type: 'hot_water_diff'
        });
      }
    }
  }

  invoiceDetails.push(...waterDetails);
  totalAmountWithoutVat += waterAmountWithoutVat;
  totalVatAmount += waterVatAmount;

  // 4. Parādi un Pārmaksas (Pievienojam rēķina sarakstam un gala summai)
  // Svarīgi: Šīs summas tiek pieskaitītas tikai vienu reizi un neietekmē PVN aprēķinu
  if (previousDebt > 0) {
    invoiceDetails.push({ 
      tariff_id: null, 
      tariff_name: '⚠️ Parāds no iepriekšējiem mēnešiem', 
      amount_without_vat: Math.round(previousDebt * 100) / 100, 
      vat_rate: 0, 
      vat_amount: 0, 
      type: 'debt',
      debt_reason: 'Neapmaksāts parāds no iepriekšējiem periodiem'
    });
    totalAmountWithoutVat += Math.round(previousDebt * 100) / 100;
  }

  if (overpayment > 0) {
    // Pārmaksa tiek attēlota kā negatīva rinda rēķinā
    invoiceDetails.push({ 
      tariff_id: null, 
      tariff_name: '💰 Pārmaksa no iepriekšējā mēneša', 
      amount_without_vat: -Math.round(overpayment * 100) / 100, 
      vat_rate: 0, 
      vat_amount: 0, 
      type: 'overpayment',
      overpayment_reason: 'Pārmaksa, ko var attiecināt uz šo mēnesi'
    });
    totalAmountWithoutVat -= Math.round(overpayment * 100) / 100;
  }

  // Gala summa = Visu rindu summa (ieskaitot parādu/pārmaksu) + Aprēķinātais PVN no pakalpojumiem.
  // Tā kā parādam un pārmaksai PVN likme ir 0, tie neietekmē totalVatAmount, 
  // bet to iekļaušana totalAmountWithoutVat nodrošina datu integritāti.
  const totalAmountWithVat = Math.round((totalAmountWithoutVat + totalVatAmount) * 100) / 100;

  return {
    invoiceDetails,
    totalAmountWithoutVat,
    totalVatAmount,
    totalAmountWithVat,
    missingTariffs
  };
};