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

  const totalArea = apartments.reduce((sum, apt) => sum + (parseFloat(apt.area) || 0), 0);
  const totalPeople = apartments.reduce((sum, apt) => sum + (parseInt(apt.people_count) || 0), 0);

  const summary = {
    management: { calculated: 0, invoiced: 0 },
    waste: { calculated: 0, invoiced: 0 },
    water: { calculated: 0, invoiced: 0 },
    hotWater: { calculated: 0, invoiced: 0 },
    total: { calculated: 0, invoiced: 0 }
  };

  // 1. Aprēķinātais (Teorētiskais - ko vajadzētu iekasēt pēc tarifiem)
  summary.management.calculated = periodTariffs
    .filter(t => t.name.toLowerCase().includes('apsaimnieko'))
    .reduce((sum, t) => sum + (t.rate * totalArea), 0);
  
  summary.waste.calculated = periodWasteTariff ? (periodWasteTariff.rate * totalPeople) : 0;

  // 1.1 Ūdens aprēķinātais (Patēriņš * tarifs + starpība)
  if (periodWaterTariff) {
    const totalConsumption = waterConsumption
      .filter(wc => wc.period === period && wc.meter_type === 'water')
      .reduce((sum, wc) => sum + (parseFloat(wc.consumption_m3) || 0), 0);
    
    summary.water.calculated = (totalConsumption * (parseFloat(periodWaterTariff.price_per_m3) || 0)) + 
                               ((parseFloat(periodWaterTariff.diff_m3) || 0) * (parseFloat(periodWaterTariff.diff_price) || 0));
  }

  if (periodHotWaterTariff) {
    const totalHotConsumption = waterConsumption
      .filter(wc => wc.period === period && wc.meter_type === 'hot_water')
      .reduce((sum, wc) => sum + (parseFloat(wc.consumption_m3) || 0), 0);

    summary.hotWater.calculated = (totalHotConsumption * (parseFloat(periodHotWaterTariff.price_per_m3) || 0)) + 
                                  ((parseFloat(periodHotWaterTariff.diff_m3) || 0) * (parseFloat(periodHotWaterTariff.diff_price) || 0));
  }

  // 2. Izrakstītais (Faktiskie dati no ģenerētajiem rēķiniem)
  periodInvoices.forEach(inv => {
    try {
      const details = JSON.parse(inv.invoice_details || '[]');
      details.forEach(item => {
        const name = item.name.toLowerCase();
        const amount = parseFloat(item.amount_without_vat || item.amount || 0);
        if (name.includes('apsaimnieko')) summary.management.invoiced += amount;
        if (name.includes('atkritum')) summary.waste.invoiced += amount;
        if (item.type === 'water' || item.type === 'water_diff') summary.water.invoiced += amount;
        if (item.type === 'hot_water' || item.type === 'hot_water_diff') summary.hotWater.invoiced += amount;
      });
    } catch (e) {
      console.error("Kļūda apstrādājot rēķina detaļas kopsavilkumam", e);
    }
  });

  summary.total.calculated = summary.management.calculated + summary.waste.calculated + summary.water.calculated + summary.hotWater.calculated;
  summary.total.invoiced = summary.management.invoiced + summary.waste.invoiced + summary.water.invoiced + summary.hotWater.invoiced;

  return summary;
};