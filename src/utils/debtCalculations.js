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
    
    // Nosacījums 1: Periods ir pirms pašreizējā rēķina perioda
    const isEarlierPeriod = (invYear < currentYear) || (invYear === currentYear && invMonth < currentMonth);
    
    // Nosacījums 2: Termiņš ir beidzies uz ģenerēšanas brīdi
    const isPastDue = todayStr > inv.due_date;

    return isEarlierPeriod || isPastDue;
  });

  if (previousDebts.length === 0) return 0;

  // Atrodam jaunāko neapmaksāto rēķinu pēc perioda un ID
  const latestInvoice = previousDebts.reduce((prev, current) => {
    if (prev.period > current.period) return prev;
    if (current.period > prev.period) return current;
    // Ja periodi ir identiski, izvēlamies to, kuram ir lielāks ID (pēdējais ģenerētais)
    return (prev.id > current.id) ? prev : current;
  });

  // ✅ Aprēķinām REĀLO parādu: rēķina summa (ar PVN) - samaksāts
  const invoiceAmount = parseFloat(latestInvoice.amount_with_vat || latestInvoice.amount || 0);
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

  // ✅ Aprēķinām reālo pārmaksu: samaksāts - rēķina summa (ja > 0)
  const invoiceAmount = parseFloat(previousInvoice.amount_with_vat || previousInvoice.amount) || 0;
  const paidAmount = parseFloat(previousInvoice.paid_amount) || 0;
  
  // Pārmaksa ir tikai tad, kad samaksāts ir vairāk kā rēķinā
  if (paidAmount > invoiceAmount) {
    return Math.round((paidAmount - invoiceAmount) * 100) / 100;
  }

  return 0;
};