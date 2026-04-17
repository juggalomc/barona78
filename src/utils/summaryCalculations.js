/**
 * Aprēķina kopsavilkumu par konkrētu periodu, salīdzinot 
 * aprēķinātās summas (teorētiskās) pret faktiski izrakstītajām summām rēķinos.
 */
export const calculateMonthlySummary = (period, invoices, apartments, tariffs, wasteTariffs) => {
  const periodInvoices = invoices.filter(inv => inv.period === period);
  const periodTariffs = tariffs.filter(t => t.period === period);
  const periodWasteTariff = wasteTariffs.find(t => t.period === period);

  const totalArea = apartments.reduce((sum, apt) => sum + (parseFloat(apt.area) || 0), 0);
  const totalPeople = apartments.reduce((sum, apt) => sum + (parseInt(apt.people_count) || 0), 0);

  const summary = {
    management: { calculated: 0, invoiced: 0 },
    waste: { calculated: 0, invoiced: 0 },
    total: { calculated: 0, invoiced: 0 }
  };

  // 1. Aprēķinātais (Teorētiskais - ko vajadzētu iekasēt pēc tarifiem)
  summary.management.calculated = periodTariffs
    .filter(t => t.name.toLowerCase().includes('apsaimnieko'))
    .reduce((sum, t) => sum + (t.rate * totalArea), 0);
  
  summary.waste.calculated = periodWasteTariff ? (periodWasteTariff.rate * totalPeople) : 0;

  // 2. Izrakstītais (Faktiskie dati no ģenerētajiem rēķiniem)
  periodInvoices.forEach(inv => {
    try {
      const details = JSON.parse(inv.invoice_details || '[]');
      details.forEach(item => {
        const name = item.name.toLowerCase();
        const amount = parseFloat(item.amount_without_vat || item.amount || 0);
        if (name.includes('apsaimnieko')) summary.management.invoiced += amount;
        if (name.includes('atkritum')) summary.waste.invoiced += amount;
      });
    } catch (e) {
      console.error("Kļūda apstrādājot rēķina detaļas kopsavilkumam", e);
    }
  });

  return summary;
};