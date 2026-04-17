import { useState, useEffect } from 'react';
import { getLastReading } from '../../utils/waterCalculations'; // Import getLastReading

const normalizePeriod = (p) => {
  if (!p || typeof p !== 'string') return p;
  const parts = p.split('-');
  if (parts.length !== 2) return p;
  return `${parts[0]}-${parts[1].padStart(2, '0')}`;
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

  // Ielādē tarifu datus formā, kad mainās periods vai ielādējas dati
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
      vat_rate: hot ? hot.vat_rate : 12, // Noklusējums siltajam ūdenim 12%
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
      const period = normalizePeriod(waterTariffForm.period);
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

      const { data: existing } = await supabase
        .from('water_tariffs')
        .select('*')
        .eq('period', period);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('water_tariffs')
          .update({
            price_per_m3: priceValue,
            vat_rate: vatValue,
            include_in_invoice: includeInvoice,
            diff_m3: diffM3,
            diff_price: diffPrice
          })
          .eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('water_tariffs')
          .insert([{
            period: period,
            price_per_m3: priceValue,
            vat_rate: vatValue,
            diff_m3: diffM3,
            diff_price: diffPrice,
            include_in_invoice: includeInvoice
          }]);
        if (error) throw error;
      }

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
      const period = normalizePeriod(hotWaterTariffForm.period);
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

      const { data: existing } = await supabase
        .from('hot_water_tariffs')
        .select('*')
        .eq('period', period);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('hot_water_tariffs')
          .update({
            price_per_m3: priceValue,
            vat_rate: vatValue,
            include_in_invoice: includeInvoice,
            diff_m3: diffM3,
            diff_price: diffPrice
          })
          .eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hot_water_tariffs')
          .insert([{
            period: period,
            price_per_m3: priceValue,
            vat_rate: vatValue,
            include_in_invoice: includeInvoice,
            diff_m3: diffM3,
            diff_price: diffPrice
          }]);
        if (error) throw error;
      }

      fetchData();
      showToast('✓ Siltais ūdens tarifs saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveWaterMeterReading = async (apartmentId, readingValue, period) => {
    try {
      // ✅ VALIDĒT apartment_id
      if (!apartmentId || apartmentId === '') {
        showToast('Dzīvoklis nav izvēlēts', 'error');
        return;
      }

      const normPeriod = normalizePeriod(period);
      const value = parseFloat(readingValue);
      
      if (readingValue === '' || readingValue === null) {
        const { data: existing } = await supabase
          .from('meter_readings')
          .select('*')
          .eq('apartment_id', apartmentId)
          .eq('meter_type', 'water')
          .eq('period', normPeriod);
        
        const fetchReadings = fetchMeterReadingsOnly || fetchData;

        if (existing && existing.length > 0) {
          await supabase.from('meter_readings').delete().eq('id', existing[0].id);
          // Dzēšam arī no water_consumption, ja rādījums tiek izdzēsts
          await supabase.from('water_consumption')
            .delete()
            .eq('apartment_id', String(apartmentId))
            .eq('meter_type', 'water')
            .eq('period', normPeriod);
          fetchReadings();
        }
        return;
      }

      if (isNaN(value) || value < 0) {
        showToast('Nepareiza vērtība', 'error');
        return;
      }

      if (value > 9999.99) {
        showToast('Patēriņš nevar būt lielāks par 9999.99', 'error');
        return;
      }

      const fetchReadings = fetchMeterReadingsOnly || fetchData;

      const { data: existing } = await supabase
        .from('meter_readings')
        .select('*')
        .eq('apartment_id', apartmentId)
        .eq('meter_type', 'water')
        .eq('period', normPeriod);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('meter_readings')
          .update({ reading_value: value })
          .eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('meter_readings')
          .insert([{
            apartment_id: apartmentId,
            meter_type: 'water',
            reading_date: today,
            reading_value: value,
            period: normPeriod
          }]);
        if (error) throw error;
      }

      // ✅ Sinhronizējam ar water_consumption tabulu
      const lastReading = getLastReading(apartmentId, 'water', normPeriod, meterReadings);
      const currentVal = parseFloat(value) || 0;
      const prevVal = lastReading ? parseFloat(lastReading.reading_value) : 0;
      const consumption = Math.max(0, currentVal - prevVal);
      
      await supabase.from('water_consumption').upsert({
        apartment_id: String(apartmentId),
        period: normPeriod,
        meter_type: 'water',
        consumption_m3: consumption
      }, { onConflict: 'apartment_id,period,meter_type' });

      fetchReadings();
      showToast('✓ Aukstā ūdens rādījums saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveHotWaterMeterReading = async (apartmentId, readingValue, period) => {
    try {
      // ✅ VALIDĒT apartment_id
      if (!apartmentId || apartmentId === '') {
        showToast('Dzīvoklis nav izvēlēts', 'error');
        return;
      }

      const value = parseFloat(readingValue);
      
      if (readingValue === '' || readingValue === null) {
        const { data: existing } = await supabase
          .from('meter_readings')
          .select('*')
          .eq('apartment_id', apartmentId)
          .eq('meter_type', 'hot_water')
          .eq('period', period);
        
        const fetchReadings = fetchMeterReadingsOnly || fetchData;

        if (existing && existing.length > 0) {
          await supabase.from('meter_readings').delete().eq('id', existing[0].id);
          // Dzēšam arī no water_consumption, ja rādījums tiek izdzēsts
          await supabase.from('water_consumption')
            .delete()
            .eq('apartment_id', String(apartmentId))
            .eq('meter_type', 'hot_water')
            .eq('period', period);
          fetchReadings();
        }
        return;
      }

      if (isNaN(value) || value < 0) {
        showToast('Nepareiza vērtība', 'error');
        return;
      }

      if (value > 9999.99) {
        showToast('Patēriņš nevar būt lielāks par 9999.99', 'error');
        return;
      }

      const fetchReadings = fetchMeterReadingsOnly || fetchData;

      const { data: existing } = await supabase
        .from('meter_readings')
        .select('*')
        .eq('apartment_id', apartmentId)
        .eq('meter_type', 'hot_water')
        .eq('period', period);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('meter_readings')
          .update({ reading_value: value })
          .eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('meter_readings')
          .insert([{
            apartment_id: apartmentId,
            meter_type: 'hot_water',
            reading_date: today,
            reading_value: value,
            period: period
          }]);
        if (error) throw error;
      }

      // ✅ Sinhronizējam ar water_consumption tabulu
      const lastReading = getLastReading(apartmentId, 'hot_water', period, meterReadings);
      const currentVal = parseFloat(value) || 0;
      const prevVal = lastReading ? parseFloat(lastReading.reading_value) : 0;
      const consumption = Math.max(0, currentVal - prevVal);
      
      await supabase.from('water_consumption').upsert({
        apartment_id: String(apartmentId),
        period: period,
        meter_type: 'hot_water',
        consumption_m3: consumption
      }, { onConflict: 'apartment_id,period,meter_type' });

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
      
      if (isNaN(value) || value < 0) {
        showToast('Nepareiza vērtība', 'error');
        return;
      }

      if (value > 9999.99) {
        showToast('Rādījums nevar būt lielāks par 9999.99', 'error');
        return;
      }

      const fetchReadings = fetchMeterReadingsOnly || fetchData;

      const { error } = await supabase
        .from('meter_readings')
        .update({ reading_value: value })
        .eq('id', meterReadingId);
      
      if (error) throw error;

      // ✅ Atjaunojam arī patēriņa tabulu pēc manuālas labošanas
      const lastReading = getLastReading(reading.apartment_id, reading.meter_type, reading.period, meterReadings);
      const prevVal = lastReading ? parseFloat(lastReading.reading_value) : 0;
      const consumption = Math.max(0, value - prevVal);

      await supabase.from('water_consumption').upsert({
        apartment_id: String(reading.apartment_id),
        period: reading.period,
        meter_type: reading.meter_type,
        consumption_m3: consumption
      }, { onConflict: 'apartment_id,period,meter_type' });

      fetchReadings();
      showToast('✓ Skaitītāja rādījums atjaunināts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteMeterReading = async (meterReadingId) => {
    try {
      // Atrodam rādījumu, lai iegūtu apartment_id, meter_type, period
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
      // Dzēšam arī atbilstošo ierakstu no water_consumption
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
      // Izmantojam datus, kas padoti no UI, vai hook iekšējos datus
      const activeReadings = readingsFromProps || meterReadings || [];

      for (const apt of (apartments || [])) {
        for (const type of ['water', 'hot_water']) {
          const currentReadingObj = activeReadings.find(mr => 
            String(mr.apartment_id) === String(apt.id) && 
            mr.meter_type === type && 
            mr.period === tariffPeriod
          );

          if (currentReadingObj) {
            const lastReading = getLastReading(apt.id, type, tariffPeriod, activeReadings);
            const currentVal = parseFloat(currentReadingObj.reading_value);
            const prevVal = lastReading ? parseFloat(lastReading.reading_value) : 0;
            const consumption = Math.max(0, currentVal - prevVal);

            consumptionData.push({
              apartment_id: String(apt.id),
              period: tariffPeriod,
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