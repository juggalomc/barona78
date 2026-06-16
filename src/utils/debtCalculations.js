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
    return (invYear < currentYear) || (invYear === currentYear && invMonth < currentMonth);
  });
  if (previousDebts.length === 0) return 0;

  // Atrodam pašu pēdējo izrakstīto rēķinu
  const latestInvoice = previousDebts.reduce((prev, current) => {
    return (prev.period > current.period) ? prev : (current.period > prev.period) ? current : (prev.id > current.id) ? prev : current;
  });

  // ✅ Aprēķinām REĀLO parādu: summa (ar PVN) - samaksātais
  const invoiceAmount = parseFloat(latestInvoice.amount_with_vat ?? latestInvoice.amount) || 0;
  const paidAmount = parseFloat(latestInvoice.paid_amount) || 0;
  const balance = invoiceAmount - paidAmount;

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

  const latestInvoice = previousInvoices.reduce((prev, current) => {
    return (prev.period > current.period) ? prev : (current.period > prev.period) ? current : (prev.id > current.id) ? prev : current;
  });

  const invoiceAmount = parseFloat(latestInvoice.amount_with_vat ?? latestInvoice.amount) || 0;
  const paidAmount = parseFloat(latestInvoice.paid_amount) || 0;
  const balance = invoiceAmount - paidAmount;

  return balance < 0 ? Math.round(Math.abs(balance) * 100) / 100 : 0;
};