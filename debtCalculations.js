/**
 * Aprēķina iepriekšējo parādu balstoties uz neapmaksātiem rēķiniem
 */
export const calculatePreviousDebt = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
  
  const previousDebts = invoices.filter(inv => {
    if (inv.apartment_id !== apartmentId) return false;
    if (inv.paid) return false;
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

  return parseFloat(latestInvoice.amount) || 0;
};

/**
 * Aprēķina pārmaksu no iepriekšējā mēneša rēķina (ja summa bija negatīva)
 */
export const calculateOverpayment = (apartmentId, invoices, currentPeriod) => {
  const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
  const previousMonth = currentMonth === 1 
    ? `${currentYear - 1}-12` 
    : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}`;
  
  const previousInvoice = invoices.find(inv => inv.apartment_id === apartmentId && inv.period === previousMonth);
  
  if (!previousInvoice) return 0;

  const finalAmount = parseFloat(previousInvoice.amount_with_vat) || 0;
  return finalAmount < 0 ? Math.abs(finalAmount) : 0;
};