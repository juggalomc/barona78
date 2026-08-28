/**
 * Aprēķina kopsavilkumu par konkrētu periodu, salīdzinot 
 * aprēķinātās summas (teorētiskās) pret faktiski izrakstītajām summām rēķinos.
 */

const normalizePeriod = (p) => {
  if (!p || typeof p !== 'string') return p;
  const parts = p.split('-');
  if (parts.length < 2) return p;
  return `${parts[0]}-${parts[1].padStart(2, '0')}`;
};

export const calculateMonthlySummary = (period, invoices, apartments, tariffs, wasteTariffs, waterTariffs = [], hotWaterTariffs = [], waterConsumption = []) => {
  const normPeriod = normalizePeriod(period);
  const periodInvoices = invoices.filter(inv => normalizePeriod(inv.period) === normPeriod);
  const periodTariffs = tariffs.filter(t => normalizePeriod(t.period) === normPeriod);
  const periodWasteTariff = wasteTariffs.find(t => normalizePeriod(t.period) === normPeriod);
  const periodWaterTariff = waterTariffs.find(t => normalizePeriod(t.period) === normPeriod);
  const periodHotWaterTariff = hotWaterTariffs.find(t => normalizePeriod(t.period) === normPeriod);

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
      .filter(wc => normalizePeriod(wc.period) === normPeriod && wc.meter_type === 'water')
      .reduce((sum, wc) => sum + (parseFloat(wc.consumption_m3) || 0), 0);
    const price = parseFloat(periodWaterTariff.price_per_m3) || 0;
    const diffM3 = parseFloat(periodWaterTariff.diff_m3) || 0;
    const diffPrice = parseFloat(periodWaterTariff.diff_price) || 0;
    const vatRate = parseFloat(periodWaterTariff.vat_rate) || 21;

    const amountWithoutVat = Math.round(((totalConsumption * price) + (diffM3 * diffPrice)) * 100) / 100;
    const vatAmount = Math.round((amountWithoutVat * vatRate / 100) * 100) / 100;
    const amountWithVat = Math.round((amountWithoutVat + vatAmount) * 100) / 100;

    items[waterLabel] = { 
      label: waterLabel, 
      calculated: amountWithoutVat, 
      invoiced: 0, 
      color: '#0ea5e9',
      m3: totalConsumption,
      amountWithVat: amountWithVat
    };
  }

  if (periodHotWaterTariff) {
    const totalHotConsumption = waterConsumption
      .filter(wc => normalizePeriod(wc.period) === normPeriod && wc.meter_type === 'hot_water')
      .reduce((sum, wc) => sum + (parseFloat(wc.consumption_m3) || 0), 0);
    const price = parseFloat(periodHotWaterTariff.price_per_m3) || 0;
    const diffM3 = parseFloat(periodHotWaterTariff.diff_m3) || 0;
    const diffPrice = parseFloat(periodHotWaterTariff.diff_price) || 0;
    const vatRate = parseFloat(periodHotWaterTariff.vat_rate) || 12;

    const amountWithoutVat = Math.round(((totalHotConsumption * price) + (diffM3 * diffPrice)) * 100) / 100;
    const vatAmount = Math.round((amountWithoutVat * vatRate / 100) * 100) / 100;
    const amountWithVat = Math.round((amountWithoutVat + vatAmount) * 100) / 100;

    items[hotWaterLabel] = { 
      label: hotWaterLabel, 
      calculated: amountWithoutVat, 
      invoiced: 0, 
      color: '#f59e0b',
      m3: totalHotConsumption,
      amountWithVat: amountWithVat
    };
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

  const waterSummary = {
    cold: items[waterLabel] || null,
    hot: items[hotWaterLabel] || null
  };

  return { rows, total, waterSummary };
};

/**
 * Aprēķina maksājumu sadalījumu pa pozīcijām mēneša ietvaros (Apmaksāts vs Izrakstīts)
 */
export const calculatePositionPayments = (period, invoices) => {
  const normPeriod = normalizePeriod(period);

  // Sagrupējam rēķinus pa dzīvokļiem
  const invoicesByApt = {};
  invoices.forEach(inv => {
    if (!invoicesByApt[inv.apartment_id]) {
      invoicesByApt[inv.apartment_id] = [];
    }
    invoicesByApt[inv.apartment_id].push(inv);
  });

  const periodCharges = [];

  // Katram dzīvoklim veicam FIFO maksājumu sadali pa tā vēsturiskajām pozīcijām
  Object.entries(invoicesByApt).forEach(([aptId, aptInvoices]) => {
    const charges = [];
    aptInvoices.forEach(inv => {
      try {
        const details = JSON.parse(inv.invoice_details || '[]');
        details.forEach(item => {
          if (item.type === 'debt' || item.type === 'overpayment') return;

          let name = item.tariff_name || 'Cits';
          if (item.type === 'waste') {
            name = '♻️ Atkritumu izvešana';
          } else if (item.type?.includes('water')) {
            name = '💧 Ūdens pakalpojumi';
          }

          const amount = parseFloat(item.amount_without_vat || 0);
          const vat = parseFloat(item.vat_amount || 0);
          const total = amount + vat;

          charges.push({
            name,
            total,
            period: inv.period,
            invoiceId: inv.id,
            paid: 0
          });
        });
      } catch (e) {
        console.error("Kļūda rēķina apstrādē", e);
      }
    });

    // Kārtojam hronoloģiski (vecākie pakalpojumi vispirms)
    charges.sort((a, b) => a.period.localeCompare(b.period) || String(a.invoiceId).localeCompare(String(b.invoiceId)));

    // Aprēķinām kopējo dzīvokļa iemaksāto naudas fondu
    let paymentPool = aptInvoices.reduce((sum, inv) => {
      const payment = inv.paid ? (inv.amount || 0) : (inv.paid_amount || 0);
      return sum + Number(payment);
    }, 0);

    // Sadalām iemaksāto naudu (FIFO)
    for (const charge of charges) {
      if (paymentPool <= 0) break;
      const allocation = Math.min(charge.total, paymentPool);
      charge.paid = allocation;
      paymentPool -= allocation;
    }

    // Saglabājam tikai pieprasītā perioda pozīcijas kopējam sarakstam
    charges.forEach(charge => {
      if (normalizePeriod(charge.period) === normPeriod) {
        periodCharges.push(charge);
      }
    });
  });

  // Sagrupējam pa pozīciju nosaukumiem
  const items = {};
  periodCharges.forEach(charge => {
    if (!items[charge.name]) {
      items[charge.name] = { name: charge.name, invoiced: 0, paid: 0 };
    }
    items[charge.name].invoiced += charge.total;
    items[charge.name].paid += charge.paid;
  });

  return Object.values(items).sort((a, b) => b.invoiced - a.invoiced);
};

/**
 * Aprēķina dzīvokļa vēsturisko finanšu stāvokli pa pozīcijām
 */
export const calculateApartmentFinancials = (apartmentId, invoices) => {
  const aptInvoices = invoices.filter(inv => inv.apartment_id === apartmentId);

  // 1. Apkopojam visas vēsturiskās pakalpojumu pozīcijas
  const charges = [];
  aptInvoices.forEach(inv => {
    try {
      const details = JSON.parse(inv.invoice_details || '[]');
      details.forEach(item => {
        if (item.type === 'debt' || item.type === 'overpayment') return;

        let name = item.tariff_name || 'Cits';
        if (item.type === 'waste') {
          name = '♻️ Atkritumu izvešana';
        } else if (item.type?.includes('water')) {
          name = '💧 Ūdens pakalpojumi';
        }

        const amount = parseFloat(item.amount_without_vat || 0);
        const vat = parseFloat(item.vat_amount || 0);
        const total = amount + vat;

        charges.push({
          name,
          total,
          period: inv.period,
          invoiceId: inv.id,
          paid: 0
        });
      });
    } catch (e) {
      console.error("Kļūda rēķina apstrādē", e);
    }
  });

  // Kārtojam hronoloģiski (vecākie pakalpojumi vispirms)
  charges.sort((a, b) => a.period.localeCompare(b.period) || String(a.invoiceId).localeCompare(String(b.invoiceId)));

  // 2. Aprēķinām dzīvokļa kopējo iemaksāto naudu
  let paymentPool = aptInvoices.reduce((sum, inv) => {
    const payment = inv.paid ? (inv.amount || 0) : (inv.paid_amount || 0);
    return sum + Number(payment);
  }, 0);

  // 3. Sadalām iemaksāto naudu hronoloģiskā secībā (FIFO)
  for (const charge of charges) {
    if (paymentPool <= 0) break;
    const allocation = Math.min(charge.total, paymentPool);
    charge.paid = allocation;
    paymentPool -= allocation;
  }

  // 4. Sagrupējam pa pozīcijām gala rezultātam
  const items = {};
  charges.forEach(charge => {
    if (!items[charge.name]) {
      items[charge.name] = { name: charge.name, totalCharged: 0, totalPaid: 0 };
    }
    items[charge.name].totalCharged += charge.total;
    items[charge.name].totalPaid += charge.paid;
  });

  return Object.values(items).map(i => ({
    ...i,
    currentDebt: Math.max(0, i.totalCharged - i.totalPaid)
  })).sort((a, b) => b.totalCharged - a.totalCharged);
};