import { useState, useEffect } from 'react';
import { getLastReading } from '../../utils/waterCalculations';

const normalizePeriod = (p) => {
  if (!p || typeof p !== 'string') return p;
  const parts = p.split('-');
  if (parts.length !== 2) return p;
  return `${parts[0]}-${parts[1].padStart(2, '0')}`;
};

const getNextPeriod = (normPeriod) => {
  const [year, month] = normPeriod.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
};

export function useWaterHandlers(supabase, apartments, waterTariffs, hotWaterTariffs, fetchData, showToast, fetchMeterReadingsOnly, meterReadings = []) {
  const [enabledMeters, setEnabledMeters] = useState({ water: true, hot_water: false });
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [tariffPeriod, setTariffPeriod] = useState(currentMonth);
  const [waterTariffForm, setWaterTariffForm] = useState({
    period: currentMonth,
    price_per_m3: '',
    vat_rate: 0,
    include_in_invoice: true,
    diff_m3: '',
    diff_price: ''
  });
  const [hotWaterTariffForm, setHotWaterTariffForm] = useState({
    period: currentMonth,
    price_per_m3: '',
    vat_rate: 0,
    include_in_invoice: true,
    diff_m3: '',
    diff_price: ''
  });

  useEffect(() => {
    const normPeriod = normalizePeriod(tariffPeriod);
    const water = waterTariffs.find(t => normalizePeriod(t.period) === normPeriod);
    setWaterTariffForm(prev => ({
      ...prev,
      period: normPeriod,
      price_per_m3: water ? water.price_per_m3 : '',
      vat_rate: water ? water.vat_rate : 21,
      include_in_invoice: water ? (water.include_in_invoice !== false) : true,
      diff_m3: water ? water.diff_m3 : '',
      diff_price: water ? water.diff_price : ''
    }));

    const hot = hotWaterTariffs.find(t => normalizePeriod(t.period) === normPeriod);
    setHotWaterTariffForm(prev => ({
      ...prev,
      period: normPeriod,
      price_per_m3: hot ? hot.price_per_m3 : '',
      vat_rate: hot ? hot.vat_rate : 12,
      include_in_invoice: hot ? (hot.include_in_invoice !== false) : true,
      diff_m3: hot ? hot.diff_m3 : '',
      diff_price: hot ? hot.diff_price : ''
    }));
  }, [tariffPeriod, waterTariffs, hotWaterTariffs]);

  const saveWaterTariff = async (e) => {
    e.preventDefault();
    try {
      const priceValue = parseFloat(waterTariffForm.price_per_m3 || 0);
      const vatValue = parseFloat(waterTariffForm.vat_rate || 0);
      const period = normalizePeriod(tariffPeriod);
      const diffM3 = parseFloat(waterTariffForm.diff_m3 || 0);
      const diffPrice = parseFloat(waterTariffForm.diff_price || 0);
      const includeInvoice = waterTariffForm.include_in_invoice;

      if (isNaN(priceValue) || priceValue < 0 || priceValue > 9999.99) {
        showToast('Nepareiza cena par m³', 'error');
        return;
      }
      if (isNaN(vatValue) || vatValue < 0 || vatValue > 100) {
        showToast('PVN jābūt no 0 līdz 100%', 'error');
        return;
      }

      const { error } = await supabase
        .from('water_tariffs')
        .upsert({
          period,
          price_per_m3: priceValue,
          vat_rate: vatValue,
          diff_m3: diffM3,
          diff_price: diffPrice,
          include_in_invoice: includeInvoice
        }, { onConflict: 'period' });

      if (error) throw error;
      fetchData();
      showToast('✓ Aukstais ūdens tarifs saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveHotWaterTariff = async (e) => {
    e.preventDefault();
    try {
      const priceValue = parseFloat(hotWaterTariffForm.price_per_m3 || 0);
      const vatValue = parseFloat(hotWaterTariffForm.vat_rate || 0);
      const period = normalizePeriod(tariffPeriod);
      const includeInvoice = hotWaterTariffForm.include_in_invoice;
      const diffM3 = parseFloat(hotWaterTariffForm.diff_m3 || 0);
      const diffPrice = parseFloat(hotWaterTariffForm.diff_price || 0);

      if (isNaN(priceValue) || priceValue < 0 || priceValue > 9999.99) {
        showToast('Nepareiza cena par m³', 'error');
        return;
      }
      if (isNaN(vatValue) || vatValue < 0 || vatValue > 100) {
        showToast('PVN jābūt no 0 līdz 100%', 'error');
        return;
      }

      const { error } = await supabase
        .from('hot_water_tariffs')
        .upsert({
          period,
          price_per_m3: priceValue,
          vat_rate: vatValue,
          include_in_invoice: includeInvoice,
          diff_m3: diffM3,
          diff_price: diffPrice
        }, { onConflict: 'period' });

      if (error) throw error;
      fetchData();
      showToast('✓ Siltais ūdens tarifs saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  // ✅ Palīgfunkcija: ielādē svaigus rādījumus no DB pēc dzīvokļa un tipa
  const fetchFreshReadings = async (apartmentId, meterType) => {
    const { data } = await supabase
      .from('meter_readings')
      .select('*')
      .eq('apartment_id', apartmentId)
      .eq('meter_type', meterType);
    return data || [];
  };

  // ✅ Palīgfunkcija: atjaunina patēriņu arī nākamajam periodam, ja tāds eksistē
  const updateNextPeriodConsumption = async (apartmentId, meterType, normPeriod, newValue, freshReadings) => {
    const nextPeriod = getNextPeriod(normPeriod);
    const nextReading = freshReadings.find(mr =>
      normalizePeriod(mr.period) === nextPeriod
    );
    if (nextReading && nextReading.reading_value !== null) {
      const nextConsumption = Math.max(0, parseFloat(nextReading.reading_value) - newValue);
      await supabase.from('water_consumption').upsert({
        apartment_id: String(apartmentId),
        period: nextPeriod,
        meter_type: meterType,
        consumption_m3: nextConsumption
      }, { onConflict: 'apartment_id,period,meter_type' });
    }
  };

  const saveWaterMeterReading = async (apartmentId, readingValue, period) => {
    try {
      if (!apartmentId || apartmentId === '') {
        showToast('Dzīvoklis nav izvēlēts', 'error');
        return;
      }

      const normPeriod = normalizePeriod(period);
      const fetchReadings = fetchMeterReadingsOnly || fetchData;

      if (readingValue === '' || readingValue === null) {
        const { data: existing } = await supabase
          .from('meter_readings').select('*')
          .eq('apartment_id', apartmentId)
          .eq('meter_type', 'water')
          .eq('period', normPeriod);

        if (existing && existing.length > 0) {
          await supabase.from('meter_readings').delete().eq('id', existing[0].id);
          await supabase.from('water_consumption').delete()
            .eq('apartment_id', String(apartmentId))
            .eq('meter_type', 'water')
            .eq('period', normPeriod);
          fetchReadings();
        }
        return;
      }

      const value = parseFloat(readingValue);
      if (isNaN(value) || value < 0) { showToast('Nepareiza vērtība', 'error'); return; }
      if (value > 9999.99) { showToast('Patēriņš nevar būt lielāks par 9999.99', 'error'); return; }

      // ✅ Svaigie rādījumi no DB, nevis no React state
      const freshReadings = await fetchFreshReadings(apartmentId, 'water');
      const lastReading = getLastReading(apartmentId, 'water', normPeriod, freshReadings);

      if (lastReading && value < parseFloat(lastReading.reading_value)) {
        showToast(`Kļūda: Jaunais rādījums (${value}) nevar būt mazāks par iepriekšējo (${lastReading.reading_value})`, 'error');
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('meter_readings').upsert({
        apartment_id: apartmentId,
        meter_type: 'water',
        reading_date: todayStr,
        reading_value: value,
        period: normPeriod
      }, { onConflict: 'apartment_id,period,meter_type' });

      if (error) throw error;

      // ✅ Patēriņš = starpība no svaigiem datiem
      let consumption = 0;
      if (lastReading && lastReading.reading_value !== null) {
        consumption = Math.max(0, value - parseFloat(lastReading.reading_value));
      }

      await supabase.from('water_consumption').upsert({
        apartment_id: String(apartmentId),
        period: normPeriod,
        meter_type: 'water',
        consumption_m3: consumption
      }, { onConflict: 'apartment_id,period,meter_type' });

      // ✅ Atjaunojam arī nākamā perioda patēriņu
      await updateNextPeriodConsumption(apartmentId, 'water', normPeriod, value, freshReadings);

      fetchReadings();
      showToast('✓ Aukstā ūdens rādījums saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveHotWaterMeterReading = async (apartmentId, readingValue, period) => {
    try {
      if (!apartmentId || apartmentId === '') {
        showToast('Dzīvoklis nav izvēlēts', 'error');
        return;
      }

      const normPeriod = normalizePeriod(period);
      const fetchReadings = fetchMeterReadingsOnly || fetchData;

      if (readingValue === '' || readingValue === null) {
        const { data: existing } = await supabase
          .from('meter_readings').select('*')
          .eq('apartment_id', apartmentId)
          .eq('meter_type', 'hot_water')
          .eq('period', normPeriod);

        if (existing && existing.length > 0) {
          await supabase.from('meter_readings').delete().eq('id', existing[0].id);
          await supabase.from('water_consumption').delete()
            .eq('apartment_id', String(apartmentId))
            .eq('meter_type', 'hot_water')
            .eq('period', normPeriod);
          fetchReadings();
        }
        return;
      }

      const value = parseFloat(readingValue);
      if (isNaN(value) || value < 0) { showToast('Nepareiza vērtība', 'error'); return; }
      if (value > 9999.99) { showToast('Patēriņš nevar būt lielāks par 9999.99', 'error'); return; }

      // ✅ Svaigie rādījumi no DB, nevis no React state
      const freshReadings = await fetchFreshReadings(apartmentId, 'hot_water');
      const lastReading = getLastReading(apartmentId, 'hot_water', normPeriod, freshReadings);

      if (lastReading && value < parseFloat(lastReading.reading_value)) {
        showToast(`Kļūda: Jaunais rādījums (${value}) nevar būt mazāks par iepriekšējo (${lastReading.reading_value})`, 'error');
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('meter_readings').upsert({
        apartment_id: apartmentId,
        meter_type: 'hot_water',
        reading_date: todayStr,
        reading_value: value,
        period: normPeriod
      }, { onConflict: 'apartment_id,period,meter_type' });

      if (error) throw error;

      // ✅ Patēriņš = starpība no svaigiem datiem
      let consumption = 0;
      if (lastReading && lastReading.reading_value !== null) {
        consumption = Math.max(0, value - parseFloat(lastReading.reading_value));
      }

      await supabase.from('water_consumption').upsert({
        apartment_id: String(apartmentId),
        period: normPeriod,
        meter_type: 'hot_water',
        consumption_m3: consumption
      }, { onConflict: 'apartment_id,period,meter_type' });

      // ✅ Atjaunojam arī nākamā perioda patēriņu
      await updateNextPeriodConsumption(apartmentId, 'hot_water', normPeriod, value, freshReadings);

      fetchReadings();
      showToast('✓ Siltā ūdens rādījums saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const editMeterReading = async (meterReadingId, newValue) => {
    try {
      const value = parseFloat(newValue);
      const reading = meterReadings.find(mr => mr.id === meterReadingId);
      if (!reading) return;

      if (isNaN(value) || value < 0) { showToast('Nepareiza vērtība', 'error'); return; }
      if (value > 9999.99) { showToast('Rādījums nevar būt lielāks par 9999.99', 'error'); return; }

      const normPeriod = normalizePeriod(reading.period);

      // ✅ Svaigie rādījumi no DB
      const freshReadings = await fetchFreshReadings(reading.apartment_id, reading.meter_type);
      const lastReading = getLastReading(reading.apartment_id, reading.meter_type, normPeriod, freshReadings);

      if (lastReading && value < parseFloat(lastReading.reading_value)) {
        showToast(`Kļūda: Rādījums nevar būt mazāks par iepriekšējo (${lastReading.reading_value})`, 'error');
        return;
      }

      const { error } = await supabase
        .from('meter_readings')
        .update({ reading_value: value })
        .eq('id', meterReadingId);

      if (error) throw error;

      let consumption = 0;
      if (lastReading && lastReading.reading_value !== null) {
        consumption = Math.max(0, value - parseFloat(lastReading.reading_value));
      }

      await supabase.from('water_consumption').upsert({
        apartment_id: String(reading.apartment_id),
        period: normPeriod,
        meter_type: reading.meter_type,
        consumption_m3: consumption
      }, { onConflict: 'apartment_id,period,meter_type' });

      // ✅ Atjaunojam arī nākamā perioda patēriņu
      await updateNextPeriodConsumption(reading.apartment_id, reading.meter_type, normPeriod, value, freshReadings);

      (fetchMeterReadingsOnly || fetchData)();
      showToast('✓ Skaitītāja rādījums atjaunināts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteMeterReading = async (meterReadingId) => {
    try {
      const readingToDelete = meterReadings.find(mr => mr.id === meterReadingId);
      if (!readingToDelete) {
        showToast('Rādījums nav atrasts', 'error');
        return;
      }

      const { error } = await supabase
        .from('meter_readings')
        .delete()
        .eq('id', meterReadingId);

      if (error) throw error;

      await supabase.from('water_consumption')
        .delete()
        .eq('apartment_id', String(readingToDelete.apartment_id))
        .eq('meter_type', readingToDelete.meter_type)
        .eq('period', readingToDelete.period);

      fetchData();
      showToast('✓ Skaitītāja rādījums dzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const syncWaterConsumption = async (readingsFromProps) => {
    try {
      showToast('⏳ Sinhronizē patēriņa datus...', 'info');
      const consumptionData = [];
      const activeReadings = readingsFromProps || meterReadings || [];
      const normTariffPeriod = normalizePeriod(tariffPeriod);

      for (const apt of (apartments || [])) {
        for (const type of ['water', 'hot_water']) {
          const currentReadingObj = activeReadings.find(mr =>
            String(mr.apartment_id) === String(apt.id) &&
            mr.meter_type === type &&
            normalizePeriod(mr.period) === normTariffPeriod
          );

          if (currentReadingObj) {
            const lastReading = getLastReading(apt.id, type, normTariffPeriod, activeReadings);
            const currentVal = parseFloat(currentReadingObj.reading_value);
            let consumption = 0;
            if (lastReading && lastReading.reading_value !== null && lastReading.reading_value !== undefined) {
              consumption = Math.max(0, currentVal - parseFloat(lastReading.reading_value));
            }

            consumptionData.push({
              apartment_id: String(apt.id),
              period: normTariffPeriod,
              meter_type: type,
              consumption_m3: consumption
            });
          }
        }
      }

      if (consumptionData.length === 0) {
        showToast('Nav rādījumu šim periodam, ko sinhronizēt', 'info');
        return;
      }

      const { error } = await supabase
        .from('water_consumption')
        .upsert(consumptionData, { onConflict: 'apartment_id,period,meter_type' });

      if (error) throw error;

      fetchData();
      showToast(`✓ Sinhronizēti ${consumptionData.length} ieraksti`);
    } catch (error) {
      showToast('Sinhronizācijas kļūda: ' + error.message, 'error');
    }
  };

  return {
    enabledMeters, setEnabledMeters,
    tariffPeriod, setTariffPeriod,
    waterTariffForm, setWaterTariffForm,
    hotWaterTariffForm, setHotWaterTariffForm,
    saveWaterTariff,
    saveHotWaterTariff,
    saveWaterMeterReading,
    saveHotWaterMeterReading,
    editMeterReading,
    deleteMeterReading,
    getLastReading,
    syncWaterConsumption
  };
}