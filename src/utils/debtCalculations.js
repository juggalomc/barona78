const getPeriodValue = (period) => {
  if (!period) return 0;
  const [y, m] = period.split('-').map(Number);
  return y * 12 + (m || 0);
};

/**
 * Aprēķina iepriekšējo parādu balstoties uz neapmaksātiem rēķiniem
 * Ņem vērā: Reālais parāds = Rēķina summa - Jau samaksāts
 */
export const calculatePreviousDebt = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const currentVal = getPeriodValue(currentPeriod);
  
  const previousInvoices = invoices.filter(inv => {
    if (inv.apartment_id !== apartmentId) return false;
    if (excludeInvoiceId && inv.id === excludeInvoiceId) return false;
    return getPeriodValue(inv.period) < currentVal;
  });

  if (previousInvoices.length === 0) return 0;

  // Atrodam jaunāko rēķinu pirms tekošā perioda
  const latest = previousInvoices.reduce((prev, curr) => {
    const pVal = getPeriodValue(prev.period);
    const cVal = getPeriodValue(curr.period);
    if (cVal > pVal) return curr;
    if (cVal < pVal) return prev;
    return curr.id > prev.id ? curr : prev;
  });

  const total = parseFloat(latest.amount_with_vat ?? latest.amount) || 0;
  const paid = parseFloat(latest.paid_amount) || 0;
  const balance = total - paid;

  return balance > 0 ? Math.round(balance * 100) / 100 : 0;
};

/**
 * Aprēķina pārmaksu no iepriekšējā mēneša rēķina
 * Pārmaksa = Samaksāts - Rēķina summa (ņemot vērā pēdējo rēķinu pirms šī perioda)
 */
export const calculateOverpayment = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const currentVal = getPeriodValue(currentPeriod);
  
  const previousInvoices = invoices.filter(inv => {
    if (inv.apartment_id !== apartmentId) return false;
    if (excludeInvoiceId && inv.id === excludeInvoiceId) return false;
    return getPeriodValue(inv.period) < currentVal;
  });

  if (previousInvoices.length === 0) return 0;

  // Atrodam jaunāko rēķinu pirms tekošā perioda
  const latest = previousInvoices.reduce((prev, curr) => {
    const pVal = getPeriodValue(prev.period);
    const cVal = getPeriodValue(curr.period);
    if (cVal > pVal) return curr;
    if (cVal < pVal) return prev;
    return curr.id > prev.id ? curr : prev;
  });

  const total = parseFloat(latest.amount_with_vat ?? latest.amount) || 0;
  const paid = parseFloat(latest.paid_amount) || 0;
  const balance = total - paid;

  // Ja bilance ir negatīva, tā ir pārmaksa
  return balance < 0 ? Math.round(Math.abs(balance) * 100) / 100 : 0;
};