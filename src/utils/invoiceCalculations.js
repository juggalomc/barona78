import { TOTAL_AREA } from '../components/shared/constants';
import { calculateWaterDetails } from './waterCalculations';

export const normalizePeriod = (p) => {
  if (!p || typeof p !== 'string') return p;
  const parts = p.split('-');
  if (parts.length !== 2) return p;
  return `${parts[0]}-${parts[1].padStart(2, '0')}`;
};

/**
 * Centralizēta funkcija rēķina rindu un summu aprēķināšanai
 */
export const calculateInvoiceAmounts = ({
  apt,
  period,
  periodTariffs,
  waterTariffs,
  hotWaterTariffs,
  wasteTariffs,
  meterReadings,
  waterConsumption,
  apartments,
  previousDebt = 0,
  overpayment = 0,
  nonReportingColdCount = null,
  nonReportingHotCount = null
}) => {
  let totalAmountWithoutVat = 0;
  let totalVatAmount = 0;
  let invoiceDetails = [];
  let missingTariffs = [];
  const normPeriod = normalizePeriod(period);

  // 1. Vispārīgie tarifi (pēc platības)
  for (const tariff of periodTariffs) {
    const isResidential = apt.is_residential !== false;
    if (tariff.target_type === 'residential' && !isResidential) continue;
    if (tariff.target_type === 'non_residential' && isResidential) continue;
    
    const pricePerSqm = parseFloat(tariff.total_amount) / TOTAL_AREA;
    const amountWithoutVat = Math.round(pricePerSqm * parseFloat(apt.area) * 100) / 100;
    const vatRate = parseFloat(tariff.vat_rate) || 0;
    const vatAmount = Math.round(amountWithoutVat * vatRate / 100 * 100) / 100;
    
    totalAmountWithoutVat += amountWithoutVat;
    totalVatAmount += vatAmount;
    invoiceDetails.push({ 
      tariff_id: tariff.id, 
      tariff_name: tariff.name, 
      amount_without_vat: amountWithoutVat, 
      vat_rate: vatRate, 
      vat_amount: vatAmount, 
      type: 'tariff' 
    });
  }

  // 2. Atkritumi (pēc personām)
  const wasteTariff = wasteTariffs.find(w => normalizePeriod(w.period) === normPeriod);
  if (wasteTariff && wasteTariff.include_in_invoice !== false) {
    const totalDeclaredPersons = apartments.reduce((sum, a) => sum + (parseInt(a.declared_persons) || 0), 0);
    if (totalDeclaredPersons > 0) {
      const declaredPersonsInApt = parseInt(apt.declared_persons) || 0;
      const wasteAmountWithoutVat = Math.round((parseFloat(wasteTariff.total_amount) / totalDeclaredPersons * declaredPersonsInApt) * 100) / 100;
      const wasteVatRate = parseFloat(wasteTariff.vat_rate) || 0;
      const wasteVatAmount = Math.round(wasteAmountWithoutVat * wasteVatRate / 100 * 100) / 100;
      
      totalAmountWithoutVat += wasteAmountWithoutVat;
      totalVatAmount += wasteVatAmount;
      invoiceDetails.push({ 
        tariff_id: wasteTariff.id, 
        tariff_name: `♻️ Atkritumu izvešana (${declaredPersonsInApt} pers.)`, 
        declared_persons: declaredPersonsInApt, 
        total_persons: totalDeclaredPersons, 
        amount_without_vat: wasteAmountWithoutVat, 
        vat_rate: wasteVatRate, 
        vat_amount: wasteVatAmount, 
        type: 'waste' 
      });
    }
  }

  // 3. Ūdens (izmantojot waterCalculations utilītu)
  const waterT = waterTariffs.find(w => normalizePeriod(w.period) === normPeriod);
  const hotWaterT = hotWaterTariffs.find(w => normalizePeriod(w.period) === normPeriod);

  if (!waterT) missingTariffs.push('Aukstā ūdens tarifs');
  if (!hotWaterT) missingTariffs.push('Siltā ūdens tarifs');

  const waterResult = calculateWaterDetails({
    apt, period, meterReadings, waterConsumption, apartments,
    waterTariff: waterT,
    hotWaterTariff: hotWaterT,
    nonReportingColdCount,
    nonReportingHotCount
  });

  invoiceDetails.push(...waterResult.details);
  totalAmountWithoutVat += waterResult.waterAmountWithoutVat;
  totalVatAmount += waterResult.waterVatAmount;

  // 4. Parādi un Pārmaksas
  if (previousDebt > 0) {
    totalAmountWithoutVat += previousDebt;
    invoiceDetails.push({ tariff_id: null, tariff_name: '⚠️ Parāds no iepriekšējiem mēnešiem', amount_without_vat: previousDebt, vat_rate: 0, vat_amount: 0, type: 'debt' });
  }

  if (overpayment > 0) {
    totalAmountWithoutVat -= overpayment;
    invoiceDetails.push({ tariff_id: null, tariff_name: '💰 Pārmaksa no iepriekšējā mēneša', amount_without_vat: -overpayment, vat_rate: 0, vat_amount: 0, type: 'overpayment' });
  }

  const totalAmountWithVat = Math.round((totalAmountWithoutVat + totalVatAmount) * 100) / 100;

  return {
    invoiceDetails,
    totalAmountWithoutVat,
    totalVatAmount,
    totalAmountWithVat,
    missingTariffs
  };
};