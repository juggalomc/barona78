import { useState } from 'react';

export function useWasteHandlers(supabase, apartments, fetchData, showToast) {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const [tariffPeriod, setTariffPeriod] = useState(currentMonth);
  const [wasteTariffForm, setWasteTariffForm] = useState({
    period: currentMonth,
    total_amount: '',
    vat_rate: 21,
    include_in_invoice: true
  });

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

  const calculateWasteDistribution = (wasteTariffs, period) => {
    const wasteTariff = wasteTariffs.find(w => w.period === period);
    if (!wasteTariff) return { distribution: [], total: 0, tariff: null };

    const totalDeclaredPersons = apartments.reduce((sum, a) => sum + (parseInt(a.declared_persons) || 1), 0);
    const totalAmountWithoutVat = parseFloat(wasteTariff.total_amount) || 0;
    const vatRate = parseFloat(wasteTariff.vat_rate) || 0;

    const distribution = apartments.map(apt => {
      const declaredPersons = parseInt(apt.declared_persons) || 1;
      // Izvairāmies no dalīšanas ar nulli
      const shareAmount = totalDeclaredPersons > 0 
        ? Math.round((totalAmountWithoutVat / totalDeclaredPersons * declaredPersons) * 100) / 100
        : 0;
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

    return { distribution, total: totalDeclaredPersons, tariff: wasteTariff };
  };

  return {
    tariffPeriod, setTariffPeriod,
    wasteTariffForm, setWasteTariffForm,
    saveWasteTariff,
    calculateWasteDistribution
  };
}
