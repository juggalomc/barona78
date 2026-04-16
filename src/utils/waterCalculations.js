/**
 * Ūdens patēriņa un tarifu aprēķinu loģika
 */

/**
 * Atrod pēdējo pieejamo rādījumu pirms norādītā perioda
 */
export const getLastReading = (apartmentId, meterType, currentPeriod, readings) => {
  if (!readings) return null;
  const relevant = readings
    .filter(mr => 
      String(mr.apartment_id) === String(apartmentId) && 
      mr.meter_type === meterType && 
      mr.period < currentPeriod
    )
    .sort((a, b) => b.period.localeCompare(a.period));
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

  // Helper funkcija patēriņa noteikšanai
  const getConsumption = (type) => {
    // 1. Prioritāte: Sinhronizētais patēriņš no tabulas
    const entry = waterConsumption.find(wc => 
      String(wc.apartment_id) === String(apt.id) && 
      wc.meter_type === type && 
      wc.period === period
    );
    if (entry) return parseFloat(entry.consumption_m3) || 0;

    // 2. Sekundāri: Aprēķins no rādījumiem "on the fly"
    const currentReading = meterReadings.find(mr => 
      String(mr.apartment_id) === String(apt.id) && 
      mr.meter_type === type && 
      mr.period === period
    );
    if (currentReading) {
      const prev = getLastReading(apt.id, type, period, meterReadings);
      return Math.max(0, (parseFloat(currentReading.reading_value) || 0) - (parseFloat(prev?.reading_value) || 0));
    }
    return null; // Nav ne patēriņa, ne rādījuma
  };

  const coldM3 = getConsumption('water');
  const hotM3 = getConsumption('hot_water');

  // 2. AUKSTAIS ŪDENS
  if (coldM3 !== null && waterTariff && waterTariff.include_in_invoice !== false) {
    const m3 = coldM3;
    const price = parseFloat(waterTariff.price_per_m3) || 0;
    const amount = Math.round(m3 * price * 100) / 100;
    const vatRate = parseFloat(waterTariff.vat_rate) || 21;
    const vat = Math.round(amount * vatRate / 100 * 100) / 100;

    totalAmountWithoutVat += amount;
    totalVatAmount += vat;
    details.push({
      tariff_id: waterTariff.id,
      tariff_name: `❄️ Aukstais ūdens (${m3.toFixed(2)} m³)`,
      consumption_m3: m3,
      price_per_m3: price,
      amount_without_vat: amount,
      vat_rate: vatRate,
      vat_amount: vat,
      type: 'water'
    });
  } else if (coldM3 === null && waterTariff && parseFloat(waterTariff.diff_m3) > 0) {
    // AUKSTĀ ŪDENS STARPĪBA (tikai ja nav nodots rādījums)
    const count = nonReportingColdCount ?? apartments.filter(a => 
      !meterReadings.find(mr => String(mr.apartment_id) === String(a.id) && mr.meter_type === 'water' && mr.period === period)
    ).length;
    if (count > 0) {
      const shareM3 = parseFloat(waterTariff.diff_m3) / count;
      const diffPrice = parseFloat(waterTariff.diff_price) || 0;
      const amount = Math.round(shareM3 * diffPrice * 100) / 100;
      const vatRate = parseFloat(waterTariff.vat_rate) || 21;
      const vat = Math.round(amount * vatRate / 100 * 100) / 100;

      totalAmountWithoutVat += amount;
      totalVatAmount += vat;
      details.push({
        tariff_id: waterTariff.id,
        tariff_name: `💧 Ūdens patēriņa starpība (${shareM3.toFixed(2)} m³)`,
        consumption_m3: shareM3,
        price_per_m3: diffPrice,
        amount_without_vat: amount,
        vat_rate: vatRate,
        vat_amount: vat,
        type: 'water_diff' // Atpazīstams kā aukstā ūdens starpība
      });
    }
  }

  // 3. SILTĀ ŪDENS STARPĪBA (tikai ja nav nodots rādījums)
  if (hotM3 === null && hotWaterTariff && parseFloat(hotWaterTariff.diff_m3) > 0) {
    const count = nonReportingHotCount ?? apartments.filter(a => 
      !meterReadings.find(mr => String(mr.apartment_id) === String(a.id) && mr.meter_type === 'hot_water' && mr.period === period)
    ).length;

    if (count > 0) {
      const shareM3 = parseFloat(hotWaterTariff.diff_m3) / count;
      const diffPrice = parseFloat(hotWaterTariff.diff_price) || 0;
      const amount = Math.round(shareM3 * diffPrice * 100) / 100;
      const vatRate = parseFloat(hotWaterTariff.vat_rate) || 12;
      const vat = Math.round(amount * vatRate / 100 * 100) / 100;

      totalAmountWithoutVat += amount;
      totalVatAmount += vat;
      details.push({
        tariff_id: hotWaterTariff.id,
        tariff_name: `🔥 Siltā ūdens starpība (${shareM3.toFixed(2)} m³)`,
        consumption_m3: shareM3,
        price_per_m3: diffPrice,
        amount_without_vat: amount,
        vat_rate: vatRate,
        vat_amount: vat,
        type: 'hot_water_diff'
      });
    }
  }

  // 4. SILTAIS ŪDENS
  if (hotM3 !== null && hotWaterTariff && hotWaterTariff.include_in_invoice !== false) {
    const m3 = hotM3;
    const price = parseFloat(hotWaterTariff.price_per_m3) || 0;
    const amount = Math.round(m3 * price * 100) / 100;
    const vatRate = parseFloat(hotWaterTariff.vat_rate) || 12;
    const vat = Math.round(amount * vatRate / 100 * 100) / 100;

    totalAmountWithoutVat += amount;
    totalVatAmount += vat;
    details.push({
      tariff_id: hotWaterTariff.id,
      tariff_name: `🔥 Siltais ūdens (${m3.toFixed(2)} m³)`,
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