import { calculateApartmentFinancials, calculatePositionPayments } from './summaryCalculations';

describe('summaryCalculations partial payments', () => {
  const invoices = [
    {
      id: 'inv-1',
      apartment_id: 'apt-1',
      period: '2026-08',
      amount: 100,
      paid_amount: 40,
      paid: false,
      invoice_details: JSON.stringify([
        { type: 'tariff', tariff_name: 'Apsaimniekošana', amount_without_vat: 40, vat_amount: 10 }, // total 50
        { type: 'waste', amount_without_vat: 40, vat_amount: 10 } // total 50
      ])
    },
    {
      id: 'inv-2',
      apartment_id: 'apt-1',
      period: '2026-07',
      amount: 80,
      paid_amount: 80,
      paid: true,
      invoice_details: JSON.stringify([
        { type: 'tariff', tariff_name: 'Apsaimniekošana', amount_without_vat: 80, vat_amount: 0 } // total 80
      ])
    }
  ];

  describe('calculateApartmentFinancials', () => {
    it('applies paid_amount proportionally to positions when invoice is partially paid', () => {
      const result = calculateApartmentFinancials('apt-1', invoices);
      
      // Apsaimniekošana totalCharged = 50 (from inv-1) + 80 (from inv-2) = 130
      // Apsaimniekošana totalPaid:
      // - inv-1 (40% paid): 50 * 0.4 = 20
      // - inv-2 (100% paid): 80 * 1.0 = 80
      // totalPaid = 100
      // currentDebt = 130 - 100 = 30
      const aps = result.find(r => r.name === 'Apsaimniekošana');
      expect(aps.totalCharged).toBe(130);
      expect(aps.totalPaid).toBe(100);
      expect(aps.currentDebt).toBe(30);

      // Waste totalCharged = 50 (from inv-1)
      // Waste totalPaid = 50 * 0.4 = 20
      // currentDebt = 50 - 20 = 30
      const waste = result.find(r => r.name === '♻️ Atkritumu izvešana');
      expect(waste.totalCharged).toBe(50);
      expect(waste.totalPaid).toBe(20);
      expect(waste.currentDebt).toBe(30);
    });
  });

  describe('calculatePositionPayments', () => {
    it('calculates position payments taking partial paid_amount into account', () => {
      const result = calculatePositionPayments('2026-08', invoices);
      
      // For period 2026-08, only inv-1 matches.
      // invoiced: 50 each. paid: 20 each.
      const aps = result.find(r => r.name === 'Apsaimniekošana');
      expect(aps.invoiced).toBe(50);
      expect(aps.paid).toBe(20);

      const waste = result.find(r => r.name === '♻️ Atkritumu izvešana');
      expect(waste.invoiced).toBe(50);
      expect(waste.paid).toBe(20);
    });
  });
});
