import { calculateInvoiceAmounts } from './invoiceCalculations';

describe('calculateInvoiceAmounts water consumption', () => {
  it('uses monthly consumption from meter readings when water_consumption entry is missing', () => {
    const apt = { id: 1, area: 50, is_residential: true, declared_persons: 1 };
    const periodTariffs = [];
    const waterTariffs = [{
      id: 10,
      period: '2024-03',
      price_per_m3: 1.5,
      vat_rate: 21,
      include_in_invoice: true
    }];
    const hotWaterTariffs = [];
    const wasteTariffs = [];
    const meterReadings = [
      { apartment_id: 1, meter_type: 'water', period: '2024-02', reading_value: 100 },
      { apartment_id: 1, meter_type: 'water', period: '2024-03', reading_value: 120 }
    ];

    const result = calculateInvoiceAmounts({
      apt,
      period: '2024-03',
      periodTariffs,
      waterTariffs,
      hotWaterTariffs,
      wasteTariffs,
      meterReadings,
      waterConsumption: [],
      apartments: [apt],
      previousDebt: 0,
      overpayment: 0
    });

    const waterLine = result.invoiceDetails.find(detail => detail.type === 'water');

    expect(waterLine).toBeDefined();
    expect(waterLine.consumption_m3).toBe(20);
    expect(waterLine.amount_without_vat).toBe(30);
  });
});
