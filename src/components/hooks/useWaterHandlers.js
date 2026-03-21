import { useState } from 'react';

export function useWaterHandlers(supabase, apartments, fetchData, showToast, fetchMeterReadingsOnly) {
  const [enabledMeters, setEnabledMeters] = useState({ water: true, hot_water: false });
  const [tariffPeriod, setTariffPeriod] = useState('2026-01');
  const [waterTariffForm, setWaterTariffForm] = useState({
    period: '2026-01',
    price_per_m3: '',
    vat_rate: 0,
    include_in_invoice: true
  });
  const [hotWaterTariffForm, setHotWaterTariffForm] = useState({
    period: '2026-01',
    price_per_m3: '',
    vat_rate: 0,
    include_in_invoice: true
  });
  const [wasteTariffForm, setWasteTariffForm] = useState({
    period: '2026-01',
    total_amount: '',
    vat_rate: 21,
    include_in_invoice: true
  });

  const saveWaterTariff = async (e) => {
    e.preventDefault();
    try {
      const priceValue = parseFloat(waterTariffForm.price_per_m3 || 0);
      const vatValue = parseFloat(waterTariffForm.vat_rate || 0);
      const period = waterTariffForm.period;
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
            include_in_invoice: includeInvoice
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
      const period = hotWaterTariffForm.period;
      const includeInvoice = hotWaterTariffForm.include_in_invoice;

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
            include_in_invoice: includeInvoice
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
            include_in_invoice: includeInvoice
          }]);
        if (error) throw error;
      }

      fetchData();
      showToast('✓ Siltais ūdens tarifs saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveWasteTariff = async (e) => {
    e.preventDefault();
    try {
      const totalAmount = parseFloat(wasteTariffForm.total_amount || 0);
      const vatRate = parseFloat(wasteTariffForm.vat_rate || 0);
      const period = wasteTariffForm.period;
      const includeInvoice = wasteTariffForm.include_in_invoice;

      if (isNaN(totalAmount) || totalAmount <= 0) {
        showToast('Summa jābūt lielāka par 0', 'error');
        return;
      }

      if (isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
        showToast('PVN jābūt no 0 līdz 100%', 'error');
        return;
      }

      const { data: existing } = await supabase
        .from('waste_tariffs')
        .select('*')
        .eq('period', period);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('waste_tariffs')
          .update({
            total_amount: totalAmount,
            vat_rate: vatRate,
            include_in_invoice: includeInvoice
          })
          .eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('waste_tariffs')
          .insert([{
            period: period,
            total_amount: totalAmount,
            vat_rate: vatRate,
            include_in_invoice: includeInvoice
          }]);
        if (error) throw error;
      }

      fetchData();
      showToast('✓ Atkritumu tarifs saglabāts');
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

      const value = parseFloat(readingValue);
      
      if (readingValue === '' || readingValue === null) {
        const { data: existing } = await supabase
          .from('meter_readings')
          .select('*')
          .eq('apartment_id', apartmentId)
          .eq('meter_type', 'water')
          .eq('period', period);
        
        const fetchReadings = fetchMeterReadingsOnly || fetchData;

        if (existing && existing.length > 0) {
          await supabase.from('meter_readings').delete().eq('id', existing[0].id);
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
            meter_type: 'water',
            reading_date: today,
            reading_value: value,
            period: period
          }]);
        if (error) throw error;
      }

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

      fetchReadings();
      showToast('✓ Siltā ūdens rādījums saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const calculateWasteDistribution = (wasteTariffs, period) => {
    const wasteTariff = wasteTariffs.find(w => w.period === period);
    if (!wasteTariff) return { distribution: [], total: 0 };

    const totalDeclaredPersons = apartments.reduce((sum, a) => sum + (parseInt(a.declared_persons) || 1), 0);
    const totalAmountWithoutVat = parseFloat(wasteTariff.total_amount) || 0;
    const vatRate = parseFloat(wasteTariff.vat_rate) || 0;

    const distribution = apartments.map(apt => {
      const declaredPersons = parseInt(apt.declared_persons) || 1;
      const shareAmount = Math.round((totalAmountWithoutVat / totalDeclaredPersons * declaredPersons) * 100) / 100;
      const shareVat = Math.round(shareAmount * vatRate / 100 * 100) / 100;
      const shareTotal = shareAmount + shareVat;

      return {
        apartment: apt,
        declaredPersons,
        shareAmount,
        shareVat,
        shareTotal
      };
    });

    return { distribution, total: totalDeclaredPersons };
  };

  const editMeterReading = async (meterReadingId, newValue) => {
    try {
      const value = parseFloat(newValue);
      
      if (isNaN(value) || value < 0) {
        showToast('Nepareiza vērtība', 'error');
        return;
      }

      if (value > 9999.99) {
        showToast('Rādījums nevar būt lielāks par 9999.99', 'error');
        return;
      }

      const { error } = await supabase
        .from('meter_readings')
        .update({ reading_value: value })
        .eq('id', meterReadingId);
      
      if (error) throw error;

      fetchData();
      showToast('✓ Skaitītāja rādījums atjaunināts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteMeterReading = async (meterReadingId) => {
    try {
      const { error } = await supabase
        .from('meter_readings')
        .delete()
        .eq('id', meterReadingId);
      
      if (error) throw error;

      fetchData();
      showToast('✓ Skaitītāja rādījums dzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  return {
    enabledMeters, setEnabledMeters,
    tariffPeriod, setTariffPeriod,
    waterTariffForm, setWaterTariffForm,
    hotWaterTariffForm, setHotWaterTariffForm,
    wasteTariffForm, setWasteTariffForm,
    saveWaterTariff,
    saveHotWaterTariff,
    saveWasteTariff,
    saveWaterMeterReading,
    saveHotWaterMeterReading,
    editMeterReading,
    deleteMeterReading,
    calculateWasteDistribution
  };
}