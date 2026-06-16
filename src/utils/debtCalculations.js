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

  // Aprēķinām kopējo parādu kā visu iepriekšējo periodu pakalpojumu bilanci.
  // (Rēķina summa - Iepriekšējais parāds + Pārmaksa) dod tekošā mēneša jauno pakalpojumu daļu.
  const totalBalance = previousDebts.reduce((sum, inv) => {
    const serviceAmount = (parseFloat(inv.amount_with_vat ?? inv.amount) || 0) - (parseFloat(inv.previous_debt_amount) || 0) + (parseFloat(inv.overpayment_amount) || 0);
    const paid = parseFloat(inv.paid_amount) || 0;
    return sum + (serviceAmount - paid);
  }, 0);

  return totalBalance > 0 ? Math.round(totalBalance * 100) / 100 : 0;
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

  // Aprēķinām pārmaksu kā kopējo bilanci (ja tā ir negatīva)
  const totalBalance = previousInvoices.reduce((sum, inv) => {
    const serviceAmount = (parseFloat(inv.amount_with_vat ?? inv.amount) || 0) - (parseFloat(inv.previous_debt_amount) || 0) + (parseFloat(inv.overpayment_amount) || 0);
    const paid = parseFloat(inv.paid_amount) || 0;
    return sum + (serviceAmount - paid);
  }, 0);

  return totalBalance < 0 ? Math.round(Math.abs(totalBalance) * 100) / 100 : 0;
};