/**
 * Aprēķina kopsavilkumu par konkrētu periodu, salīdzinot 
 * aprēķinātās summas (teorētiskās) pret faktiski izrakstītajām summām rēķinos.
 */
export const calculateMonthlySummary = (period, invoices, apartments, tariffs, wasteTariffs, waterTariffs = [], hotWaterTariffs = [], waterConsumption = []) => {
  const periodInvoices = invoices.filter(inv => inv.period === period);
  const periodTariffs = tariffs.filter(t => t.period === period);
  const periodWasteTariff = wasteTariffs.find(t => t.period === period);
  const periodWaterTariff = waterTariffs.find(t => t.period === period);
  const periodHotWaterTariff = hotWaterTariffs.find(t => t.period === period);

  const items = {};

  // 1. Iniciējam visus mēneša tarifus (Apsaimniekošana, Uzkrāšanas fonds utt.)
  periodTariffs.forEach(t => {
    items[t.name] = { 
      label: t.name, 
      calculated: parseFloat(t.total_amount) || 0, 
      invoiced: 0, 
      color: '#3b82f6' 
    };
  });

  // 2. Iniciējam Atkritumus
  const wasteLabel = "Atkritumu izvešana";
  items[wasteLabel] = { 
    label: wasteLabel, 
    calculated: periodWasteTariff ? (parseFloat(periodWasteTariff.total_amount) || 0) : 0, 
    invoiced: 0, 
    color: '#10b981' 
  };

  // 3. Iniciējam Ūdeni
  const waterLabel = "Aukstais ūdens";
  const hotWaterLabel = "Siltais ūdens";

  if (periodWaterTariff) {
    const totalConsumption = waterConsumption
      .filter(wc => wc.period === period && wc.meter_type === 'water')
      .reduce((sum, wc) => sum + (parseFloat(wc.consumption_m3) || 0), 0);
    const calc = (totalConsumption * (parseFloat(periodWaterTariff.price_per_m3) || 0)) + 
                 ((parseFloat(periodWaterTariff.diff_m3) || 0) * (parseFloat(periodWaterTariff.diff_price) || 0));
    items[waterLabel] = { label: waterLabel, calculated: calc, invoiced: 0, color: '#0ea5e9' };
  }

  if (periodHotWaterTariff) {
    const totalHotConsumption = waterConsumption
      .filter(wc => wc.period === period && wc.meter_type === 'hot_water')
      .reduce((sum, wc) => sum + (parseFloat(wc.consumption_m3) || 0), 0);
    const calc = (totalHotConsumption * (parseFloat(periodHotWaterTariff.price_per_m3) || 0)) + 
                 ((parseFloat(periodHotWaterTariff.diff_m3) || 0) * (parseFloat(periodHotWaterTariff.diff_price) || 0));
    items[hotWaterLabel] = { label: hotWaterLabel, calculated: calc, invoiced: 0, color: '#f59e0b' };
  }

  // 4. Saskaitām faktiski izrakstītos datus no rēķiniem
  periodInvoices.forEach(inv => {
    try {
      const details = JSON.parse(inv.invoice_details || '[]');
      details.forEach(item => {
        const amount = parseFloat(item.amount_without_vat || item.amount || 0);

        if (item.type === 'tariff' && items[item.tariff_name]) {
          items[item.tariff_name].invoiced += amount;
        } else if (item.type === 'waste') {
          if (items[wasteLabel]) items[wasteLabel].invoiced += amount;
        } else if (item.type === 'water' || item.type === 'water_diff') {
          if (items[waterLabel]) items[waterLabel].invoiced += amount;
        } else if (item.type === 'hot_water' || item.type === 'hot_water_diff') {
          if (items[hotWaterLabel]) items[hotWaterLabel].invoiced += amount;
        }
      });
    } catch (e) {
      console.error("Kļūda apstrādājot rēķina detaļas kopsavilkumam", e);
    }
  });

  const rows = Object.values(items).sort((a, b) => b.calculated - a.calculated);
  const total = {
    calculated: rows.reduce((sum, r) => sum + r.calculated, 0),
    invoiced: rows.reduce((sum, r) => sum + r.invoiced, 0)
  };

  return { rows, total };
};