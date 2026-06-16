/**
 * Palīgfunkcija, kas perioda virkni (YYYY-MM) pārveido par skaitlisku vērtību,
 * lai varētu viegli salīdzināt periodus.
 */
const getPeriodValue = (period) => {
  if (!period) return 0;
  const [y, m] = period.split('-').map(Number);
  return y * 12 + (m || 0);
};

/**
 * Palīgfunkcija, kas aprēķina vēsturisko bilanci līdz pašreizējam periodam.
 * Atrod pašu pēdējo izdoto rēķinu un pārbauda, vai tas ir apmaksāts vai pārmaksāts.
 */
const getHistoricalBalance = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const currentVal = getPeriodValue(currentPeriod);
  
  // 1. Atlasām visus iepriekšējos rēķinus pirms tekošā perioda
  const previousInvoices = (invoices || []).filter(inv => {
    if (String(inv.apartment_id) !== String(apartmentId)) return false;
    if (excludeInvoiceId && inv.id === excludeInvoiceId) return false;
    return getPeriodValue(inv.period) < currentVal;
  });

  if (previousInvoices.length === 0) return 0;

  // 2. Sakārtojam hronoloģiski: no vecākā uz jaunāko.
  previousInvoices.sort((a, b) => {
    const pA = getPeriodValue(a.period);
    const pB = getPeriodValue(b.period);
    if (pA !== pB) return pA - pB;
    return Number(a.id) - Number(b.id);
  });

  // 3. Izskrienam cauri visiem rēķiniem un uzkrājam kopējo bilanci
  let runningBalance = 0;

  for (const inv of previousInvoices) {
    // ✅ JAUNS: Ja rēķins ir pilnībā apmaksāts, izlaižam to no parāda aprēķina
    if (inv.paid === true) {
      continue;
    }

    // totalInvoiceAmountDue represents the full amount of this specific invoice, including any debt/overpayment carried into it.
    const totalInvoiceAmountDue = Number(inv.amount_with_vat ?? inv.amount ?? 0);
    // prevDebtCarriedIn and overpayCarriedIn are the amounts carried into this specific invoice from even earlier periods.
    const prevDebtCarriedIn = Number(inv.previous_debt_amount ?? 0);
    const overpayCarriedIn = Number(inv.overpayment_amount ?? 0);
    const paidForThisInvoice = Number(inv.paid_amount ?? 0);
    
    // Aprēķinām tikai šī mēneša rēķinā iekļauto "jauno" pakalpojumu summu ar PVN.
    // This is the portion of the invoice that is purely for services rendered in that month,
    // excluding any debt or overpayment that was brought into this invoice from prior periods.
    const monthlyServiceCharge = totalInvoiceAmountDue - prevDebtCarriedIn + overpayCarriedIn;
    
    // Pieskaitām mēneša pakalpojumus un atņemam to, ko klients faktiski samaksājis
    // The running balance accumulates the net effect of each month's new charges minus payments.
    runningBalance += (monthlyServiceCharge - paidForThisInvoice);
  }

  return runningBalance;
};

/**
 * Aprēķina kopējo iepriekšējo parādu (ņemot vērā visu vēsturi un pārmaksas)
 */
export const calculatePreviousDebt = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const netBalance = getHistoricalBalance(apartmentId, invoices, currentPeriod, excludeInvoiceId);
  return netBalance > 0 ? Math.round(netBalance * 100) / 100 : 0;
};

/**
 * Aprēķina kopējo pārmaksu no iepriekšējiem mēnešiem
 */
export const calculateOverpayment = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const netBalance = getHistoricalBalance(apartmentId, invoices, currentPeriod, excludeInvoiceId);
  // Ja gala bilance ir negatīva, tā ir pārmaksa (tāpēc izmantojam Math.abs)
  return netBalance < 0 ? Math.round(Math.abs(netBalance) * 100) / 100 : 0;
};