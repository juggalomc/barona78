import { useState } from 'react';

export function useWaterHandlers(supabase, apartments, fetchData, showToast) {
  const [enabledMeters, setEnabledMeters] = useState({ water: true });
  const [tariffPeriod, setTariffPeriod] = useState('2026-01');
  const [waterTariffForm, setWaterTariffForm] = useState({
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
      showToast('✓ Ūdens tarifs saglabāts');
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
      const value = parseFloat(readingValue);
      
      if (readingValue === '' || readingValue === null) {
        const existing = await supabase
          .from('meter_readings')
          .select('*')
          .eq('apartment_id', apartmentId)
          .eq('meter_type', 'water')
          .eq('period', period)
          .single();
        
        if (existing.data) {
          await supabase.from('meter_readings').delete().eq('id', existing.data.id);
          fetchData();
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

      const existing = await supabase
        .from('meter_readings')
        .select('*')
        .eq('apartment_id', apartmentId)
        .eq('meter_type', 'water')
        .eq('period', period)
        .single();

      if (existing.data) {
        const { error } = await supabase
          .from('meter_readings')
          .update({ reading_value: value })
          .eq('id', existing.data.id);
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

      fetchData();
      showToast('✓ Rādījums saglabāts');
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

  return {
    enabledMeters, setEnabledMeters,
    tariffPeriod, setTariffPeriod,
    waterTariffForm, setWaterTariffForm,
    wasteTariffForm, setWasteTariffForm,
    saveWaterTariff,
    saveWasteTariff,
    saveWaterMeterReading,
    calculateWasteDistribution
  };
}