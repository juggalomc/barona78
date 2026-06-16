const getPeriodValue = (period) => {
  if (!period) return 0;
  const [y, m] = period.split('-').map(Number);
  return y * 12 + (m || 0);
};

/**
 * Palīgfunkcija, kas aprēķina vēsturisko bilanci līdz pašreizējam periodam.
 * Sakārto rēķinus hronoloģiski un summē starpības starp pakalpojumiem un samaksu.
 */
const getHistoricalBalance = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const currentVal = getPeriodValue(currentPeriod);
  
  // 1. Atlasām visus iepriekšējos rēķinus
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
    const total = Number(inv.amount_with_vat ?? inv.amount ?? 0);
    const prevDebt = Number(inv.previous_debt_amount ?? 0);
    const overpay = Number(inv.overpayment_amount ?? 0);
    const paid = Number(inv.paid_amount ?? 0);
    
    // Aprēķinām tikai šī mēneša rēķinā iekļauto "jauno" pakalpojumu summu ar PVN.
    // ServicesTotal = (Kopējā summa) - (Pārnestais parāds) + (Pārnestā pārmaksa)
    const monthlyServiceCharge = total - prevDebt + overpay;
    
    // Pieskaitām mēneša pakalpojumus un atņemam to, ko klients faktiski samaksājis
    runningBalance += (monthlyServiceCharge - paid);
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