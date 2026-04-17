/**
 * Ūdens patēriņa un tarifu aprēķinu loģika
 */

/**
 * Normalizē perioda virkni uz YYYY-MM formātu (piem. 2024-3 -> 2024-03)
 */
const normalizePeriod = (p) => {
  if (!p || typeof p !== 'string') return p;
  const parts = p.split('-');
  if (parts.length !== 2) return p;
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

  // Helper funkcija patēriņa noteikšanai
  const getConsumption = (type) => {
    // 1. Prioritāte: Sinhronizētais patēriņš no tabulas
    const entry = waterConsumption.find(wc => 
      String(wc.apartment_id) === String(apt.id) && 
      wc.meter_type === type && 
      normalizePeriod(wc.period) === normPeriod
    );
    const hasValidEntry = entry && entry.consumption_m3 !== null && entry.consumption_m3 !== undefined;
    if (hasValidEntry) return parseFloat(entry.consumption_m3);

    // 2. Sekundāri: Aprēķins no rādījumiem "on the fly"
    const currentReading = meterReadings.find(mr => 
      String(mr.apartment_id) === String(apt.id) && 
      mr.meter_type === type && 
      normalizePeriod(mr.period) === normPeriod
    );
    if (currentReading && currentReading.reading_value !== null && currentReading.reading_value !== undefined) {
      const prev = getLastReading(apt.id, type, normPeriod, meterReadings);
      const currentVal = parseFloat(currentReading.reading_value) || 0;
      const prevVal = (prev && prev.reading_value !== null && prev.reading_value !== undefined) 
        ? parseFloat(prev.reading_value) 
        : 0;
      return Math.max(0, currentVal - prevVal);
    }
    return null;
  };

  const coldM3 = getConsumption('water');
  const hotM3 = getConsumption('hot_water');

  // 2. AUKSTĀ ŪDENS STARPĪBA
  if (coldM3 === null && waterTariff && parseFloat(waterTariff.diff_m3 || 0) > 0) {
    // AUKSTĀ ŪDENS STARPĪBA (tikai ja nav nodots rādījums)
    const count = nonReportingColdCount ?? apartments.filter(a => 
      !meterReadings.find(mr => String(mr.apartment_id) === String(a.id) && mr.meter_type === 'water' && normalizePeriod(mr.period) === normPeriod)
    ).length;
    if (count > 0) {
      const shareM3 = parseFloat(waterTariff.diff_m3) / count;
      const diffPrice = parseFloat(waterTariff.diff_price) || 0;
      const amount = Math.round(shareM3 * diffPrice * 100) / 100;
      const vatRate = (waterTariff && waterTariff.vat_rate !== undefined && waterTariff.vat_rate !== null) 
        ? parseFloat(waterTariff.vat_rate)
        : 21;
      const vat = Math.round(amount * vatRate / 100 * 100) / 100;

      totalAmountWithoutVat += amount;
      totalVatAmount += vat;
      details.push({
        tariff_id: waterTariff?.id || null,
        tariff_name: `💧 Ūdens patēriņa starpība (${shareM3.toFixed(2)} m³)`,
        consumption_m3: shareM3,
        price_per_m3: diffPrice,
        amount_without_vat: amount,
        vat_rate: vatRate,
        vat_amount: vat,
        type: 'water_diff'
      });
    }
  }

  // 2.1 AUKSTAIS ŪDENS (Patēriņš)
  if (coldM3 !== null && (waterTariff ? waterTariff.include_in_invoice !== false : coldM3 >= 0)) {
    const m3 = coldM3;
    const price = waterTariff ? (parseFloat(waterTariff.price_per_m3) || 0) : 0;
    const amount = Math.round(m3 * price * 100) / 100;
    const vatRate = (waterTariff && waterTariff.vat_rate !== null && waterTariff.vat_rate !== undefined) 
      ? Number(waterTariff.vat_rate) 
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

  // 3. SILTĀ ŪDENS STARPĪBA
  if (hotM3 === null && hotWaterTariff && parseFloat(hotWaterTariff.diff_m3 || 0) > 0) {
    const count = nonReportingHotCount ?? apartments.filter(a => 
      !meterReadings.find(mr => String(mr.apartment_id) === String(a.id) && mr.meter_type === 'hot_water' && normalizePeriod(mr.period) === normPeriod)
    ).length;

    if (count > 0) {
      const shareM3 = parseFloat(hotWaterTariff.diff_m3) / count;
      const diffPrice = parseFloat(hotWaterTariff.diff_price) || 0;
      const amount = Math.round(shareM3 * diffPrice * 100) / 100;
      const vatRate = (hotWaterTariff && hotWaterTariff.vat_rate !== null) ? Number(hotWaterTariff.vat_rate) : 12;
      const vat = Math.round(amount * vatRate / 100 * 100) / 100;

      totalAmountWithoutVat += amount;
      totalVatAmount += vat;
      details.push({
        tariff_id: hotWaterTariff?.id || null,
        tariff_name: `🔥 Siltā ūdens starpība (${Number(shareM3).toFixed(2)} m³)`,
        consumption_m3: shareM3,
        price_per_m3: diffPrice,
        amount_without_vat: amount,
        vat_rate: vatRate,
        vat_amount: vat,
        type: 'hot_water_diff' // Pievienots hot_water_diff tips
      });
    }
  }

  // 4. SILTAIS ŪDENS
  if (hotM3 !== null && (hotWaterTariff ? hotWaterTariff.include_in_invoice !== false : hotM3 >= 0)) {
    const m3 = hotM3;
    const price = hotWaterTariff ? (parseFloat(hotWaterTariff.price_per_m3) || 0) : 0;
    const amount = Math.round(m3 * price * 100) / 100;
    const vatRate = (hotWaterTariff && hotWaterTariff.vat_rate !== null && hotWaterTariff.vat_rate !== undefined) 
      ? Number(hotWaterTariff.vat_rate) 
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
  }

  return { details, waterAmountWithoutVat: totalAmountWithoutVat, waterVatAmount: totalVatAmount };
};