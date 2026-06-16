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
 * Atrod pašu pēdējo izdoto rēķinu pirms tekošā perioda un pārbauda tā apmaksas stāvokli.
 */
const getHistoricalBalance = (apartmentId, invoices, currentPeriod, excludeInvoiceId = null) => {
  const currentVal = getPeriodValue(currentPeriod);
  
  // 1. Atlasām visus rēķinus pirms tekošā perioda
  const previousInvoices = (invoices || []).filter(inv => {
    if (String(inv.apartment_id) !== String(apartmentId)) return false;
    
    // Svarīgi: izslēdzam pašreizējo rēķinu (reģenerēšanas laikā), lai tā summa
    // neietekmētu "iepriekšējā parāda" aprēķinu.
    if (excludeInvoiceId && String(inv.id) === String(excludeInvoiceId)) return false;
    
    // ✅ JAUNS: Izslēdzam pilnībā apmaksātus rēķinus no parāda aprēķina
    if (inv.paid === true) return false;
    
    return getPeriodValue(inv.period) < currentVal;
  });

  if (previousInvoices.length === 0) return 0;

  // 2. Sakārtojam vēsturi hronoloģiski: no vecākā uz jaunāko.
  previousInvoices.sort((a, b) => {
    const pA = getPeriodValue(a.period);
    const pB = getPeriodValue(b.period);
    if (pA !== pB) return pA - pB;
    return Number(a.id) - Number(b.id);
  });

  // 3. Ņemam pašu pēdējo rēķinu pirms tekošā mēneša.
  // Tā kā katrā jaunā rēķinā jau hronoloģiski ir iestrādāts iepriekšējais parāds/pārmaksa,
  // pašreizējā bilance ir vienkārši pēdējā rēķina izpildes stāvoklis.
  const latestInvoice = previousInvoices[previousInvoices.length - 1];
  
  const totalDue = Number(latestInvoice.amount_with_vat ?? latestInvoice.amount ?? 0);
  const totalPaid = Number(latestInvoice.paid_amount ?? 0);

  // Atgriežam starpību. 
  // Ja rezultāts > 0, tas ir parāds (klients palika parādā par pēdējo mēnesi).
  // Ja rezultāts < 0, tā ir pārmaksa (klients samaksāja vairāk nekā prasīts).
  return totalDue - totalPaid;
};

/**
 * Aprēķina kopējo iepriekšējo parādu (ņemot vērā pēdējā rēķina neapmaksāto daļu)
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