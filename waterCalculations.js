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

  // 1. Sinhronizācijas pārbaude / Patēriņa iegūšana
  const coldReading = meterReadings.find(mr => String(mr.apartment_id) === String(apt.id) && mr.meter_type === 'water' && mr.period === period);
  const hotReading = meterReadings.find(mr => String(mr.apartment_id) === String(apt.id) && mr.meter_type === 'hot_water' && mr.period === period);
  
  let waterCons = waterConsumption.find(wc => String(wc.apartment_id) === String(apt.id) && wc.meter_type === 'water' && wc.period === period);
  let hotWaterCons = waterConsumption.find(wc => String(wc.apartment_id) === String(apt.id) && wc.meter_type === 'hot_water' && wc.period === period);

  // Ja patēriņa ieraksta nav, bet rādījums ir - aprēķinām "lidojumā"
  if (coldReading && ostReading(apt.id, 'water', period, meterReadings);
    waterCons = { consumption_m3: Math.max(0, (coldReading.reading_value || 0) - (prev?.reading_value || 0)) };
  }
  if (hotReading && (!hotWaterCons || hotWaterCons.consumption_m3 === null || hotWaterCons.consumption_m3 === undefined)) {
    const prev = getoconsumption_m3: Math.max(0, (hotReading.reading_value || 0) - (prev?.reading_value || 0)) };
  }

  // 2. AUKSTAIS ŪDENS
  if (waterCons && waterCons.consumption_m3 !== null && (waterTariff ? waterTariff.include_in_invoice !== false : true)) {
    const m3 = Math.ma undefined && waterTariff.vat_rate !== null) 
      ? parseFloat(waterTariff.vat_rate) 
      : 21;
    const vat = Math.round(amount * vatRate / 100 * 100) / 100;

    totalAmountWithomount;
    details.push({
      tariff_id: waterTariff?.id || null,
      tariff_name: `❄️ Aukstais ūdens (${m3} m³)`,
      consumption_m3: m3,
      price_per_m3: price,
      amount_without_vat: amount,
      vat_rate: va
      type: 'water'
    });
  } else if ((!waterCons || waterCons.consumption_m3 === null) && waterTariff && parseFloat(waterTariff.diff_m3 || 0) > 0) {
    // AUKSTĀ ŪDENS STARPĪBA (tikai ja nav nodots rādījums)
    const count = nonReportingColdCount ?? apartments.filter(a => 
      !meterReadings.find(mr => String(mr.apartment_id) === String(a.id) && mr.meter_type === 'water' && mr.period === period)
    ).length;

    if (count > 0) {
      const sdffPrice = parseFloat(waterTariff.diff_price) || 0;
      const amount = Math.round(shareM3 * diffPrice * 100) / 100;
      const vatRate = (waterTariff && waterTariff.vat_rate !== undefined && waterTariff.vat_rate !== null)
        ? parseFloat(waterTariff.vat_rate)
        : 21;
      const vat = Math.round(amount * vatRate / 100 * 100) / 100;

      totalAmountWithoutVat += amount;
      totalVatAmount += vat;
      details.push({
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

  // 3. SILTĀ ŪDENS STARPĪBA (tikai ja nav nodots rādījums)
  if ((!hotWaterCons || hotWaterCons.consumption_m3 === null) && hotWaterTariff && parseFloat(hotWaterTariff.diff_m3 || 0) > 0) {
    const count = nonReportingHotCount ?? apartments.filter(a => 
      !meterReadings.find(mr => String(mr.apartment_id) === String(a.id) && mr.meter_type === 'hot_water' && mr.period === period)
    ).length;

    if (count > 0) {
      const shareM3 = parseFloat(hotWaterTariff.diff_m3) / count;
      const diffPrice = parseFloat(hotWaterTariff.diff_price) || 0;
      const amount = Math.round(shareM3 * diffPrice * 100) / 100;
      r ? parseFloat(hotWaterTariff.vat_rate)
        : 12;
      const vat = Math.round(amount * vatRate / 100 * 100) / 100;

      totalAmountWithoutVat += amount;
      totalVatAmount += vat;
      details.push({
        tariff_id: hotWaterTariff.id,
        tariff_name: `🔥 Siltā ūdens starpība (${shareM3.toFixed
        price_per_m3: diffPrice,
        amount_without_vat: amount,
        vat_rate: vatRate,
        vat_amount: vat,
        type: 'hot_water_diff'
      });
    }
  }

  // 4. SILTAIS ŪDENS
  if (hotWaterCons && hotWaterCons.consumption_m3 !== null && (hotWaterTariff ? hotWaterTariff.include_in_invoice !== false : true)) {
    const m3 = Math.max(0, parseFloat(hotWaterCons.consumption_m3 || 0));
    const price = hotWaterTariff ? (parseFloat(hotWaterTariff.price_per_m3) || 0) : 0;
    const amount = Math.round(m3 * price * 100) / 100;
    const vatRate = (hotWaterTariff && hotWaterTariff.vat_rate !== undefined && hotWaterTariff.vat_rate !== null)
      ? parseFloat(hotWaterTariff.vat_rate)
      : 12;
    const vat = Math.round(amount * vatRate / 100 * 100) / 100;

    totalAmountWithoutVat += amount;
    totalVatAmount +=
      consumption_m3: m3,
      price_per_m3: price,
      amount_without_vat: amount,
      vat_rate: vatRate,
      vat_amount: ver'
    });
  }

  // (Piezīme: Siltā ūdens starpību var pievienot līdzīgi, ja nepieciešams)

  return { details, waterAmountWithoutVat: totalAmountWithoutVat, waterVatAmount: totalVatAmount };
};