/**
 * Aprēķina iepriekšējo parādu balstoties uz neapmaksātiem rēķiniem
 * Ņem vērā: Reālais parāds = Rēķina summa - Jau samaksāts
 */
export const calculatePreviousDebt = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
  
  const previousDebts = invoices.filter(inv => {
    if (inv.apartment_id !== apartmentId) return false;
    if (excludeInvoiceId && inv.id === excludeInvoiceId) return false;

    const [invYear, invMonth] = inv.period.split('-').map(Number);
    // Ņemam vērā tikai vēsturiskos periodus
    return (invYear < currentYear) || (invYear === currentYear && invMonth < currentMonth);
  });

  if (previousDebts.length === 0) return 0;

  // Atrodam jaunāko rēķinu pirms tekošā perioda
  const latestInvoice = previousDebts.reduce((prev, current) => {
    if (prev.period > current.period) return prev;
    if (current.period > prev.period) return current;
    return (prev.id > current.id) ? prev : current;
  });

  const balance = (parseFloat(latestInvoice.amount_with_vat ?? latestInvoice.amount) || 0) - (parseFloat(latestInvoice.paid_amount) || 0);
  return balance > 0 ? Math.round(balance * 100) / 100 : 0;
};

/**
 * Aprēķina pārmaksu no iepriekšējā mēneša rēķina
 * Pārmaksa = Samaksāts - Rēķina summa (ņemot vērā pēdējo rēķinu pirms šī perioda)
 */
export const calculateOverpayment = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
  
  const previousInvoices = invoices.filter(inv => {
    if (inv.apartment_id !== apartmentId) return false;
    if (excludeInvoiceId && inv.id === excludeInvoiceId) return false;

    const [invYear, invMonth] = inv.period.split('-').map(Number);
    return (invYear < currentYear) || (invYear === currentYear && invMonth < currentMonth);
  });

  if (previousInvoices.length === 0) return 0;

  // Atrodam jaunāko rēķinu pirms tekošā perioda
  const latestInvoice = previousInvoices.reduce((prev, current) => {
    if (prev.period > current.period) return prev;
    if (current.period > prev.period) return current;
    return (prev.id > current.id) ? prev : current;
  });

  const balance = (parseFloat(latestInvoice.amount_with_vat ?? latestInvoice.amount) || 0) - (parseFloat(latestInvoice.paid_amount) || 0);
  return balance < 0 ? Math.round(Math.abs(balance) * 100) / 100 : 0;
};