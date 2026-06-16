/**
 * Aprēķina iepriekšējo parādu balstoties uz neapmaksātiem rēķiniem
 * Ņem vērā: Reālais parāds = Rēķina summa - Jau samaksāts
 */
export const calculatePreviousDebt = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
  
  const previousDebts = invoices.filter(inv => {
    if (inv.apartment_id !== apartmentId) return false;
    if (excludeInvoiceId && inv.id === excludeInvoiceId) return false;

    const [invYear, invMonth] = inv.period.split('-').map(Number);
    return (invYear < currentYear) || (invYear === currentYear && invMonth < currentMonth);
  });

  if (previousDebts.length === 0) return 0;

  // Atrodam jaunāko neapmaksāto rēķinu pēc perioda un ID
  const latestInvoice = previousDebts.reduce((prev, current) => {
    if (prev.period > current.period) return prev;
    if (current.period > prev.period) return current;
    // Ja periodi ir identiski, izvēlamies to, kuram ir lielāks ID (pēdējais ģenerētais)
    return (prev.id > current.id) ? prev : current;
  });

  // ✅ Aprēķinām REĀLO parādu: summa (ar PVN) - samaksātais
  const invoiceAmount = parseFloat(latestInvoice.amount_with_vat) || parseFloat(latestInvoice.amount) || 0;
  const paidAmount = parseFloat(latestInvoice.paid_amount) || 0;
  const realDebt = Math.max(0, invoiceAmount - paidAmount);

  return Math.round(realDebt * 100) / 100;
};

/**
 * Aprēķina pārmaksu no iepriekšējā mēneša rēķina
 * Pārmaksa = Samaksāts - Rēķina summa (ja Samaksāts > Rēķina summa)
 */
export const calculateOverpayment = (apartmentId, invoices, currentPeriod) => {
  const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
  const previousMonth = currentMonth === 1 
    ? `${currentYear - 1}-12` 
    : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}`;
  
  const previousInvoice = invoices.find(inv => inv.apartment_id === apartmentId && inv.period === previousMonth);
  
  if (!previousInvoice) return 0;

  const invoiceAmount = parseFloat(previousInvoice.amount_with_vat) || parseFloat(previousInvoice.amount) || 0;
  const paidAmount = parseFloat(previousInvoice.paid_amount) || 0;
  
  // 1. Gadījums: Samaksāts vairāk nekā rēķina summa
  if (paidAmount > invoiceAmount) {
    return Math.round((paidAmount - invoiceAmount) * 100) / 100;
  }

  // 2. Gadījums: Pats rēķins bija negatīvs
  if (invoiceAmount < 0) {
    return Math.abs(invoiceAmount);
  }

  return 0;
};