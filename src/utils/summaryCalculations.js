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
      .filter(wc => wc.period === period && wc.meter_type === 'hot_water')
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
  const periodInvoices = invoices.filter(inv => inv.period === period);
  const items = {};

  periodInvoices.forEach(inv => {
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

        if (!items[name]) {
          items[name] = { name, invoiced: 0, paid: 0 };
        }

        items[name].invoiced += total;
        if (inv.paid) {
          items[name].paid += total;
        }
      });
    } catch (e) {
      console.error("Kļūda apstrādājot rēķinu kopsavilkumam", e);
    }
  });

  return Object.values(items).sort((a, b) => b.invoiced - a.invoiced);
};

/**
 * Aprēķina dzīvokļa vēsturisko finanšu stāvokli pa pozīcijām
 */
export const calculateApartmentFinancials = (apartmentId, invoices) => {
  const aptInvoices = invoices.filter(inv => inv.apartment_id === apartmentId);
  const items = {};

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

        if (!items[name]) {
          items[name] = { name, totalCharged: 0, totalPaid: 0 };
        }

        items[name].totalCharged += total;
        if (inv.paid) items[name].totalPaid += total;
      });
    } catch (e) {
      console.error("Kļūda rēķina apstrādē", e);
    }
  });

  return Object.values(items).map(i => ({
    ...i,
    currentDebt: Math.max(0, i.totalCharged - i.totalPaid)
  })).sort((a, b) => b.totalCharged - a.totalCharged);
};