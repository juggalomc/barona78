/**
 * Rēķinu aprēķinu utilītas
 * - Parāda aprēķins
 * - Pārmaksas aprēķins
 */

export function calculatePreviousDebt(invoices, apartments, apartmentId, currentPeriod) {
  const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
  const previousDebts = invoices.filter(inv => {
    if (inv.apartment_id !== apartmentId) return false;
    if (inv.paid) return false;
    const [invYear, invMonth] = inv.period.split('-').map(Number);
    if (invYear < currentYear) return true;
    if (invYear === currentYear && invMonth < currentMonth) return true;
    return false;
  });
  const total = previousDebts.reduce((sum, inv) => sum + inv.amount, 0);
  console.log(`💡 Parāds dzīv. ${apartments.find(a => a.id === apartmentId)?.number} par ${currentPeriod}: €${total}`);
  return total;
}

export async function calculateOverpayment(invoices, apartments, apartmentId, currentPeriod) {
  const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
  const previousMonth = currentMonth === 1 
    ? `${currentYear - 1}-12` 
    : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}`;
  
  try {
    const previousInvoice = invoices.find(inv => 
      inv.apartment_id === apartmentId && 
      inv.period === previousMonth
    );
    
    if (!previousInvoice) {
      console.log(`ℹ️ Nav iepriekšējā mēneša rēķina dzīv. ${apartments.find(a => a.id === apartmentId)?.number} par ${previousMonth}`);
      return 0;
    }

    const finalAmount = parseFloat(previousInvoice.amount_with_vat) || 0;
    if (finalAmount < 0) {
      const overpay = Math.abs(finalAmount);
      console.log(`💰 Pārmaksa dzīv. ${apartments.find(a => a.id === apartmentId)?.number} par ${previousMonth}: €${overpay}`);
      return overpay;
    }
    return 0;
  } catch (err) {
    console.error('Kļūda aprēķinot pārmaksu:', err);
    return 0;
  }
}

export function roundToCents(value) {
  return Math.round(value * 100) / 100;
}
