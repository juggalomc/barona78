/**
 * Ūdens patēriņa un tarifu aprēķinu loģika
 */

/**
 * Normalizē perioda virkni uz YYYY-MM formātu (piem. 2024-3 -> 2024-03)
 */
export const normalizePeriod = (p) => {
  if (!p || typeof p !== 'string') return p;
  const parts = p.split('-');
  if (parts.length < 2) return p;
  return `${parts[0]}-${parts[1].padStart(2, '0')}`;
};

/**
 * Atrod pēdējo pieejamo rādījumu pirms norādītā perioda
 */
export const getLastReading = (apartmentId, meterType, currentPeriod, readings) => {
  if (!readings) return null;
  const normCurrent = normalizePeriod(currentPeriod);
  const relevant = readings
    .filter(mr => 
      String(mr.apartment_id) === String(apartmentId) && 
      mr.meter_type === meterType && 
      normalizePeriod(mr.period) < normCurrent
    )
    .sort((a, b) => normalizePeriod(b.period).localeCompare(normalizePeriod(a.period)));
  return relevant.length > 0 ? relevant[0] : null;
};

/**
 * Galvenā funkcija ūdens pozīciju aprēķināšanai rēķinam
 */
export const calculateWaterDetails = ({
  apt,
  period,
  meterReadings,
  waterConsumption,
  waterTariff,
  hotWaterTariff,
  apartments,
  nonReportingColdCount = null,
  nonReportingHotCount = null
}) => {
  const details = [];
  let totalAmountWithoutVat = 0;
  let totalVatAmount = 0;
  const normPeriod = normalizePeriod(period);
  const safeApts = Array.isArray(apartments) ? apartments : [];

  // Helper funkcija patēriņa noteikšanai
  const getConsumption = (type) => {
    // 1. Prioritāte: Sinhronizētais patēriņš no tabulas
    const entry = (waterConsumption || []).find(wc => 
      String(wc.apartment_id) === String(apt.id) && 
      wc.meter_type === type && 
      normalizePeriod(wc.period) === normPeriod
    );
    const hasValidEntry = entry && entry.consumption_m3 !== null && entry.consumption_m3 !== undefined;
    if (hasValidEntry) return parseFloat(entry.consumption_m3);

    // 2. Sekundāri: Aprēķins no rādījumiem "on the fly"
    const currentReading = (meterReadings || []).find(mr => 
      String(mr.apartment_id) === String(apt.id) && 
      mr.meter_type === type && 
      normalizePeriod(mr.period) === normPeriod
    );
    if (currentReading && currentReading.reading_value !== null) {
      const prev = getLastReading(apt.id, type, normPeriod, meterReadings);
      if (prev && prev.reading_value !== null) {
        const currentVal = parseFloat(currentReading.reading_value);
        const prevVal = parseFloat(prev.reading_value);
        return Math.max(0, currentVal - prevVal);
      }
      return 0; // Ja nav iepriekšējā mēneša rādījuma, starpība/patēriņš nav zināms un ir 0
    }
    return null;
  };

  const coldM3 = getConsumption('water');
  const hotM3 = getConsumption('hot_water');

  // 2. AUKSTAIS ŪDENS
 if (waterTariff && waterTariff.include_in_invoice !== false) {
  const m3 = coldM3 !== null ? coldM3 : 0;
  const price = parseFloat(waterTariff.price_per_m3) || 0;
  const amount = Math.round(m3 * price * 100) / 100;
  const vatRate = (waterTariff.vat_rate !== undefined && waterTariff.vat_rate !== null)
    ? parseFloat(waterTariff.vat_rate)
    : 21;
  const vat = Math.round(amount * vatRate / 100 * 100) / 100;

  totalAmountWithoutVat += amount;
  totalVatAmount += vat;
  details.push({
    tariff_id: waterTariff?.id || null,
    tariff_name: `❄️ Aukstais ūdens (${Number(m3).toFixed(2)} m³)`,
    consumption_m3: m3,
    price_per_m3: price,
    amount_without_vat: amount,
    vat_rate: vatRate,
    vat_amount: vat,
    type: 'water'
  });

  // ✅ DIFF — iekšā galvenajā blokā, tāpat kā siltajam ūdenim
  if (coldM3 === 0 && parseFloat(waterTariff.diff_m3 || 0) > 0) {
    const count = nonReportingColdCount ?? safeApts.filter(a => {
      const hasWc = (waterConsumption || []).some(wc =>
        String(wc.apartment_id) === String(a.id) && wc.meter_type === 'water' &&
        normalizePeriod(wc.period) === normPeriod && wc.consumption_m3 !== null);
      const hasMr = (meterReadings || []).some(mr =>
        String(mr.apartment_id) === String(a.id) && mr.meter_type === 'water' &&
        normalizePeriod(mr.period) === normPeriod && mr.reading_value !== null);
      return !hasWc && !hasMr;
    }).length;

    if (count > 0) {
      const shareM3 = parseFloat(waterTariff.diff_m3) / count;
      const diffPrice = parseFloat(waterTariff.diff_price) || 0;
      const diffAmount = Math.round(shareM3 * diffPrice * 100) / 100;
      const diffVat = Math.round(diffAmount * vatRate / 100 * 100) / 100;

      totalAmountWithoutVat += diffAmount;
      totalVatAmount += diffVat;
      details.push({
        tariff_id: waterTariff?.id || null,
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

  // 3. SILTAIS ŪDENS
  if (hotWaterTariff && hotWaterTariff.include_in_invoice !== false) {
    const m3 = hotM3 !== null ? hotM3 : 0;
    const price = parseFloat(hotWaterTariff.price_per_m3) || 0;
    const amount = Math.round(m3 * price * 100) / 100;
    const vatRate = (hotWaterTariff && hotWaterTariff.vat_rate !== undefined && hotWaterTariff.vat_rate !== null) 
      ? parseFloat(hotWaterTariff.vat_rate) 
      : 12;
    const vat = Math.round(amount * vatRate / 100 * 100) / 100;

    totalAmountWithoutVat += amount;
    totalVatAmount += vat;
    details.push({
      tariff_id: hotWaterTariff?.id || null,
      tariff_name: `🔥 Siltais ūdens (${Number(m3).toFixed(2)} m³)`,
      consumption_m3: m3,
      price_per_m3: price,
      amount_without_vat: amount,
      vat_rate: vatRate,
      vat_amount: vat,
      type: 'hot_water'
    });
    
    // SILTĀ ŪDENS STARPĪBA (tikai ja nav nodots rādījums un ir starpības summa)
    if (hotM3 === 0 && parseFloat(hotWaterTariff.diff_m3 || 0) > 0) {
      const count = nonReportingHotCount ?? safeApts.filter(a => {
        const hasWc = (waterConsumption || []).some(wc => 
          String(wc.apartment_id) === String(a.id) && wc.meter_type === 'hot_water' && normalizePeriod(wc.period) === normPeriod && wc.consumption_m3 !== null);
        const hasMr = (meterReadings || []).some(mr => 
          String(mr.apartment_id) === String(a.id) && mr.meter_type === 'hot_water' && normalizePeriod(mr.period) === normPeriod && mr.reading_value !== null);
        return !hasWc && !hasMr;
      }).length;

      if (count > 0) {
        const shareM3 = parseFloat(hotWaterTariff.diff_m3) / count;
        const diffPrice = parseFloat(hotWaterTariff.diff_price) || 0;
        const diffAmount = Math.round(shareM3 * diffPrice * 100) / 100;
        const diffVat = Math.round(diffAmount * vatRate / 100 * 100) / 100;

        totalAmountWithoutVat += diffAmount;
        totalVatAmount += diffVat;
        details.push({
          tariff_id: hotWaterTariff?.id || null,
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

  return { details, waterAmountWithoutVat: totalAmountWithoutVat, waterVatAmount: totalVatAmount };
};

/**
 * Aprēķina kopējo ūdens kopsavilkumu par visu māju konkrētam periodam
 */
export const calculateWaterGlobalSummary = (period, waterConsumption, waterTariff, hotWaterTariff) => {
  const normPeriod = normalizePeriod(period);
  
  const getMetrics = (type, tariff) => {
    if (!tariff) return { m3: 0, amountWithoutVat: 0, amountWithVat: 0 };
    
    const totalM3 = waterConsumption
      .filter(wc => normalizePeriod(wc.period) === normPeriod && wc.meter_type === type)
      .reduce((sum, wc) => sum + (parseFloat(wc.consumption_m3) || 0), 0);
    
    const price = parseFloat(tariff.price_per_m3) || 0;
    const diffM3 = parseFloat(tariff.diff_m3) || 0;
    const diffPrice = parseFloat(tariff.diff_price) || 0;
    const vatRate = parseFloat(tariff.vat_rate) || (type === 'water' ? 21 : 12);
    
    const amountWithoutVat = Math.round(((totalM3 * price) + (diffM3 * diffPrice)) * 100) / 100;
    const vatAmount = Math.round((amountWithoutVat * vatRate / 100) * 100) / 100;
    const amountWithVat = Math.round((amountWithoutVat + vatAmount) * 100) / 100;
    
    return { 
      m3: totalM3, 
      amountWithoutVat, 
      amountWithVat 
    };
  };

  return {
    cold: getMetrics('water', waterTariff),
    hot: getMetrics('hot_water', hotWaterTariff)
  };
};